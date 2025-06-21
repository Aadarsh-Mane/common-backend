import mongoose from "mongoose";

const depositReceiptSchema = new mongoose.Schema({
  receiptId: {
    type: String,
    unique: true,
    required: true,
  },
  patientId: {
    type: String,
    required: true,
    ref: "Patient",
  },
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  patientDetails: {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    contact: { type: String, required: true },
    address: { type: String },
    patientType: { type: String, default: "Internal" },
  },
  admissionDetails: {
    admissionDate: { type: Date, required: true },
    reasonForAdmission: { type: String },
    doctorName: { type: String, required: true },
    sectionName: { type: String },
    bedNumber: { type: Number },
  },
  patientNumbers: {
    opdNumber: { type: Number },
    ipdNumber: { type: Number },
  },
  depositDetails: {
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Bank Transfer", "Cheque"],
      required: true,
    },
    transactionId: { type: String }, // For digital payments
    chequeNumber: { type: String }, // For cheque payments
    bankName: { type: String }, // For cheque/bank transfer
    remarks: { type: String },
    // New fields for multiple deposits tracking
    sequenceNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    cumulativeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Reference to previous deposit if applicable
    previousDepositId: {
      type: String,
      ref: "DepositReceipt",
      default: null,
    },
  },
  receiptDetails: {
    generatedBy: {
      userName: { type: String, required: true },
      userType: { type: String, required: true }, // Reception, Admin, etc.
    },
    generatedAt: { type: Date, default: Date.now },
    receiptUrl: { type: String }, // URL to the generated PDF
    isActive: { type: Boolean, default: true },
    // Additional tracking for multiple deposits
    isFirstDeposit: { type: Boolean, default: true },
    depositType: {
      type: String,
      enum: ["Initial", "Additional", "Top-up", "Emergency"],
      default: "Initial",
    },
  },
  hospitalDetails: {
    hospitalName: { type: String, required: true },
    hospitalAddress: { type: String, required: true },
    hospitalContact: { type: String, required: true },
    hospitalEmail: { type: String },
    registrationNumber: { type: String },
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
  },
});

// Compound indexes for better query performance
depositReceiptSchema.index({ patientId: 1, admissionId: 1 });
depositReceiptSchema.index({ receiptId: 1 });
depositReceiptSchema.index({ "receiptDetails.generatedAt": -1 });
depositReceiptSchema.index({ "depositDetails.depositAmount": 1 });
// New indexes for multiple deposits
depositReceiptSchema.index({
  patientId: 1,
  admissionId: 1,
  "depositDetails.sequenceNumber": 1,
});
depositReceiptSchema.index({ patientId: 1, "receiptDetails.isActive": 1 });
depositReceiptSchema.index({ admissionId: 1, "receiptDetails.isActive": 1 });

// Pre-save middleware to update the updatedAt field and set deposit type
depositReceiptSchema.pre("save", async function (next) {
  this.metadata.updatedAt = new Date();

  // Set deposit type based on sequence number
  if (this.isNew) {
    if (this.depositDetails.sequenceNumber === 1) {
      this.receiptDetails.isFirstDeposit = true;
      this.receiptDetails.depositType = "Initial";
    } else {
      this.receiptDetails.isFirstDeposit = false;
      this.receiptDetails.depositType = "Additional";
    }
  }

  next();
});

// Enhanced method to generate receipt ID with sequence support
depositReceiptSchema.statics.generateReceiptId = function (sequenceNumber = 1) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  const sequence = sequenceNumber.toString().padStart(2, "0");
  return `DEP-${timestamp}-${sequence}-${randomPart}`.toUpperCase();
};

// Method to format deposit amount
depositReceiptSchema.methods.getFormattedAmount = function () {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(this.depositDetails.depositAmount);
};

// Method to format cumulative amount
depositReceiptSchema.methods.getFormattedCumulativeAmount = function () {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(this.depositDetails.cumulativeAmount);
};

// Virtual to get receipt age
depositReceiptSchema.virtual("receiptAge").get(function () {
  const now = new Date();
  const created = this.receiptDetails.generatedAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to get all deposits for an admission
depositReceiptSchema.statics.getAdmissionDeposits = function (
  admissionId,
  includeInactive = false
) {
  const query = { admissionId };
  if (!includeInactive) {
    query["receiptDetails.isActive"] = true;
  }
  return this.find(query).sort({ "depositDetails.sequenceNumber": 1 });
};

// Static method to get total deposits for an admission
depositReceiptSchema.statics.getTotalDepositsForAdmission = async function (
  admissionId
) {
  const result = await this.aggregate([
    {
      $match: {
        admissionId: new mongoose.Types.ObjectId(admissionId),
        "receiptDetails.isActive": true,
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$depositDetails.depositAmount" },
        count: { $sum: 1 },
        lastDeposit: { $max: "$receiptDetails.generatedAt" },
      },
    },
  ]);

  return result[0] || { totalAmount: 0, count: 0, lastDeposit: null };
};

// Static method to get patient's deposit history across all admissions
depositReceiptSchema.statics.getPatientDepositHistory = function (
  patientId,
  includeInactive = false
) {
  const query = { patientId };
  if (!includeInactive) {
    query["receiptDetails.isActive"] = true;
  }
  return this.find(query).sort({ "receiptDetails.generatedAt": -1 });
};

// Method to check if this is the latest deposit for the admission
depositReceiptSchema.methods.isLatestDeposit = async function () {
  const latestDeposit = await this.constructor
    .findOne({
      admissionId: this.admissionId,
      "receiptDetails.isActive": true,
    })
    .sort({ "depositDetails.sequenceNumber": -1 });

  return latestDeposit && latestDeposit._id.toString() === this._id.toString();
};

const DepositReceipt = mongoose.model("DepositReceipt", depositReceiptSchema);

export default DepositReceipt;

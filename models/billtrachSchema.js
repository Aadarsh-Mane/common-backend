import mongoose from "mongoose";

// Service item schema for detailed billing
const serviceItemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "ECG", "X-Ray", "ICU Charges"
  description: { type: String }, // Additional description
  quantity: { type: Number, default: 1 },
  rate: { type: Number, required: true },
  total: { type: Number, required: true },
  category: {
    type: String,
    enum: [
      "diagnostic",
      "treatment",
      "accommodation",
      "medication",
      "consultation",
      "other",
    ],
    default: "other",
  },
});

// Charges breakdown schema for IPD bills
const chargesBreakdownSchema = new mongoose.Schema({
  admissionFees: { rate: Number, days: Number, total: Number },
  icuCharges: { rate: Number, days: Number, total: Number },
  specialCharges: { rate: Number, days: Number, total: Number },
  generalWardCharges: { rate: Number, days: Number, total: Number },
  surgeonCharges: { rate: Number, days: Number, total: Number },
  assistantSurgeonCharges: { rate: Number, days: Number, total: Number },
  operationTheatreCharges: { rate: Number, days: Number, total: Number },
  operationTheatreMedicines: { rate: Number, days: Number, total: Number },
  anaesthesiaCharges: { rate: Number, days: Number, total: Number },
  localAnaesthesiaCharges: { rate: Number, days: Number, total: Number },
  o2Charges: { rate: Number, days: Number, total: Number },
  monitorCharges: { rate: Number, days: Number, total: Number },
  tapping: { rate: Number, days: Number, total: Number },
  ventilatorCharges: { rate: Number, days: Number, total: Number },
  emergencyCharges: { rate: Number, days: Number, total: Number },
  micCharges: { rate: Number, days: Number, total: Number },
  ivFluids: { rate: Number, days: Number, total: Number },
  bloodTransfusionCharges: { rate: Number, days: Number, total: Number },
  physioTherapyCharges: { rate: Number, days: Number, total: Number },
  xrayFilmCharges: { rate: Number, days: Number, total: Number },
  ecgCharges: { rate: Number, days: Number, total: Number },
  specialVisitCharges: { rate: Number, days: Number, total: Number },
  doctorCharges: { rate: Number, days: Number, total: Number },
  nursingCharges: { rate: Number, days: Number, total: Number },
  injMedicines: { rate: Number, days: Number, total: Number },
  catheterCharges: { rate: Number, days: Number, total: Number },
  rylesTubeCharges: { rate: Number, days: Number, total: Number },
  miscellaneousCharges: { rate: Number, days: Number, total: Number },
  dressingCharges: { rate: Number, days: Number, total: Number },
  professionalCharges: { rate: Number, days: Number, total: Number },
  serviceTaxCharges: { rate: Number, days: Number, total: Number },
  tractionCharges: { rate: Number, days: Number, total: Number },
  gastricLavageCharges: { rate: Number, days: Number, total: Number },
  plateletCharges: { rate: Number, days: Number, total: Number },
  nebulizerCharges: { rate: Number, days: Number, total: Number },
  implantCharges: { rate: Number, days: Number, total: Number },
  physicianCharges: { rate: Number, days: Number, total: Number },
  slabCastCharges: { rate: Number, days: Number, total: Number },
  mrfCharges: { rate: Number, days: Number, total: Number },
  procCharges: { rate: Number, days: Number, total: Number },
  staplingCharges: { rate: Number, days: Number, total: Number },
  enemaCharges: { rate: Number, days: Number, total: Number },
  gastroscopyCharges: { rate: Number, days: Number, total: Number },
  endoscopicCharges: { rate: Number, days: Number, total: Number },
  velixCharges: { rate: Number, days: Number, total: Number },
  bslCharges: { rate: Number, days: Number, total: Number },
  icdtCharges: { rate: Number, days: Number, total: Number },
  ophthalmologistCharges: { rate: Number, days: Number, total: Number },
});

// Payment tracking schema
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentMode: {
    type: String,
    // enum: ["Cash", "Card", "UPI", "Cheque", "Bank Transfer", "Insurance"],
    // default: "Cash",
  },
  transactionId: { type: String }, // For digital payments
  chequeNumber: { type: String }, // For cheque payments
  bankName: { type: String }, // For cheque/bank transfer
  paymentDate: { type: Date, default: Date.now },
  receivedBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String },
  },
  notes: { type: String },
});

// Counter schema for auto-incrementing billNo
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

// Main Bill Schema
const billSchema = new mongoose.Schema(
  {
    // Auto-incrementing bill number (1, 2, 3, 4...)
    billNo: {
      type: Number,
      unique: true,
      index: true,
    },

    // Bill identification
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    billType: {
      type: String,
      enum: ["IPD", "OPD", "Emergency", "Diagnostic"],
      required: true,
      index: true,
    },

    // Patient information
    patient: {
      patientId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      age: { type: Number },
      gender: { type: String, enum: ["Male", "Female", "Other"] },
      contact: { type: String },
      address: { type: String },
    },

    // Admission details (for IPD bills)
    admission: {
      admissionId: { type: mongoose.Schema.Types.ObjectId },
      admissionDate: { type: Date },
      dischargeDate: { type: Date },
      lengthOfStay: { type: Number }, // in days
      attendingDoctor: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
        name: { type: String },
      },
      department: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
        name: { type: String },
        type: { type: String },
      },
      bedNumber: { type: Number },
      roomType: { type: String }, // ICU, General Ward, Special Room, etc.
    },

    // Bill generation details
    // generatedBy: {
    //   id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    //   name: { type: String },
    //   role: { type: String }, // Doctor, Receptionist, Admin
    // },
    generatedAt: { type: Date, default: Date.now, index: true },

    // Services and charges
    services: [serviceItemSchema], // For OPD or itemized services
    chargesBreakdown: chargesBreakdownSchema, // For detailed IPD charges

    // Financial calculations
    financials: {
      servicesTotal: { type: Number, default: 0 },
      consultationFee: { type: Number, default: 0 },
      doctorCharges: { type: Number, default: 0 },
      subTotal: { type: Number, required: true },
      discountPercent: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      taxPercent: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      advance: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true },
      dueAmount: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
    },

    // Payment tracking
    payments: [paymentSchema],
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
      index: true,
    },

    // File management
    files: {
      pdfFileName: { type: String },
      driveLink: { type: String },
      localPath: { type: String }, // If storing locally
      pdfSize: { type: Number }, // in bytes
      uploadedAt: { type: Date },
    },

    // Status and workflow
    status: {
      type: String,
      enum: ["Draft", "Generated", "Sent", "Paid", "Cancelled"],
      default: "Generated",
      index: true,
    },

    // Additional information
    notes: { type: String },
    internalNotes: { type: String }, // For staff use only

    // Insurance details (if applicable)
    insurance: {
      provider: { type: String },
      policyNumber: { type: String },
      claimNumber: { type: String },
      approvalAmount: { type: Number },
      coveragePercentage: { type: Number },
    },

    // Audit trail
    lastModifiedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: { type: String },
    },
    lastModifiedAt: { type: Date, default: Date.now },

    // Bill correction/revision tracking
    revisionNumber: { type: Number, default: 1 },
    originalBillId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" }, // For revised bills
    isRevision: { type: Boolean, default: false },

    // Print and communication tracking
    printCount: { type: Number, default: 0 },
    emailSent: { type: Boolean, default: false },
    smsSent: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: "bills",
  }
);

// Indexes for performance
billSchema.index({ "patient.patientId": 1, billType: 1 });
billSchema.index({ generatedAt: -1 });
billSchema.index({ paymentStatus: 1, status: 1 });
billSchema.index({ "admission.admissionId": 1 });
billSchema.index({ billNumber: 1 }, { unique: true });
billSchema.index({ billNo: 1 }, { unique: true });

// Virtual for calculating outstanding amount
billSchema.virtual("outstandingAmount").get(function () {
  return this.financials.grandTotal - this.financials.paidAmount;
});

// Virtual for formatting bill number with prefix
billSchema.virtual("formattedBillNumber").get(function () {
  return `${this.billType}-${this.billNumber}`;
});

// Function to get next sequence number
async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequence_value;
}

// Pre-save middleware to auto-increment billNo
billSchema.pre("save", async function (next) {
  // Only set billNo for new documents
  if (this.isNew) {
    try {
      this.billNo = await getNextSequenceValue("billNo");
    } catch (error) {
      return next(error);
    }
  }

  // Existing payment status logic
  if (this.payments && this.payments.length > 0) {
    const totalPaid = this.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    this.financials.paidAmount = totalPaid;

    if (totalPaid >= this.financials.grandTotal) {
      this.paymentStatus = "Paid";
      this.financials.dueAmount = 0;
    } else if (totalPaid > 0) {
      this.paymentStatus = "Partial";
      this.financials.dueAmount = this.financials.grandTotal - totalPaid;
    } else {
      this.paymentStatus = "Pending";
      this.financials.dueAmount = this.financials.grandTotal;
    }
  }

  this.lastModifiedAt = new Date();
  next();
});

// Static method to generate bill number
billSchema.statics.generateBillNumber = async function (billType) {
  const prefix = billType.toUpperCase();
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");

  // Find the latest bill for this type and month
  const latestBill = await this.findOne({
    billType,
    billNumber: new RegExp(`^${prefix}${year}${month}`),
  }).sort({ billNumber: -1 });

  let sequence = 1;
  if (latestBill) {
    const lastSequence = parseInt(latestBill.billNumber.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${sequence.toString().padStart(4, "0")}`;
};

// Static method to get bill statistics
billSchema.statics.getBillStats = function (
  startDate,
  endDate,
  billType = null
) {
  const matchStage = {
    generatedAt: { $gte: startDate, $lte: endDate },
  };

  if (billType) {
    matchStage.billType = billType;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$billType",
        totalBills: { $sum: 1 },
        totalAmount: { $sum: "$financials.grandTotal" },
        paidAmount: { $sum: "$financials.paidAmount" },
        pendingAmount: { $sum: "$financials.dueAmount" },
      },
    },
  ]);
};

// Static method to get current billNo counter value
billSchema.statics.getCurrentBillNoCounter = async function () {
  const counter = await Counter.findOne({ _id: "billNo" });
  return counter ? counter.sequence_value : 0;
};

// Static method to reset billNo counter (use with caution)
billSchema.statics.resetBillNoCounter = async function (newValue = 0) {
  const counter = await Counter.findOneAndUpdate(
    { _id: "billNo" },
    { sequence_value: newValue },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

const Bill = mongoose.model("Bill", billSchema);

// Export both models
export { Counter };
export default Bill;

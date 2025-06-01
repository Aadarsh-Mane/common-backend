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
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
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
  },
  receiptDetails: {
    generatedBy: {
      userName: { type: String, required: true },
      userType: { type: String, required: true }, // Reception, Admin, etc.
    },
    generatedAt: { type: Date, default: Date.now },
    receiptUrl: { type: String }, // URL to the generated PDF
    isActive: { type: Boolean, default: true },
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

// Indexes for better query performance
depositReceiptSchema.index({ patientId: 1, admissionId: 1 });
depositReceiptSchema.index({ receiptId: 1 });
depositReceiptSchema.index({ "receiptDetails.generatedAt": -1 });
depositReceiptSchema.index({ "depositDetails.depositAmount": 1 });

// Pre-save middleware to update the updatedAt field
depositReceiptSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Method to generate receipt ID
depositReceiptSchema.statics.generateReceiptId = function () {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `DEP-${timestamp}-${randomPart}`.toUpperCase();
};

// Method to format deposit amount
depositReceiptSchema.methods.getFormattedAmount = function () {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(this.depositDetails.depositAmount);
};

// Virtual to get receipt age
depositReceiptSchema.virtual("receiptAge").get(function () {
  const now = new Date();
  const created = this.receiptDetails.generatedAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

const DepositReceipt = mongoose.model("DepositReceipt", depositReceiptSchema);
export default DepositReceipt;

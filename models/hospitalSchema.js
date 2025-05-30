import mongoose from "mongoose";

const billingRecordSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },

    // Billing details (from OPD receipt)
    billingAmount: { type: Number, required: true }, // Total billing amount (doctor + other charges)
    amountPaid: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },

    // Previous balance tracking
    previousRemainingAmount: { type: Number, default: 0 },

    // Billing metadata
    billingDate: { type: Date, default: Date.now },
    description: { type: String, default: "OPD Receipt" },

    // Receipt details
    receiptGenerated: { type: Boolean, default: false },
    receiptUrl: { type: String }, // Google Drive link
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for faster queries
billingRecordSchema.index({ patientId: 1, billingDate: -1 });

const BillingRecord = mongoose.model("BillingRecord", billingRecordSchema);
export default BillingRecord;

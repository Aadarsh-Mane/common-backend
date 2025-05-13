import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true,
  },
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
  },
  batchNumber: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  mrp: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
});

const saleSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "upi", "other"],
    default: "cash",
  },
  pdfLink: {
    type: String,
    trim: true,
  },
  // Add the patientInfo field here
  patientInfo: {
    patientId: {
      type: String,
      required: false,
    },
    prescriptionDate: {
      type: Date,
      required: false,
    },
    doctorNotes: {
      type: String,
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ billNumber: 1 });
// Add an index for patientInfo.patientId for faster queries
saleSchema.index({ "patientInfo.patientId": 1 });

export const Sale = mongoose.model("Sale", saleSchema);

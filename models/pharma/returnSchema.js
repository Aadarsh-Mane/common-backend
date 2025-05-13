import mongoose from "mongoose";

const returnItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true,
  },
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
  },
  batchNumber: {
    type: String,
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
  totalAmount: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
  },
});

const returnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  originalSale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  items: [returnItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  pdfLink: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

returnSchema.index({ createdAt: -1 });
returnSchema.index({ originalSale: 1 });

export const Return = mongoose.model("Return", returnSchema);

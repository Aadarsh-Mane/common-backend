// schemas/Distributor.js

// schemas/Medicine.js
import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Medicine name is required"],
    trim: true,
    index: true,
  },
  manufacturer: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: [
      "tablet",
      "capsule",
      "syrup",
      "injection",
      "ointment",
      "drops",
      "inhalers",
      "customized",
      "other",
    ],
    default: "other",
  },
  description: {
    type: String,
    trim: true,
  },
  mrp: {
    type: Number,
    required: [true, "MRP is required"],
    min: 0,
  },
  purchasePrice: {
    type: Number,
    required: [true, "Purchase price is required"],
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1 });

export const Medicine = mongoose.model("Medicine", medicineSchema);

// schemas/Inventory.js

// schemas/Customer.js

// schemas/Sale.js

// schemas/Return.js

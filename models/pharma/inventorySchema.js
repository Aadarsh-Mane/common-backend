import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: [true, "Medicine reference is required"],
  },
  batchNumber: {
    type: String,
    required: [true, "Batch number is required"],
    trim: true,
  },
  expiryDate: {
    type: Date,
    required: [true, "Expiry date is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: 0,
    default: 0,
  },
  distributor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Distributor",
  },
  addedOn: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient querying
inventorySchema.index({ medicine: 1, batchNumber: 1, expiryDate: 1 });
inventorySchema.index({ expiryDate: 1 }); // For expiry checks

export const Inventory = mongoose.model("Inventory", inventorySchema);

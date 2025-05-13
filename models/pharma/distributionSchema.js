import mongoose from "mongoose";

const distributorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Distributor name is required"],
    trim: true,
    index: true,
  },
  contactNumber: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  address: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

distributorSchema.index({ name: 1 });

export const Distributor = mongoose.model("Distributor", distributorSchema);

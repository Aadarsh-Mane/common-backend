import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Customer name is required"],
    trim: true,
    index: true,
  },
  contactNumber: {
    type: String,
    trim: true,
    index: true,
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
  isPatient: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

customerSchema.index({ name: 1, contactNumber: 1 });

export const Customer = mongoose.model("Customer", customerSchema);

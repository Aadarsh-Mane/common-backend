import mongoose from "mongoose";

const dischargeSummarySchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true,
  },
  patientName: {
    type: String,
  },
  fileName: {
    type: String,
    required: true,
  },
  driveLink: {
    type: String,
    required: true,
  },

  generatedAt: {
    type: Date,
    default: Date.now,
  },
  isManuallyGenerated: {
    type: Boolean,
    default: true,
  },
});

export const DischargeSummary = mongoose.model(
  "DischargeSummary",
  dischargeSummarySchema
);

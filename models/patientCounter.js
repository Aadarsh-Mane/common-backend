// models/PatientCounter.js
import mongoose from "mongoose";

const patientCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  }, // 'opdNumber' or 'ipdNumber'
  sequence_value: {
    type: Number,
    default: 0,
  },
  lastReset: {
    type: Date,
    default: Date.now,
  },
  resetPeriod: {
    type: String,
    enum: ["yearly", "monthly", "never"],
    default: "yearly",
  },
});

// Function to get next sequence number
patientCounterSchema.statics.getNextSequenceValue = async function (
  sequenceName
) {
  const counter = await this.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

// Function to get current sequence value without incrementing
patientCounterSchema.statics.getCurrentSequenceValue = async function (
  sequenceName
) {
  const counter = await this.findOne({ _id: sequenceName });
  return counter ? counter.sequence_value : 0;
};

// Function to reset counter (use with caution)
patientCounterSchema.statics.resetCounter = async function (
  sequenceName,
  newValue = 0
) {
  const counter = await this.findOneAndUpdate(
    { _id: sequenceName },
    {
      sequence_value: newValue,
      lastReset: new Date(),
    },
    { new: true, upsert: true }
  );
  return counter.sequence_value;
};

const PatientCounter = mongoose.model("PatientCounter", patientCounterSchema);
export default PatientCounter;

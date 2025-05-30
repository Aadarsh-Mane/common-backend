// models/nursingChecklist.js
import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema({
  task: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
  completedAt: { type: Date },
  notes: { type: String },
});

const nursingChecklistSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: {
    type: String,
    enum: ["SurgeryPrep", "DischargeProtocol", "InfectionControl"],
    required: true,
  },
  items: [checklistItemSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
  validatedAt: { type: Date },
  isCompleted: { type: Boolean, default: false },
});

const NursingChecklist = mongoose.model(
  "NursingChecklist",
  nursingChecklistSchema
);
export default NursingChecklist;

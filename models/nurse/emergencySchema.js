// models/emergencyMedication.js
import mongoose from "mongoose";

const emergencyMedicationSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  administeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  },

  administeredAt: { type: Date, default: Date.now },
  nurseName: { type: String, required: true },

  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "PendingDoctorApproval"],
    default: "Pending",
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
  reviewedAt: { type: Date },
  doctorApproval: {
    approved: { type: Boolean },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
    notes: { type: String },
    timestamp: { type: Date },
  },
  justification: { type: String },
});

const EmergencyMedication = mongoose.model(
  "EmergencyMedication",
  emergencyMedicationSchema
);
export default EmergencyMedication;

import mongoose from "mongoose";
const surgicalNotesSchema = new mongoose.Schema({
  // Basic Information
  surgeryDate: { type: Date, required: true },
  surgeryTime: { type: String, required: true },
  surgeonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    required: true,
  },
  surgeonName: { type: String, required: true },
  assistantSurgeons: [
    {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
      name: { type: String },
    },
  ],

  // Pre-operative Details
  preOperativeDiagnosis: { type: String, required: true },
  indicationForSurgery: { type: String, required: true },
  surgicalProcedure: { type: String, required: true },
  plannedProcedure: { type: String },

  // Anesthesia Details
  anesthesiaType: {
    type: String,
    enum: ["General", "Regional", "Local", "Spinal", "Epidural", "MAC"],
    required: true,
  },
  anesthesiologistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },
  anesthesiologistName: { type: String },
  anesthesiaStart: { type: String },
  anesthesiaEnd: { type: String },

  // Surgical Details
  surgicalApproach: { type: String }, // e.g., "Laparoscopic", "Open", "Robotic"
  incisionType: { type: String },
  incisionLocation: { type: String },
  surgicalFindings: { type: String, required: true },
  procedureDescription: { type: String, required: true },

  // Complications and Challenges
  intraOperativeComplications: { type: String },
  estimatedBloodLoss: { type: String },
  fluidBalance: {
    inputFluids: { type: String },
    outputFluids: { type: String },
    bloodTransfusion: { type: String },
  },

  // Implants and Materials
  implants: [
    {
      name: { type: String },
      serialNumber: { type: String },
      manufacturer: { type: String },
      size: { type: String },
    },
  ],
  sutureMaterials: { type: String },
  drains: { type: String },

  // Post-operative Information
  postOperativeDiagnosis: { type: String, required: true },
  procedureOutcome: {
    type: String,
    enum: ["Successful", "Complicated", "Partial Success"],
    required: true,
  },
  postOperativeInstructions: { type: String },

  // Recovery and Monitoring
  recoveryNotes: { type: String },
  vitalSigns: {
    bloodPressure: { type: String },
    heartRate: { type: String },
    oxygenSaturation: { type: String },
    temperature: { type: String },
  },

  // Follow-up and Discharge
  expectedRecoveryTime: { type: String },
  followUpInstructions: { type: String },
  dischargePlanning: { type: String },

  // Administrative
  operatingRoom: { type: String },
  surgeryDuration: { type: String },
  urgency: {
    type: String,
    enum: ["Elective", "Urgent", "Emergency"],
    default: "Elective",
  },

  // Documentation
  photographicDocumentation: { type: Boolean, default: false },
  videoDocumentation: { type: Boolean, default: false },
  pathologySpecimens: { type: String },

  // Notes and Observations
  surgeonNotes: { type: String },
  nursingNotes: { type: String },
  additionalObservations: { type: String },

  // PDF Generation
  pdfGenerated: { type: Boolean, default: false },
  pdfUrl: { type: String },
  pdfGeneratedAt: { type: Date },

  // Audit Trail
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },

  // Version Control
  version: { type: Number, default: 1 },
  previousVersions: [
    {
      versionNumber: { type: Number },
      modifiedAt: { type: Date },
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
      changes: { type: String },
    },
  ],
});
export default surgicalNotesSchema;

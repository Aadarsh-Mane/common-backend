import mongoose from "mongoose";
import surgicalNotesSchema from "./surgicalNotesSchema.js";

// 2-hour follow-up sub-schema

// Follow-up schema
const followUpSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  }, // Nurse who recorded the follow-up
  date: { type: String },

  notes: { type: String, required: true },
  observations: { type: String },
  temperature: { type: String }, // T (Temperature)
  pulse: { type: String }, // P (Pulse)
  respirationRate: { type: String }, // R (Respiration Rate)
  bloodPressure: { type: String }, // Non-Invasive Blood Pressure
  oxygenSaturation: { type: String }, // SpO2 (Oxygen Saturation)
  bloodSugarLevel: { type: String }, // BSL (Blood Sugar Level)
  otherVitals: { type: String }, // OTHER (Any other vitals to be recorded)

  // Intake data (IV Fluids, Nasogastric, Feed, etc.)
  ivFluid: { type: String }, // I.V. Fluid (Intravenous fluids administered)
  nasogastric: { type: String }, // Nasogastric (Input through nasogastric tube)
  rtFeedOral: { type: String }, // RT Feed/Oral (Feed given via RT or orally)
  totalIntake: { type: String }, // Total (Total intake of fluids)
  cvp: { type: String }, // CVP (Central Venous Pressure)

  // Output data (Urine, Stool, RT Aspirate, etc.)
  urine: { type: String }, // Urine (Urinary output)
  stool: { type: String }, // Stool (Stool output)
  rtAspirate: { type: String }, // RT Aspirate (Output through Ryle's Tube aspirate)
  otherOutput: { type: String }, // Other (Any other output)

  // Ventilator data (Mode, Rate, FiO2, etc.)
  ventyMode: { type: String }, // VentyMode (Ventilator Mode)
  setRate: { type: String }, // Set Rate (Set ventilator rate)
  fiO2: { type: String }, // FiO2 (Fraction of Inspired Oxygen)
  pip: { type: String }, // PIP (Peak Inspiratory Pressure)
  peepCpap: { type: String }, // PEEP/CPAP (Positive End-Expiratory Pressure/Continuous Positive Airway Pressure)
  ieRatio: { type: String }, // I:E Ratio (Inspiratory to Expiratory Ratio)
  otherVentilator: { type: String }, // Other (Any
});

const fourHrFollowUpSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  }, // Nurse who recorded the follow-up

  date: { type: String }, // Date and time of the 4-hour follow-up
  notes: { type: String, required: true }, // Additional notes
  observations: { type: String }, // Observations during the follow-up

  // Vital signs for 4-hour follow-up
  fourhrpulse: { type: String },
  fourhrbloodPressure: { type: String },
  fourhroxygenSaturation: { type: String },
  fourhrTemperature: { type: String },
  fourhrbloodSugarLevel: { type: String },
  fourhrotherVitals: { type: String },
  fourhrivFluid: { type: String },
  fourhrurine: { type: String },
});

const prescriptionSchema = new mongoose.Schema({
  medicine: {
    name: { type: String }, // Name of the medicine
    morning: { type: String }, // Whether to take in the morning
    afternoon: { type: String }, // Whether to take in the afternoon
    night: { type: String }, // Whether to take at night
    comment: { type: String }, // Additional comments
    date: { type: Date, default: Date.now }, // Timestamp for when the prescription was added
  },
});
const consultantSchema = new mongoose.Schema({
  allergies: { type: String }, // Name of the medicine
  cheifComplaint: { type: String }, // Whether to take in the morning
  describeAllergies: { type: String },
  historyOfPresentIllness: { type: String },
  personalHabits: { type: String },
  familyHistory: { type: String },
  menstrualHistory: { type: String },
  wongBaker: { type: String },
  visualAnalogue: { type: String },
  relevantPreviousInvestigations: { type: String },

  immunizationHistory: { type: String },
  pastMedicalHistory: { type: String },
  date: { type: String },
});
const dischargeSummarySchema = new mongoose.Schema({
  isGenerated: { type: Boolean, default: false },
  isDoctorGenerated: { type: Boolean, default: false },
  fileName: { type: String },
  driveLink: { type: String },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },
  generatedAt: { type: Date },
  savedAt: { type: Date },

  // Clinical summary data
  finalDiagnosis: { type: String },
  complaints: [{ type: String }], // Array of complaints
  pastHistory: [{ type: String }], // Array of past history items
  examFindings: [{ type: String }], // Array of examination findings
  generalExam: {
    Temp: { type: String },
    Pulse: { type: String },
    BP: { type: String },
    SPO2: { type: String },
  },
  radiology: [{ type: String }], // Array of radiology findings
  pathology: [{ type: String }], // Array of pathology results
  operation: {
    Type: { type: String },
    Date: { type: String },
    Surgeon: { type: String },
    Anaesthetist: { type: String },
    "Anaesthesia Type": { type: String },
    Procedure: [{ type: String }],
  },
  treatmentGiven: [{ type: String }], // Array of treatments
  conditionOnDischarge: { type: String },

  // Metadata
  template: { type: String, default: "standard" },
  version: { type: String, default: "1.0" },

  // Additional fields for tracking
  isPreview: { type: Boolean, default: false },
  previewGeneratedAt: { type: Date },
  lastModifiedAt: { type: Date, default: Date.now },
  modificationHistory: [
    {
      modifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
      modifiedAt: { type: Date, default: Date.now },
      changes: { type: String }, // Description of changes made
    },
  ],
});

const admissionRecordSchema = new mongoose.Schema({
  // OPD and IPD tracking numbers
  opdNumber: {
    type: Number,
    // required: true,
    index: true,
  }, // Auto-increment starting from 1
  ipdNumber: {
    type: Number,
    index: true,
  }, // Only set when patient is admitted to IPD

  admissionDate: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" },
  patientType: {
    type: String,
    default: "Internal",
  },

  admitNotes: { type: String },
  reasonForAdmission: { type: String },
  doctorConsultant: { type: [String] },
  conditionAtDischarge: {
    type: String,
    enum: ["Discharged", "Transferred", "D.A.M.A.", "Absconded", "Expired"],
    default: "Discharged",
  },
  amountToBePayed: { type: Number },
  dischargeDate: { type: Date },
  weight: { type: Number },
  symptoms: { type: String },
  initialDiagnosis: { type: String },
  doctor: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
    name: { type: String },
    usertype: { type: String },
  },
  dischargeSummary: dischargeSummarySchema,

  followUps: [followUpSchema], // Array of follow-up records for each admission
  fourHrFollowUpSchema: [fourHrFollowUpSchema], // Array of 4-hour follow-up records for each admission

  doctorPrescriptions: [prescriptionSchema], // Array of prescriptions
  doctorConsulting: [consultantSchema],
  surgicalNotes: [surgicalNotesSchema],

  symptomsByDoctor: { type: [String] }, // Array to store symptoms added by the doctor

  vitals: [
    {
      temperature: { type: String }, // Temperature in Celsius or Fahrenheit
      pulse: { type: String }, // Pulse rate
      bloodPressure: { type: String },
      bloodSugarLevel: { type: String },
      other: { type: String }, // For additional vital information

      recordedAt: { type: Date, default: Date.now }, // Timestamp for when the vitals were recorded
    },
  ],
  doctorNotes: [
    {
      text: { type: String }, // The note written by the doctor
      doctorName: { type: String },
      time: { type: String }, // Time of the note
      date: { type: String }, // Date of the note
    },
  ],
  // Updated medication schema
  medications: [
    {
      name: { type: String, required: true },
      dosage: { type: String },
      type: { type: String },
      date: { type: String },
      time: { type: String },
      // New fields for administration tracking
      administrationStatus: {
        type: String,
        enum: ["Pending", "Administered", "Skipped"],
        default: "Pending",
      },
      administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
      administeredAt: { type: Date },
      administrationNotes: { type: String },
    },
  ],

  // Update IV fluids schema similarly
  ivFluids: [
    {
      name: { type: String, required: true },
      quantity: { type: String },
      duration: { type: String },
      date: { type: String },
      time: { type: String },
      // New fields for administration tracking
      administrationStatus: {
        type: String,
        enum: ["Pending", "Administered", "Skipped"],
        default: "Pending",
      },
      administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
      administeredAt: { type: Date },
      administrationNotes: { type: String },
    },
  ],

  // Update procedures schema
  procedures: [
    {
      name: { type: String, required: true },
      frequency: { type: String },
      date: { type: String },
      time: { type: String },
      // New fields for completion tracking
      administrationStatus: {
        type: String,
        enum: ["Pending", "Completed", "Skipped"],
        default: "Pending",
      },
      administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
      administeredAt: { type: Date },
      administrationNotes: { type: String },
    },
  ],

  // Update special instructions schema
  specialInstructions: [
    {
      instruction: { type: String, required: true },
      date: { type: String },
      time: { type: String },
      // New fields for completion tracking
      status: {
        type: String,
        enum: ["Pending", "Completed", "Skipped"],
        default: "Pending",
      },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
      completedAt: { type: Date },
      completionNotes: { type: String },
    },
  ],
  diagnosisByDoctor: { type: [String] }, // Array to store diagnoses added by the doctor
  section: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
    name: { type: String },
    type: { type: String },
  },
  bedNumber: { type: Number },
  ipdDetailsUpdated: { type: Boolean, default: false },
});

// Add indexes for better query performance
admissionRecordSchema.index({ opdNumber: 1 });
admissionRecordSchema.index({ ipdNumber: 1 });
admissionRecordSchema.index({ admissionDate: -1 });
admissionRecordSchema.index({ status: 1 });

const patientSchema1 = new mongoose.Schema({
  patientId: { type: String, unique: true }, // Unique Patient ID
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  contact: { type: String, required: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  dob: { type: String },
  imageUrl: {
    type: String,
    default: " ",
  },
  discharged: { type: Boolean, default: false },
  pendingAmount: { type: Number, default: 0 },
  admissionRecords: [admissionRecordSchema],
});

// Add compound indexes for better query performance
patientSchema1.index({ patientId: 1, discharged: 1 });
patientSchema1.index({ "admissionRecords.opdNumber": 1 });
patientSchema1.index({ "admissionRecords.ipdNumber": 1 });

// Virtual to get latest admission record
patientSchema1.virtual("latestAdmission").get(function () {
  if (this.admissionRecords.length === 0) return null;
  return this.admissionRecords[this.admissionRecords.length - 1];
});

// Method to get admission by OPD number
patientSchema1.methods.getAdmissionByOPDNumber = function (opdNumber) {
  return this.admissionRecords.find((record) => record.opdNumber === opdNumber);
};

// Method to get admission by IPD number
patientSchema1.methods.getAdmissionByIPDNumber = function (ipdNumber) {
  return this.admissionRecords.find((record) => record.ipdNumber === ipdNumber);
};

// Static method to find patient by OPD number
patientSchema1.statics.findByOPDNumber = function (opdNumber) {
  return this.findOne({ "admissionRecords.opdNumber": opdNumber });
};

// Static method to find patient by IPD number
patientSchema1.statics.findByIPDNumber = function (ipdNumber) {
  return this.findOne({ "admissionRecords.ipdNumber": ipdNumber });
};

const patientSchema = mongoose.model("Patient", patientSchema1);
export default patientSchema;

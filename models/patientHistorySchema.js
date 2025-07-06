// import mongoose from "mongoose";

// // Patient History Schema

// // 2-hour follow-up sub-schema

// // Follow-up schema
// const followUpSchema = new mongoose.Schema({
//   nurseId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Nurse",
//     required: true,
//   }, // Nurse who recorded the follow-up
//   date: { type: String },

//   notes: { type: String, required: true },
//   observations: { type: String },
//   temperature: { type: String }, // T (Temperature)
//   pulse: { type: String }, // P (Pulse)
//   respirationRate: { type: String }, // R (Respiration Rate)
//   bloodPressure: { type: String }, // Non-Invasive Blood Pressure
//   oxygenSaturation: { type: String }, // SpO2 (Oxygen Saturation)
//   bloodSugarLevel: { type: String }, // BSL (Blood Sugar Level)
//   otherVitals: { type: String }, // OTHER (Any other vitals to be recorded)

//   // Intake data (IV Fluids, Nasogastric, Feed, etc.)
//   ivFluid: { type: String }, // I.V. Fluid (Intravenous fluids administered)
//   nasogastric: { type: String }, // Nasogastric (Input through nasogastric tube)
//   rtFeedOral: { type: String }, // RT Feed/Oral (Feed given via RT or orally)
//   totalIntake: { type: String }, // Total (Total intake of fluids)
//   cvp: { type: String }, // CVP (Central Venous Pressure)

//   // Output data (Urine, Stool, RT Aspirate, etc.)
//   urine: { type: String }, // Urine (Urinary output)
//   stool: { type: String }, // Stool (Stool output)
//   rtAspirate: { type: String }, // RT Aspirate (Output through Ryle's Tube aspirate)
//   otherOutput: { type: String }, // Other (Any other output)

//   // Ventilator data (Mode, Rate, FiO2, etc.)
//   ventyMode: { type: String }, // VentyMode (Ventilator Mode)
//   setRate: { type: String }, // Set Rate (Set ventilator rate)
//   fiO2: { type: String }, // FiO2 (Fraction of Inspired Oxygen)
//   pip: { type: String }, // PIP (Peak Inspiratory Pressure)
//   peepCpap: { type: String }, // PEEP/CPAP (Positive End-Expiratory Pressure/Continuous Positive Airway Pressure)
//   ieRatio: { type: String }, // I:E Ratio (Inspiratory to Expiratory Ratio)
//   otherVentilator: { type: String }, // Other (Any
// });

// const fourHrFollowUpSchema = new mongoose.Schema({
//   nurseId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Nurse",
//     required: true,
//   }, // Nurse who recorded the follow-up

//   date: { type: String }, // Date and time of the 4-hour follow-up
//   notes: { type: String, required: true }, // Additional notes
//   observations: { type: String }, // Observations during the follow-up

//   // Vital signs for 4-hour follow-up
//   fourhrpulse: { type: String },
//   fourhrbloodPressure: { type: String },
//   fourhroxygenSaturation: { type: String },
//   fourhrTemperature: { type: String },
//   fourhrbloodSugarLevel: { type: String },
//   fourhrotherVitals: { type: String },
//   fourhrivFluid: { type: String },
//   fourhrurine: { type: String },
// });

// const patientHistorySchema = new mongoose.Schema({
//   patientId: { type: String, unique: true, required: true }, // Same patientId as in Patient schema
//   name: { type: String, required: true }, // Redundant for easier history tracking
//   gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
//   contact: { type: String }, // Optional for history purposes
//   age: { type: String },
//   // Historical records
//   history: [
//     {
//       admissionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to admission
//       admissionDate: Date,
//       dischargeDate: Date, // When the patient was discharged
//       reasonForAdmission: String,
//       doctorConsultant: { type: [String] },
//       amountToBePayed: { type: Number }, //
//       dischargedByReception: {
//         type: Boolean, //
//         default: false,
//       },
//       conditionAtDischarge: String,
//       previousRemainingAmount: { type: Number },
//       symptoms: String,
//       initialDiagnosis: String,
//       doctor: {
//         id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
//         name: String,
//       },
//       reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "PatientReport" }],
//       followUps: [followUpSchema], // Array of follow-up records for each admission
//       fourHrFollowUpSchema: [fourHrFollowUpSchema], // Array of 4-hour follow-up records for each admission

//       labReports: [
//         {
//           labTestNameGivenByDoctor: String, // Test name requested by doctor
//           reports: [
//             {
//               labTestName: String, // Name of the lab test
//               reportUrl: String, // URL to the uploaded PDF
//               labType: String, // Type of lab (e.g., hematology)
//               uploadedAt: { type: Date, default: Date.now }, // Timestamp
//             },
//           ],
//         },
//       ], // New field for lab reports
//       weight: { type: Number },
//       doctorPrescriptions: [
//         {
//           medicine: {
//             name: { type: String }, // Name of the medicine
//             morning: { type: String }, // Morning dose
//             afternoon: { type: String }, // Afternoon dose
//             night: { type: String }, // Night dose
//             comment: { type: String }, // Additional comments
//             date: { type: Date, default: Date.now }, // Timestamp
//           },
//         },
//       ],
//       doctorConsulting: [
//         {
//           allergies: { type: String },
//           cheifComplaint: { type: String },
//           describeAllergies: { type: String },
//           historyOfPresentIllness: { type: String },
//           personalHabits: { type: String },
//           familyHistory: { type: String },
//           menstrualHistory: { type: String },
//           wongBaker: { type: String },
//           visualAnalogue: { type: String },
//           relevantPreviousInvestigations: { type: String },
//           immunizationHistory: { type: String },
//           pastMedicalHistory: { type: String },
//         },
//       ],
//       symptomsByDoctor: { type: [String] }, // Array to store symptoms added by the doctor
//       vitals: [
//         {
//           temperature: { type: String },
//           pulse: { type: String },
//           bloodPressure: { type: String },
//           bloodSugarLevel: { type: String },

//           other: { type: String },
//           recordedAt: { type: Date, default: Date.now },
//         },
//       ],
//       diagnosisByDoctor: { type: [String] }, // Array to store diagnoses added by the doctor
//     },
//   ],
// });

// const PatientHistory = mongoose.model("PatientHistory", patientHistorySchema);
// export default PatientHistory;
import mongoose from "mongoose";

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
  otherVentilator: { type: String }, // Other (Any other ventilator data)
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
    morning: { type: String }, // Morning dose
    afternoon: { type: String }, // Afternoon dose
    night: { type: String }, // Night dose
    comment: { type: String }, // Additional comments
    date: { type: Date, default: Date.now }, // Timestamp
  },
});

const consultantSchema = new mongoose.Schema({
  allergies: { type: String },
  cheifComplaint: { type: String },
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
const dischargeSummaryHistorySchema = new mongoose.Schema({
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

  // Clinical summary data - stored as arrays/objects for history preservation
  finalDiagnosis: { type: String },
  complaints: [{ type: String }],
  pastHistory: [{ type: String }],
  examFindings: [{ type: String }],
  generalExam: {
    Temp: { type: String },
    Pulse: { type: String },
    BP: { type: String },
    SPO2: { type: String },
  },
  radiology: [{ type: String }],
  pathology: [{ type: String }],
  operation: {
    Type: { type: String },
    Date: { type: String },
    Surgeon: { type: String },
    Anaesthetist: { type: String },
    "Anaesthesia Type": { type: String },
    Procedure: [{ type: String }],
  },
  treatmentGiven: [{ type: String }],
  conditionOnDischarge: { type: String },

  // Metadata
  template: { type: String, default: "standard" },
  version: { type: String, default: "1.0" },

  // Historical tracking
  originalAdmissionId: { type: mongoose.Schema.Types.ObjectId },
  archivedAt: { type: Date, default: Date.now },
  archiveReason: { type: String, default: "Patient Discharged" },
});

const patientHistorySchema = new mongoose.Schema({
  patientId: { type: String, unique: true, required: true }, // Same patientId as in Patient schema
  name: { type: String, required: true }, // Redundant for easier history tracking
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  contact: { type: String }, // Optional for history purposes
  age: { type: Number },
  address: { type: String },
  dob: { type: String },
  imageUrl: { type: String },

  // Historical records
  history: [
    {
      admissionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to admission

      // OPD and IPD tracking numbers
      opdNumber: {
        type: Number,
        required: true,
        index: true,
      }, // OPD number from original admission
      ipdNumber: {
        type: Number,
        index: true,
      }, // IPD number if patient was admitted to IPD

      admissionDate: { type: Date },
      dischargeDate: { type: Date }, // When the patient was discharged
      status: { type: String },
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
      previousRemainingAmount: { type: Number },
      dischargedByReception: {
        type: Boolean,
        default: false,
      },
      weight: { type: Number },
      symptoms: { type: String },
      initialDiagnosis: { type: String },
      doctor: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
        name: { type: String },
        usertype: { type: String },
      },
      section: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
        name: { type: String },
        type: { type: String },
      },
      bedNumber: { type: Number },
      reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "PatientReport" }],

      // Follow-ups and monitoring
      followUps: [followUpSchema], // Array of follow-up records for each admission
      fourHrFollowUpSchema: [fourHrFollowUpSchema], // Array of 4-hour follow-up records for each admission
      dischargeSummary: dischargeSummaryHistorySchema,

      // Lab and diagnostic reports
      labReports: [
        {
          labTestNameGivenByDoctor: { type: String }, // Test name requested by doctor
          reports: [
            {
              labTestName: { type: String }, // Name of the lab test
              reportUrl: { type: String }, // URL to the uploaded PDF
              labType: { type: String }, // Type of lab (e.g., hematology)
              uploadedAt: { type: Date, default: Date.now }, // Timestamp
            },
          ],
        },
      ],

      // Doctor prescriptions and consultations
      doctorPrescriptions: [prescriptionSchema],
      doctorConsulting: [consultantSchema],
      symptomsByDoctor: { type: [String] },
      diagnosisByDoctor: { type: [String] },

      // Vital records
      vitals: [
        {
          temperature: { type: String },
          pulse: { type: String },
          bloodPressure: { type: String },
          bloodSugarLevel: { type: String },
          other: { type: String },
          recordedAt: { type: Date, default: Date.now },
        },
      ],

      // Treatment records
      doctorNotes: [
        {
          text: { type: String },
          doctorName: { type: String },
          time: { type: String },
          date: { type: String },
        },
      ],
      medications: [
        {
          name: { type: String, required: true },
          dosage: { type: String },
          type: { type: String },
          date: { type: String },
          time: { type: String },
        },
      ],
      ivFluids: [
        {
          name: { type: String, required: true },
          quantity: { type: String },
          duration: { type: String },
          date: { type: String },
          time: { type: String },
        },
      ],
      procedures: [
        {
          name: { type: String, required: true },
          frequency: { type: String },
          date: { type: String },
          time: { type: String },
        },
      ],
      specialInstructions: [
        {
          instruction: { type: String, required: true },
          date: { type: String },
          time: { type: String },
        },
      ],
    },
  ],
});

// Add indexes for better query performance
patientHistorySchema.index({ patientId: 1 });
patientHistorySchema.index({ "history.opdNumber": 1 });
patientHistorySchema.index({ "history.ipdNumber": 1 });
patientHistorySchema.index({ "history.admissionDate": -1 });
patientHistorySchema.index({ "history.dischargeDate": -1 });

// Method to get history by OPD number
patientHistorySchema.methods.getHistoryByOPDNumber = function (opdNumber) {
  return this.history.find((record) => record.opdNumber === opdNumber);
};

// Method to get history by IPD number
patientHistorySchema.methods.getHistoryByIPDNumber = function (ipdNumber) {
  return this.history.find((record) => record.ipdNumber === ipdNumber);
};

// Static method to find patient history by OPD number
patientHistorySchema.statics.findByOPDNumber = function (opdNumber) {
  return this.findOne({ "history.opdNumber": opdNumber });
};

// Static method to find patient history by IPD number
patientHistorySchema.statics.findByIPDNumber = function (ipdNumber) {
  return this.findOne({ "history.ipdNumber": ipdNumber });
};

// Method to get latest admission/discharge record
patientHistorySchema.methods.getLatestRecord = function () {
  if (this.history.length === 0) return null;
  return this.history.sort(
    (a, b) => new Date(b.admissionDate) - new Date(a.admissionDate)
  )[0];
};

// Method to get admission statistics
patientHistorySchema.methods.getAdmissionStats = function () {
  const totalAdmissions = this.history.length;
  const ipdAdmissions = this.history.filter(
    (record) => record.ipdNumber
  ).length;
  const opdOnlyAdmissions = totalAdmissions - ipdAdmissions;

  return {
    totalAdmissions,
    ipdAdmissions,
    opdOnlyAdmissions,
    averageStayDuration: this.history
      .filter((record) => record.dischargeDate && record.admissionDate)
      .map((record) => {
        const admission = new Date(record.admissionDate);
        const discharge = new Date(record.dischargeDate);
        return Math.ceil((discharge - admission) / (1000 * 60 * 60 * 24));
      })
      .reduce((sum, days, _, arr) => sum + days / arr.length, 0),
  };
};

const PatientHistory = mongoose.model("PatientHistory", patientHistorySchema);
export default PatientHistory;

import mongoose from "mongoose";

// Dialysis Patient Registration Schema
const dialysisRegistrationSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, unique: true, required: true },
  patientId: { type: String, required: true }, // Reference to main patient
  admissionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  dialysisType: {
    type: String,
    enum: ["Hemodialysis", "Peritoneal Dialysis"],
    required: true,
  },
  accessType: {
    type: String,
    enum: ["AV Fistula", "Catheter", "Graft"],
    required: true,
  },
  nephrologist: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
    name: { type: String, required: true },
  },
  dialysisSchedule: {
    days: [
      {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    ],
    time: { type: String, required: true },
  },
  dialysisStartDate: { type: Date, required: true },
  dialysisStatus: {
    type: String,
    enum: ["Active", "On Hold", "Completed"],
    default: "Active",
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    required: true,
  },
  registeredAt: { type: Date, default: Date.now },
});

// Pre-Dialysis Assessment Schema
const preDialysisAssessmentSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, required: true },
  dateTime: { type: Date, default: Date.now },
  preWeight: { type: Number, required: true },
  preBloodPressure: { type: String, required: true },
  temperature: { type: Number, required: true },
  pulse: { type: Number, required: true },
  accessSiteCondition: { type: String, required: true },
  complaints: { type: String },
  assessedBy: {
    type: String,
    // type: mongoose.Schema.Types.ObjectId,
    // ref: "Nurse",
    // required: true,
  },
});

// Dialysis Session Record Schema
const dialysisSessionSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, required: true },
  sessionDate: { type: Date, default: Date.now },

  // Machine and technical details (filled during start session)
  machineId: { type: String }, // Not required initially
  dialyzerType: { type: String }, // Not required initially
  sessionStartTime: { type: Date }, // Not required initially
  sessionEndTime: { type: Date },
  duration: { type: Number }, // in minutes
  dryWeight: { type: Number }, // Not required initially
  bloodFlowRate: { type: Number }, // Not required initially
  dialysateFlowRate: { type: Number }, // Not required initially
  heparinDosage: { type: Number }, // Not required initially
  ultrafiltrationVolume: { type: Number },
  conductivity: { type: Number },
  dialysateTemperature: { type: Number },

  adverseEvents: [
    {
      event: { type: String },
      time: { type: Date },
      action: { type: String },
    },
  ],
  sessionStatus: {
    type: String,
    enum: ["Pre-Assessment", "In Progress", "Completed", "Terminated"],
    default: "Pre-Assessment",
  },

  // Technician info (filled during start session)
  technicianNurse: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
    name: { type: String }, // Not required initially
  },

  preDialysisAssessment: preDialysisAssessmentSchema,
  postDialysisMonitoring: {
    postWeight: { type: Number },
    postBloodPressure: { type: String },
    postPulse: { type: Number },
    postTemperature: { type: Number },
    accessSiteCheck: { type: String },
    complications: [{ type: String }],
    monitoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nurse",
    },
    monitoredAt: { type: Date },
  },
});

// Lab Reports Schema for Dialysis
const dialysisLabReportSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, required: true },
  reportDate: { type: Date, default: Date.now },
  testType: {
    type: String,
    enum: ["Routine", "Monthly", "Bi-weekly", "Emergency"],
    default: "Routine",
  },
  labValues: {
    hemoglobin: { type: Number },
    creatinine: { type: Number },
    urea: { type: Number },
    potassium: { type: Number },
    sodium: { type: Number },
    calcium: { type: Number },
    phosphorus: { type: Number },
    pth: { type: Number }, // Parathyroid Hormone
  },
  reportUrl: { type: String },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    required: true,
  },
  uploadedAt: { type: Date, default: Date.now },
});

// Medication Chart Schema for Dialysis
const dialysisMedicationSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, required: true },
  medicationName: {
    type: String,
    enum: [
      "Iron Sucrose",
      "Erythropoietin",
      "Calcium",
      "Phosphate Binder",
      "Other",
    ],
    required: true,
  },
  customMedicationName: { type: String }, // For "Other" type
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  route: { type: String, required: true },
  prescribedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    required: true,
  },
  prescribedAt: { type: Date, default: Date.now },
  administrationRecords: [
    {
      administeredDate: { type: Date },
      administeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Nurse",
      },
      dosageGiven: { type: String },
      notes: { type: String },
      status: {
        type: String,
        enum: ["Administered", "Skipped", "Delayed"],
        default: "Administered",
      },
    },
  ],
  isActive: { type: Boolean, default: true },
});

// Billing Schema for Dialysis
const dialysisBillingSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "DialysisSession" },
  billingDate: { type: Date, default: Date.now },
  sessionCharges: { type: Number, required: true },
  consumables: [
    {
      item: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitCost: { type: Number, required: true },
      totalCost: { type: Number, required: true },
    },
  ],
  packageType: {
    type: String,
    enum: ["Per Session", "Monthly", "Quarterly"],
    default: "Per Session",
  },
  paymentMethod: {
    type: String,
    enum: ["Cash", "Insurance", "Credit"],
    required: true,
  },
  insuranceDetails: {
    provider: { type: String },
    policyNumber: { type: String },
    claimNumber: { type: String },
  },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number },
  billingStatus: {
    type: String,
    enum: ["Pending", "Paid", "Partially Paid", "Overdue"],
    default: "Pending",
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    // required: true,
  },
});

// Alerts Schema for Dialysis
const dialysisAlertSchema = new mongoose.Schema({
  dialysisPatientId: { type: String, required: true },
  alertType: {
    type: String,
    enum: [
      "Missed Session",
      "Lab Test Due",
      "Machine Service",
      "Access Maintenance",
    ],
    required: true,
  },
  alertMessage: { type: String, required: true },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium",
  },
  scheduledDate: { type: Date },
  isResolved: { type: Boolean, default: false },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Machine Assignment Schema
const dialysisMachineSchema = new mongoose.Schema({
  machineId: { type: String, unique: true, required: true },
  machineName: { type: String, required: true },
  manufacturer: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  installationDate: { type: Date },
  lastServiceDate: { type: Date },
  nextServiceDue: { type: Date },
  status: {
    type: String,
    enum: ["Active", "Under Maintenance", "Out of Service"],
    default: "Active",
  },
  currentSession: {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "DialysisSession" },
    patientId: { type: String },
    startTime: { type: Date },
  },
  usageLogs: [
    {
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DialysisSession",
      },
      patientId: { type: String },
      usageDate: { type: Date },
      duration: { type: Number },
    },
  ],
  maintenanceLogs: [
    {
      date: { type: Date },
      type: { type: String },
      description: { type: String },
      performedBy: { type: String },
      cost: { type: Number },
    },
  ],
});

// Inventory Schema for Dialysis Consumables
const dialysisInventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemCode: { type: String, unique: true, required: true },
  category: {
    type: String,
    enum: [
      "Dialyzer",
      "Blood Lines",
      "Heparin",
      "Saline",
      "Medications",
      "Other",
    ],
    required: true,
  },
  currentStock: { type: Number, required: true },
  minimumStock: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  supplier: { type: String },
  expiryDate: { type: Date },
  lastRestocked: { type: Date },
  usageRecords: [
    {
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DialysisSession",
      },
      patientId: { type: String },
      quantityUsed: { type: Number },
      usageDate: { type: Date },
    },
  ],
});

// Create Models
const DialysisRegistration = mongoose.model(
  "DialysisRegistration",
  dialysisRegistrationSchema
);
const DialysisSession = mongoose.model(
  "DialysisSession",
  dialysisSessionSchema
);
const DialysisLabReport = mongoose.model(
  "DialysisLabReport",
  dialysisLabReportSchema
);
const DialysisMedication = mongoose.model(
  "DialysisMedication",
  dialysisMedicationSchema
);
const DialysisBilling = mongoose.model(
  "DialysisBilling",
  dialysisBillingSchema
);
const DialysisAlert = mongoose.model("DialysisAlert", dialysisAlertSchema);
const DialysisMachine = mongoose.model(
  "DialysisMachine",
  dialysisMachineSchema
);
const DialysisInventory = mongoose.model(
  "DialysisInventory",
  dialysisInventorySchema
);

export {
  DialysisRegistration,
  DialysisSession,
  DialysisLabReport,
  DialysisMedication,
  DialysisBilling,
  DialysisAlert,
  DialysisMachine,
  DialysisInventory,
};

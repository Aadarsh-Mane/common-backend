// schemas/insuranceSchema.js
import mongoose from "mongoose";

// Document schema for insurance-related documents
const insuranceDocumentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  documentType: {
    type: String,
    enum: [
      "Policy_Document",
      "ID_Proof",
      "Pre_Auth_Form",
      "Claim_Form",
      "Medical_Report",
      "Discharge_Summary",
      "Bills_Receipts",
      "Other",
    ],
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    required: true,
  },
  uploadedAt: { type: Date, default: Date.now },
  fileSize: { type: Number },
  mimeType: { type: String },
  notes: { type: String },
});

// Claim tracking schema
const claimTrackingSchema = new mongoose.Schema({
  claimNumber: { type: String, unique: true, sparse: true },
  claimType: {
    type: String,
    enum: ["Cashless", "Reimbursement"],
    required: true,
  },
  amountClaimed: { type: Number, default: 0 },
  amountApproved: { type: Number, default: 0 },
  amountRejected: { type: Number, default: 0 },
  claimStatus: {
    type: String,
    enum: [
      "Not_Filed",
      "Filed",
      "In_Process",
      "Approved",
      "Partially_Approved",
      "Rejected",
    ],
    default: "Not_Filed",
  },
  filingDate: { type: Date },
  approvalDate: { type: Date },
  rejectionReason: { type: String },
  settlementDate: { type: Date },

  // Billing integration
  linkedBills: [
    {
      billId: { type: mongoose.Schema.Types.ObjectId },
      billNumber: { type: String },
      billAmount: { type: Number },
      billDate: { type: Date },
    },
  ],

  // Follow-up tracking
  lastFollowUpDate: { type: Date },
  nextFollowUpDate: { type: Date },
  followUpNotes: [
    {
      note: { type: String },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // TPA interaction logs
  tpaInteractions: [
    {
      interactionType: {
        type: String,
        enum: [
          "Call",
          "Email",
          "Visit",
          "Document_Submission",
          "Query_Response",
        ],
      },
      date: { type: Date, default: Date.now },
      description: { type: String },
      contactPerson: { type: String },
      outcome: { type: String },
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
    },
  ],
});

// Pre-authorization schema
const preAuthSchema = new mongoose.Schema({
  preAuthNumber: { type: String, unique: true, sparse: true },
  preAuthRequired: { type: Boolean, default: false },
  preAuthStatus: {
    type: String,
    enum: [
      "Not_Applied",
      "Applied",
      "Under_Review",
      "Approved",
      "Rejected",
      "Expired",
    ],
    default: "Not_Applied",
  },
  appliedDate: { type: Date },
  approvedDate: { type: Date },
  expiryDate: { type: Date },
  approvedAmount: { type: Number },
  rejectionReason: { type: String },
  estimatedTreatmentCost: { type: Number },

  // Treatment details for pre-auth
  treatmentDetails: {
    diagnosisCode: { type: String },
    proposedTreatment: { type: String },
    expectedLengthOfStay: { type: Number },
    roomCategory: { type: String },
    doctorRecommendation: { type: String },
  },

  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },
});

// Coverage details schema
const coverageDetailsSchema = new mongoose.Schema({
  ipdCoverage: { type: Boolean, default: true },
  opdCoverage: { type: Boolean, default: false },
  emergencyCoverage: { type: Boolean, default: true },
  maternityCoverage: { type: Boolean, default: false },
  dentalCoverage: { type: Boolean, default: false },
  ophthalmologyCoverage: { type: Boolean, default: false },
  diagnosticsCoverage: { type: Boolean, default: true },

  // Room rent limits
  roomRentLimit: { type: Number },
  roomRentLimitType: {
    type: String,
    enum: ["Per_Day", "Percentage_of_Sum_Insured", "No_Limit"],
  },

  // ICU limits
  icuLimit: { type: Number },
  icuLimitType: {
    type: String,
    enum: ["Per_Day", "Percentage_of_Sum_Insured", "No_Limit"],
  },

  // Other limits
  diagnosticsLimit: { type: Number },
  pharmacyLimit: { type: Number },
  consultationLimit: { type: Number },

  // Exclusions
  exclusions: [{ type: String }],

  // Co-payment details
  coPaymentPercentage: { type: Number, default: 0 },
  deductibleAmount: { type: Number, default: 0 },
});

// Main insurance policy schema
const insurancePolicySchema = new mongoose.Schema({
  // Core policy details
  insuranceProvider: { type: String, required: true },
  policyNumber: { type: String, required: true, unique: true },
  policyholderName: { type: String, required: true },
  relationToPatient: {
    type: String,
    enum: [
      "Self",
      "Spouse",
      "Son",
      "Daughter",
      "Father",
      "Mother",
      "Brother",
      "Sister",
      "Other",
    ],
    required: true,
  },

  // Policy validity
  policyValidFrom: { type: Date, required: true },
  policyValidTo: { type: Date, required: true },
  isActive: { type: Boolean, default: true },

  // Financial details
  sumInsured: { type: Number, required: true },
  premiumAmount: { type: Number },
  sumInsuredUtilized: { type: Number, default: 0 },
  sumInsuredRemaining: {
    type: Number,
    default: function () {
      return this.sumInsured;
    },
  },

  // Policy type and processing
  policyType: {
    type: String,
    enum: ["Cashless", "Reimbursement", "Both"],
    required: true,
  },
  processingMode: {
    type: String,
    enum: ["Direct_Billing", "Reimbursement", "Hybrid"],
    default: "Direct_Billing",
  },

  // TPA details
  tpaName: { type: String },
  tpaContactNumber: { type: String },
  tpaEmail: { type: String },
  tpaAddress: { type: String },
  tpaRepresentative: { type: String },

  // Hospital network
  isNetworkHospital: { type: Boolean, default: false },
  networkTier: {
    type: String,
    enum: ["Tier_1", "Tier_2", "Tier_3", "Non_Network"],
  },

  // Coverage details
  coverageDetails: coverageDetailsSchema,

  // Documents
  documents: [insuranceDocumentSchema],

  // Pre-authorization
  preAuthorization: preAuthSchema,

  // Claims
  claims: [claimTrackingSchema],

  // Internal management
  internalNotes: [
    {
      note: { type: String },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
      isPrivate: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],

  // Status tracking
  verificationStatus: {
    type: String,
    enum: ["Pending", "Verified", "Rejected", "Incomplete"],
    default: "Pending",
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
  verifiedAt: { type: Date },

  // Reminders and alerts
  reminders: [
    {
      reminderType: {
        type: String,
        enum: [
          "Policy_Expiry",
          "Claim_Follow_Up",
          "Document_Required",
          "Pre_Auth_Expiry",
        ],
      },
      reminderDate: { type: Date },
      message: { type: String },
      isActive: { type: Boolean, default: true },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
    },
  ],

  // Audit trail
  auditTrail: [
    {
      action: { type: String, required: true },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
        // required: true,
      },
      performedAt: { type: Date, default: Date.now },
      changes: { type: mongoose.Schema.Types.Mixed },
      ipAddress: { type: String },
    },
  ],

  // Creation and modification tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    // required: true,
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },
  createdAt: { type: Date, default: Date.now },
  lastModifiedAt: { type: Date, default: Date.now },
});

// Insurance assignment to patient admission schema
const patientInsuranceSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Reference to insurance policy
  insurancePolicyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InsurancePolicy",
    required: true,
  },

  // Admission-specific insurance data
  isPrimaryInsurance: { type: Boolean, default: true },

  // Eligibility check
  eligibilityStatus: {
    type: String,
    enum: [
      "Eligible",
      "Not_Eligible",
      "Pending_Verification",
      "Partially_Eligible",
    ],
    default: "Pending_Verification",
  },
  eligibilityCheckedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
  },
  eligibilityCheckedAt: { type: Date },
  eligibilityNotes: { type: String },

  // Treatment authorization for this admission
  isAuthorizedForTreatment: { type: Boolean, default: false },
  authorizedAmount: { type: Number },

  // Billing integration for this admission
  totalBillAmount: { type: Number, default: 0 },
  insuranceCoveredAmount: { type: Number, default: 0 },
  patientPayableAmount: { type: Number, default: 0 },

  // Admission-specific claims
  admissionClaims: [
    {
      claimId: { type: mongoose.Schema.Types.ObjectId },
      claimAmount: { type: Number },
      claimStatus: { type: String },
    },
  ],

  // Status for this admission
  admissionInsuranceStatus: {
    type: String,
    enum: ["Active", "Completed", "Cancelled", "Disputed"],
    default: "Active",
  },

  // Assignment details
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hospitalDoctor",
    // required: true,
  },
  assignedAt: { type: Date, default: Date.now },

  // Completion details
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
  completedAt: { type: Date },

  // Notes specific to this admission
  admissionNotes: [
    {
      note: { type: String },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "hospitalDoctor",
      },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

// Indexes for better performance
insurancePolicySchema.index({ policyNumber: 1 });
insurancePolicySchema.index({ insuranceProvider: 1 });
insurancePolicySchema.index({ policyValidTo: 1 });
insurancePolicySchema.index({ isActive: 1 });
insurancePolicySchema.index({ "claims.claimStatus": 1 });

patientInsuranceSchema.index({ patientId: 1, admissionId: 1 });
patientInsuranceSchema.index({ insurancePolicyId: 1 });
patientInsuranceSchema.index({ eligibilityStatus: 1 });

// Virtual for policy status
insurancePolicySchema.virtual("policyStatus").get(function () {
  const now = new Date();
  if (now > this.policyValidTo) return "Expired";
  if (now < this.policyValidFrom) return "Not_Active";
  if (!this.isActive) return "Inactive";
  return "Active";
});

// Virtual for remaining coverage
insurancePolicySchema.virtual("coverageRemaining").get(function () {
  return ((this.sumInsuredRemaining / this.sumInsured) * 100).toFixed(2);
});

// Middleware to update lastModifiedAt
insurancePolicySchema.pre("save", function (next) {
  this.lastModifiedAt = new Date();
  next();
});

patientInsuranceSchema.pre("save", function (next) {
  // Calculate patient payable amount
  this.patientPayableAmount =
    this.totalBillAmount - this.insuranceCoveredAmount;
  next();
});

// Methods
insurancePolicySchema.methods.addClaim = function (claimData) {
  this.claims.push(claimData);
  return this.save();
};

insurancePolicySchema.methods.updateSumInsuredUtilized = function (amount) {
  this.sumInsuredUtilized += amount;
  this.sumInsuredRemaining = this.sumInsured - this.sumInsuredUtilized;
  return this.save();
};

insurancePolicySchema.methods.addAuditEntry = function (
  action,
  performedBy,
  changes,
  ipAddress
) {
  this.auditTrail.push({
    action,
    performedBy,
    changes,
    ipAddress,
  });
  return this.save();
};

// Static methods
insurancePolicySchema.statics.findExpiringPolicies = function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    policyValidTo: { $lte: futureDate },
    isActive: true,
  });
};

insurancePolicySchema.statics.findPendingClaims = function () {
  return this.find({
    "claims.claimStatus": { $in: ["Filed", "In_Process"] },
  });
};

// Create models
const InsurancePolicy = mongoose.model(
  "InsurancePolicy",
  insurancePolicySchema
);
const PatientInsurance = mongoose.model(
  "PatientInsurance",
  patientInsuranceSchema
);

export { InsurancePolicy, PatientInsurance };

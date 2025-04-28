import mongoose from "mongoose";

// Define investigation attachment schema
const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: {
    type: String,
    enum: ["PDF", "JPG", "PNG", "MP4", "DICOM", "DOCX", "XLSX"],
    required: true,
  },
  fileUrl: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  description: { type: String },
});

// Define investigation schema
const investigationSchema = new mongoose.Schema(
  {
    // Patient references - both MongoDB ID and String ID
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    // Add a field to store the string patientId for reference
    patientIdNumber: {
      type: String,
      required: true,
    },

    // Doctor who ordered the investigation
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "hospitalDoctor",
      required: true,
    },
    doctorName: {
      type: String,
      required: true,
    },

    // Investigation metadata
    investigationType: {
      type: String,
      required: true,
      enum: [
        // Imaging types
        "X-Ray",
        "MRI",
        "CT Scan",
        "Ultrasound",
        "CT PNS",
        "Nasal Endoscopy",
        "Laryngoscopy",
        // Functional tests
        "Glucose Tolerance Test",
        "DEXA Scan",
        "VEP",
        "SSEP",
        "BAER",
        "Breath Test",
        // Lab tests
        "Blood Test",
        "Urine Test",
        // Other
        "Other",
      ],
    },

    // For 'Other' investigation types
    otherInvestigationType: { type: String },

    // Status tracking
    status: {
      type: String,
      enum: [
        "Ordered",
        "Scheduled",
        "Completed",
        "Cancelled",
        "Results Available",
      ],
      default: "Ordered",
    },

    // Dates
    orderDate: { type: Date, default: Date.now },
    scheduledDate: { type: Date },
    completionDate: { type: Date },

    // Clinical Information
    clinicalHistory: { type: String },
    reasonForInvestigation: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Routine", "Urgent", "STAT"],
      default: "Routine",
    },

    // Specific details based on investigation type
    investigationDetails: {
      // For imaging studies
      bodySite: { type: String },
      contrastUsed: { type: Boolean, default: false },
      contrastType: { type: String },

      // For functional tests
      testDuration: { type: String },
      testProtocol: { type: String },

      // For breath tests
      testSubstance: { type: String }, // For H. pylori, SIBO, etc.

      // For any test - specific parameters to track
      parameters: { type: [String] },
    },

    // Results section
    results: {
      findings: { type: String },
      impression: { type: String },
      recommendations: { type: String },
      normalRanges: { type: mongoose.Schema.Types.Mixed }, // For storing test-specific normal ranges
      numericalResults: { type: mongoose.Schema.Types.Mixed }, // For storing test values
      isAbnormal: { type: Boolean },
      reviewedBy: {
        doctorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "hospitalDoctor",
        },
        dateReviewed: { type: Date },
      },
    },

    // Files/attachments related to the investigation
    attachments: [attachmentSchema],

    // Comments and notes
    notes: [
      {
        text: { type: String },
        addedBy: {
          userId: { type: mongoose.Schema.Types.ObjectId },
          userType: {
            type: String,
            enum: ["Doctor", "Nurse", "Technician", "Admin"],
          },
          name: { type: String },
        },
        dateAdded: { type: Date, default: Date.now },
      },
    ],

    // Linking to admission record if applicable
    admissionRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient.admissionRecords",
    },

    // Tracking of who performed the investigation
    performedBy: {
      name: { type: String },
      designation: { type: String },
      facility: { type: String }, // External lab/facility if applicable
    },

    // Billing information
    billing: {
      cost: { type: Number },
      insuranceCovered: { type: Boolean, default: false },
      insuranceDetails: { type: String },
      paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Insurance Claim", "Refunded", "Waived"],
        default: "Pending",
      },
    },

    // Tags for better searchability
    tags: [{ type: String }],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Add indexes for faster queries
investigationSchema.index({ patientId: 1, orderDate: -1 });
investigationSchema.index({ patientIdNumber: 1 }); // Add index for string patient ID
investigationSchema.index({ investigationType: 1 });
investigationSchema.index({ status: 1 });
investigationSchema.index({ "performedBy.facility": 1 });

// Create a virtual for full investigation name
investigationSchema.virtual("fullInvestigationName").get(function () {
  return this.investigationType === "Other"
    ? this.otherInvestigationType
    : this.investigationType;
});

// Method to check if results are ready
investigationSchema.methods.isResultReady = function () {
  return this.status === "Results Available";
};

// Static method to find pending investigations for a patient
investigationSchema.statics.findPendingByPatient = function (patientId) {
  return this.find({
    patientIdNumber: patientId,
    status: { $in: ["Ordered", "Scheduled"] },
  }).sort({ orderDate: -1 });
};

// Export the model
const Investigation = mongoose.model("Investigation", investigationSchema);
export default Investigation;

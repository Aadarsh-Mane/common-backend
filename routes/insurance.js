// routes/insuranceRoutes.js
import express from "express";
import multer from "multer";
import insuranceController from "../controllers/insuranceController.js";

const insuranceRouter = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF, JPG, JPEG, PNG files
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, JPG, JPEG, PNG files are allowed."
        ),
        false
      );
    }
  },
});

// All routes require authentication

// ============ INSURANCE POLICY CRUD ROUTES ============

/**
 * @route   POST /api/insurance/patients/:patientId/admissions/:admissionId/policy
 * @desc    Create a new insurance policy for patient admission
 * @access  Private (Authenticated users)
 */
insuranceRouter.post(
  "/patients/:patientId/admissions/:admissionId/policy",
  insuranceController.createInsurancePolicy
);

/**
 * @route   GET /api/insurance/patients/:patientId/admissions/:admissionId/policies
 * @desc    Get all insurance policies for patient admission
 * @access  Private (Authenticated users)
 */
insuranceRouter.get(
  "/patients/:patientId/admissions/:admissionId/policies",
  insuranceController.getInsurancePolicies
);

/**
 * @route   PUT /api/insurance/policies/:policyId
 * @desc    Update insurance policy
 * @access  Private (Authenticated users)
 */
insuranceRouter.put(
  "/policies/:policyId",
  insuranceController.updateInsurancePolicy
);
insuranceRouter.get(
  "/getCompleteInsuranceData",
  insuranceController.getCompleteInsuranceData
);

/**
 * @route   DELETE /api/insurance/policies/:policyId
 * @desc    Delete insurance policy (soft delete)
 * @access  Private (Authenticated users)
 */
insuranceRouter.delete(
  "/policies/:policyId",
  insuranceController.deleteInsurancePolicy
);

// ============ PRE-AUTHORIZATION ROUTES ============

/**
 * @route   POST /api/insurance/policies/:policyId/pre-auth
 * @desc    Apply for pre-authorization
 * @access  Private (Authenticated users)
 */
insuranceRouter.post(
  "/policies/:policyId/pre-auth",
  insuranceController.applyPreAuthorization
);

/**
 * @route   PUT /api/insurance/policies/:policyId/pre-auth/status
 * @desc    Update pre-authorization status
 * @access  Private (Authenticated users)
 */
insuranceRouter.put(
  "/policies/:policyId/pre-auth/status",
  insuranceController.updatePreAuthStatus
);

// ============ CLAIMS MANAGEMENT ROUTES ============

/**
 * @route   POST /api/insurance/policies/:policyId/claims
 * @desc    File a new insurance claim
 * @access  Private (Authenticated users)
 */
insuranceRouter.post(
  "/policies/:policyId/claims",
  insuranceController.fileClaim
);

/**
 * @route   PUT /api/insurance/policies/:policyId/claims/:claimId/status
 * @desc    Update claim status
 * @access  Private (Authenticated users)
 */
insuranceRouter.put(
  "/policies/:policyId/claims/:claimId/status",
  insuranceController.updateClaimStatus
);

// ============ DOCUMENT MANAGEMENT ROUTES ============

/**
 * @route   POST /api/insurance/policies/:policyId/documents
 * @desc    Upload insurance document
 * @access  Private (Authenticated users)
 */
insuranceRouter.post(
  "/policies/:policyId/documents",
  upload.single("document"),
  insuranceController.uploadDocument
);

/**
 * @route   GET /api/insurance/policies/:policyId/documents
 * @desc    Get insurance documents
 * @access  Private (Authenticated users)
 * @query   documentType - Filter by document type (optional)
 */
insuranceRouter.get(
  "/policies/:policyId/documents",
  insuranceController.getDocuments
);

// ============ ELIGIBILITY AND VERIFICATION ROUTES ============

/**
 * @route   GET /api/insurance/patients/:patientId/admissions/:admissionId/eligibility
 * @desc    Check insurance eligibility for patient admission
 * @access  Private (Authenticated users)
 */
insuranceRouter.get(
  "/patients/:patientId/admissions/:admissionId/eligibility",
  insuranceController.checkEligibility
);

// ============ REPORTING AND ANALYTICS ROUTES ============

/**
 * @route   GET /api/insurance/patients/:patientId/admissions/:admissionId/report
 * @desc    Generate insurance summary report
 * @access  Private (Authenticated users)
 * @query   reportType - Type of report (summary, detailed, claims)
 */
insuranceRouter.get(
  "/patients/:patientId/admissions/:admissionId/report",
  insuranceController.generateInsuranceSummaryReport
);

/**
 * @route   GET /api/insurance/dashboard
 * @desc    Get insurance dashboard data
 * @access  Private (Authenticated users)
 * @query   timeFrame - Time frame in days (default: 30)
 */
insuranceRouter.get("/dashboard", insuranceController.getDashboardData);

// ============ SEARCH AND FILTER ROUTES ============

/**
 * @route   GET /api/insurance/policies/search
 * @desc    Search insurance policies
 * @access  Private (Authenticated users)
 * @query   searchTerm - Search term for policy number, holder name, provider
 * @query   insuranceProvider - Filter by insurance provider
 * @query   claimStatus - Filter by claim status
 * @query   policyStatus - Filter by policy status (Active, Expired, Inactive)
 * @query   page - Page number for pagination (default: 1)
 * @query   limit - Number of results per page (default: 10)
 */
insuranceRouter.get("/policies/search", insuranceController.searchPolicies);

// ============ REMINDERS AND ALERTS ROUTES ============

/**
 * @route   POST /api/insurance/policies/:policyId/reminders
 * @desc    Add reminder for insurance policy
 * @access  Private (Authenticated users)
 */
insuranceRouter.post(
  "/policies/:policyId/reminders",
  insuranceController.addReminder
);

/**
 * @route   GET /api/insurance/reminders/active
 * @desc    Get active reminders
 * @access  Private (Authenticated users)
 * @query   upcomingDays - Number of upcoming days to check (default: 7)
 */
insuranceRouter.get(
  "/reminders/active",
  insuranceController.getActiveReminders
);

// ============ BULK OPERATIONS ROUTES ============

/**
 * @route   POST /api/insurance/policies/bulk-update
 * @desc    Bulk update insurance policies
 * @access  Private (Authenticated users)
 */
insuranceRouter.post("/policies/bulk-update", async (req, res) => {
  try {
    const { policyIds, updateData } = req.body;

    if (!policyIds || !Array.isArray(policyIds) || policyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Policy IDs array is required",
      });
    }

    const { InsurancePolicy } = await import("../schemas/insuranceSchema.js");

    const result = await InsurancePolicy.updateMany(
      { _id: { $in: policyIds } },
      {
        ...updateData,
        lastModifiedBy: req.userId,
        lastModifiedAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} policies updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform bulk update",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance/export/policies
 * @desc    Export insurance policies data
 * @access  Private (Authenticated users)
 * @query   format - Export format (excel, csv, pdf)
 * @query   filters - JSON string of filters to apply
 */
insuranceRouter.get("/export/policies", async (req, res) => {
  try {
    const { format = "excel", filters } = req.query;
    let query = {};

    if (filters) {
      try {
        query = JSON.parse(filters);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: "Invalid filters format",
        });
      }
    }

    const { InsurancePolicy } = await import("../schemas/insuranceSchema.js");

    const policies = await InsurancePolicy.find(query)
      .populate("createdBy", "name")
      .populate("lastModifiedBy", "name")
      .lean();

    // For simplicity, return JSON data
    // In production, you'd want to format this as Excel/CSV/PDF
    res.status(200).json({
      success: true,
      message: `Exported ${policies.length} policies`,
      data: policies,
      exportInfo: {
        format,
        count: policies.length,
        exportedAt: new Date(),
        exportedBy: req.userId,
      },
    });
  } catch (error) {
    console.error("Export policies error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export policies",
      error: error.message,
    });
  }
});

// ============ STATISTICS ROUTES ============

/**
 * @route   GET /api/insurance/statistics/claims
 * @desc    Get claims statistics
 * @access  Private (Authenticated users)
 */
insuranceRouter.get("/statistics/claims", async (req, res) => {
  try {
    const { InsurancePolicy } = await import("../schemas/insuranceSchema.js");

    const claimStats = await InsurancePolicy.aggregate([
      { $unwind: "$claims" },
      {
        $group: {
          _id: {
            status: "$claims.claimStatus",
            provider: "$insuranceProvider",
          },
          count: { $sum: 1 },
          totalClaimed: { $sum: "$claims.amountClaimed" },
          totalApproved: { $sum: "$claims.amountApproved" },
          avgProcessingTime: {
            $avg: {
              $cond: [
                { $and: ["$claims.filingDate", "$claims.approvalDate"] },
                {
                  $divide: [
                    {
                      $subtract: ["$claims.approvalDate", "$claims.filingDate"],
                    },
                    1000 * 60 * 60 * 24, // Convert to days
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.provider",
          statistics: {
            $push: {
              status: "$_id.status",
              count: "$count",
              totalClaimed: "$totalClaimed",
              totalApproved: "$totalApproved",
              avgProcessingTime: "$avgProcessingTime",
            },
          },
          totalClaims: { $sum: "$count" },
          totalAmountClaimed: { $sum: "$totalClaimed" },
          totalAmountApproved: { $sum: "$totalApproved" },
        },
      },
      { $sort: { totalClaims: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: claimStats,
    });
  } catch (error) {
    console.error("Get claims statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch claims statistics",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance/statistics/providers
 * @desc    Get insurance providers statistics
 * @access  Private (Authenticated users)
 */
insuranceRouter.get("/statistics/providers", async (req, res) => {
  try {
    const { InsurancePolicy } = await import("../schemas/insuranceSchema.js");

    const providerStats = await InsurancePolicy.aggregate([
      {
        $group: {
          _id: "$insuranceProvider",
          totalPolicies: { $sum: 1 },
          activePolicies: {
            $sum: {
              $cond: [
                {
                  $and: [
                    "$isActive",
                    { $gte: ["$policyValidTo", new Date()] },
                    { $lte: ["$policyValidFrom", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalSumInsured: { $sum: "$sumInsured" },
          totalUtilized: { $sum: "$sumInsuredUtilized" },
          averageSumInsured: { $avg: "$sumInsured" },
          totalClaims: { $sum: { $size: "$claims" } },
          networkHospitals: {
            $sum: {
              $cond: ["$isNetworkHospital", 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          utilizationRate: {
            $multiply: [
              { $divide: ["$totalUtilized", "$totalSumInsured"] },
              100,
            ],
          },
        },
      },
      { $sort: { totalPolicies: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: providerStats,
    });
  } catch (error) {
    console.error("Get provider statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch provider statistics",
      error: error.message,
    });
  }
});

// Error handling middleware for multer
insuranceRouter.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB.",
      });
    }
  }

  if (
    error.message ===
    "Invalid file type. Only PDF, JPG, JPEG, PNG files are allowed."
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
});

export default insuranceRouter;

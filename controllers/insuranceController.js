// controllers/insuranceController.js
import {
  InsurancePolicy,
  PatientInsurance,
} from "../models/insuranceSchema.js";
import patientSchema from "../models/patientSchema.js";
import PatientHistory from "../models/patientHistorySchema.js";
import { generatePdf } from "../services/pdfGenerator.js";
import { uploadToDrive, uploadToCloudinary } from "../services/uploader.js";
import {
  generateInsuranceReport,
  generateClaimReport,
} from "../utils/insurancePdfStructure.js";

class InsuranceController {
  // CRUD Operations for Insurance Policies

  /**
   * Create a new insurance policy
   */
  async createInsurancePolicy(req, res) {
    try {
      const { patientId, admissionId } = req.params;
      const insuranceData = req.body;

      // Validate patient and admission
      const patient = await patientSchema.findOne({ patientId });
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      const admission = patient.admissionRecords.id(admissionId);
      if (!admission) {
        return res.status(404).json({
          success: false,
          message: "Admission record not found",
        });
      }

      // Check if policy already exists
      const existingPolicy = await InsurancePolicy.findOne({
        policyNumber: insuranceData.policyNumber,
      });

      if (existingPolicy) {
        return res.status(400).json({
          success: false,
          message: "Policy number already exists",
        });
      }

      // Create insurance policy
      const insurancePolicy = new InsurancePolicy({
        ...insuranceData,
        createdBy: req.userId,
        sumInsuredRemaining: insuranceData.sumInsured,
        auditTrail: [
          {
            action: "Policy Created",
            performedBy: req.userId,
            changes: insuranceData,
            ipAddress: req.ip,
          },
        ],
      });

      await insurancePolicy.save();

      // Assign insurance to patient admission
      const patientInsurance = new PatientInsurance({
        patientId,
        admissionId,
        insurancePolicyId: insurancePolicy._id,
        assignedBy: req.userId,
      });

      await patientInsurance.save();

      // Add audit entry
      await insurancePolicy.addAuditEntry(
        "Policy Assigned to Patient",
        req.userId,
        { patientId, admissionId },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: "Insurance policy created and assigned successfully",
        data: {
          insurancePolicy,
          patientInsurance,
        },
      });
    } catch (error) {
      console.error("Create insurance policy error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create insurance policy",
        error: error.message,
      });
    }
  }

  /**
   * Get insurance policies for a patient admission
   */
  async getInsurancePolicies(req, res) {
    try {
      const { patientId, admissionId } = req.params;

      // Get patient insurance assignments
      const patientInsurances = await PatientInsurance.find({
        patientId,
        admissionId,
      }).populate("insurancePolicyId");

      if (!patientInsurances.length) {
        return res.status(404).json({
          success: false,
          message: "No insurance policies found for this admission",
        });
      }

      res.status(200).json({
        success: true,
        data: patientInsurances,
      });
    } catch (error) {
      console.error("Get insurance policies error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch insurance policies",
        error: error.message,
      });
    }
  }

  /**
   * Update insurance policy
   */
  async updateInsurancePolicy(req, res) {
    try {
      const { policyId } = req.params;
      const updateData = req.body;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      // Store old values for audit
      const oldValues = insurancePolicy.toObject();

      // Update policy
      Object.assign(insurancePolicy, updateData);
      insurancePolicy.lastModifiedBy = req.userId;

      // Add audit entry
      await insurancePolicy.addAuditEntry(
        "Policy Updated",
        req.userId,
        { oldValues, newValues: updateData },
        req.ip
      );

      await insurancePolicy.save();

      res.status(200).json({
        success: true,
        message: "Insurance policy updated successfully",
        data: insurancePolicy,
      });
    } catch (error) {
      console.error("Update insurance policy error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update insurance policy",
        error: error.message,
      });
    }
  }

  /**
   * Delete insurance policy
   */
  async deleteInsurancePolicy(req, res) {
    try {
      const { policyId } = req.params;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      // Check if there are active claims
      const activeClaims = insurancePolicy.claims.filter(
        (claim) => !["Approved", "Rejected"].includes(claim.claimStatus)
      );

      if (activeClaims.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete policy with active claims",
        });
      }

      // Soft delete - mark as inactive instead of actual deletion
      insurancePolicy.isActive = false;
      await insurancePolicy.addAuditEntry(
        "Policy Deleted",
        req.userId,
        { reason: req.body.reason || "No reason provided" },
        req.ip
      );
      await insurancePolicy.save();

      // Update patient insurance assignments
      await PatientInsurance.updateMany(
        { insurancePolicyId: policyId },
        { admissionInsuranceStatus: "Cancelled" }
      );

      res.status(200).json({
        success: true,
        message: "Insurance policy deleted successfully",
      });
    } catch (error) {
      console.error("Delete insurance policy error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete insurance policy",
        error: error.message,
      });
    }
  }

  // Pre-Authorization Management

  /**
   * Apply for pre-authorization
   */
  async applyPreAuthorization(req, res) {
    try {
      const { policyId } = req.params;
      const preAuthData = req.body;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      // Generate pre-auth number
      const preAuthNumber = `PA${Date.now()}`;

      // Update pre-authorization details
      insurancePolicy.preAuthorization = {
        ...preAuthData,
        preAuthNumber,
        preAuthStatus: "Applied",
        appliedDate: new Date(),
        appliedBy: req.userId,
      };

      await insurancePolicy.addAuditEntry(
        "Pre-Authorization Applied",
        req.userId,
        preAuthData,
        req.ip
      );

      await insurancePolicy.save();

      res.status(200).json({
        success: true,
        message: "Pre-authorization applied successfully",
        data: {
          preAuthNumber,
          preAuthorization: insurancePolicy.preAuthorization,
        },
      });
    } catch (error) {
      console.error("Apply pre-authorization error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply pre-authorization",
        error: error.message,
      });
    }
  }

  /**
   * Update pre-authorization status
   */
  async updatePreAuthStatus(req, res) {
    try {
      const { policyId } = req.params;
      const { preAuthStatus, approvedAmount, rejectionReason, expiryDate } =
        req.body;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      // Update pre-auth status
      insurancePolicy.preAuthorization.preAuthStatus = preAuthStatus;

      if (preAuthStatus === "Approved") {
        insurancePolicy.preAuthorization.approvedDate = new Date();
        insurancePolicy.preAuthorization.approvedAmount = approvedAmount;
        insurancePolicy.preAuthorization.expiryDate = expiryDate;
      } else if (preAuthStatus === "Rejected") {
        insurancePolicy.preAuthorization.rejectionReason = rejectionReason;
      }

      await insurancePolicy.addAuditEntry(
        "Pre-Authorization Status Updated",
        req.userId,
        { preAuthStatus, approvedAmount, rejectionReason },
        req.ip
      );

      await insurancePolicy.save();

      res.status(200).json({
        success: true,
        message: "Pre-authorization status updated successfully",
        data: insurancePolicy.preAuthorization,
      });
    } catch (error) {
      console.error("Update pre-auth status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update pre-authorization status",
        error: error.message,
      });
    }
  }

  // Claims Management

  /**
   * File a new claim
   */
  async fileClaim(req, res) {
    try {
      const { policyId } = req.params;
      const claimData = req.body;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      // Generate claim number
      const claimNumber = `CLM${Date.now()}`;

      // Create claim
      const newClaim = {
        claimNumber,
        claimType: claimData.claimType,
        amountClaimed: claimData.amountClaimed,
        claimStatus: "Filed",
        filingDate: new Date(),
        linkedBills: claimData.linkedBills || [],
      };

      insurancePolicy.claims.push(newClaim);

      // Update sum insured if applicable
      if (claimData.claimType === "Cashless") {
        await insurancePolicy.updateSumInsuredUtilized(claimData.amountClaimed);
      }

      await insurancePolicy.addAuditEntry(
        "Claim Filed",
        req.userId,
        newClaim,
        req.ip
      );

      await insurancePolicy.save();

      res.status(201).json({
        success: true,
        message: "Claim filed successfully",
        data: {
          claimNumber,
          claim: newClaim,
        },
      });
    } catch (error) {
      console.error("File claim error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to file claim",
        error: error.message,
      });
    }
  }

  /**
   * Update claim status
   */
  async updateClaimStatus(req, res) {
    try {
      const { policyId, claimId } = req.params;
      const { claimStatus, amountApproved, amountRejected, rejectionReason } =
        req.body;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      const claim = insurancePolicy.claims.id(claimId);
      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Claim not found",
        });
      }

      // Update claim status
      claim.claimStatus = claimStatus;

      if (claimStatus === "Approved") {
        claim.amountApproved = amountApproved;
        claim.approvalDate = new Date();
      } else if (claimStatus === "Rejected") {
        claim.amountRejected = amountRejected;
        claim.rejectionReason = rejectionReason;
      } else if (claimStatus === "Partially_Approved") {
        claim.amountApproved = amountApproved;
        claim.amountRejected = amountRejected;
        claim.approvalDate = new Date();
      }

      await insurancePolicy.addAuditEntry(
        "Claim Status Updated",
        req.userId,
        { claimId, claimStatus, amountApproved, amountRejected },
        req.ip
      );

      await insurancePolicy.save();

      res.status(200).json({
        success: true,
        message: "Claim status updated successfully",
        data: claim,
      });
    } catch (error) {
      console.error("Update claim status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update claim status",
        error: error.message,
      });
    }
  }

  // Document Management

  /**
   * Upload insurance document
   */
  async uploadDocument(req, res) {
    try {
      const { policyId } = req.params;
      const { documentType, notes } = req.body;
      const file = req.file; // Assuming multer middleware

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      // Upload to cloud storage
      const uploadUrl = await uploadToCloudinary(file.buffer);

      // Create document record
      const document = {
        fileName: `${documentType}_${Date.now()}.pdf`,
        originalName: file.originalname,
        fileUrl: uploadUrl,
        documentType,
        uploadedBy: req.userId,
        fileSize: file.size,
        mimeType: file.mimetype,
        notes,
      };

      insurancePolicy.documents.push(document);

      await insurancePolicy.addAuditEntry(
        "Document Uploaded",
        req.userId,
        { documentType, fileName: document.fileName },
        req.ip
      );

      await insurancePolicy.save();

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: document,
      });
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload document",
        error: error.message,
      });
    }
  }

  /**
   * Get insurance documents
   */
  async getDocuments(req, res) {
    try {
      const { policyId } = req.params;
      const { documentType } = req.query;

      const insurancePolicy = await InsurancePolicy.findById(policyId).populate(
        "documents.uploadedBy",
        "name"
      );

      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      let documents = insurancePolicy.documents;

      if (documentType) {
        documents = documents.filter(
          (doc) => doc.documentType === documentType
        );
      }

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch documents",
        error: error.message,
      });
    }
  }

  // Eligibility and Verification

  /**
   * Check insurance eligibility
   */
  async checkEligibility(req, res) {
    try {
      const { patientId, admissionId } = req.params;

      const patientInsurance = await PatientInsurance.findOne({
        patientId,
        admissionId,
      }).populate("insurancePolicyId");

      if (!patientInsurance) {
        return res.status(404).json({
          success: false,
          message: "No insurance found for this admission",
        });
      }

      const policy = patientInsurance.insurancePolicyId;
      const now = new Date();

      // Check eligibility criteria
      const eligibilityChecks = {
        isPolicyActive: policy.isActive,
        isPolicyValid:
          now >= policy.policyValidFrom && now <= policy.policyValidTo,
        hasSufficientCoverage: policy.sumInsuredRemaining > 0,
        isVerified: policy.verificationStatus === "Verified",
      };

      const isEligible = Object.values(eligibilityChecks).every(
        (check) => check
      );

      // Update eligibility status
      patientInsurance.eligibilityStatus = isEligible
        ? "Eligible"
        : "Not_Eligible";
      patientInsurance.eligibilityCheckedBy = req.userId;
      patientInsurance.eligibilityCheckedAt = new Date();

      await patientInsurance.save();

      res.status(200).json({
        success: true,
        data: {
          isEligible,
          eligibilityChecks,
          policy: {
            policyNumber: policy.policyNumber,
            insuranceProvider: policy.insuranceProvider,
            sumInsured: policy.sumInsured,
            sumInsuredRemaining: policy.sumInsuredRemaining,
            policyValidTo: policy.policyValidTo,
          },
        },
      });
    } catch (error) {
      console.error("Check eligibility error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check eligibility",
        error: error.message,
      });
    }
  }

  // Reporting and Analytics

  /**
   * Generate insurance summary report
   */
  async generateInsuranceSummaryReport(req, res) {
    try {
      const { patientId, admissionId } = req.params;
      const { reportType = "summary" } = req.query;

      // Get patient data
      const patient = await patientSchema.findOne({ patientId });
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      // Get insurance data
      const patientInsurance = await PatientInsurance.findOne({
        patientId,
        admissionId,
      }).populate("insurancePolicyId");

      if (!patientInsurance) {
        return res.status(404).json({
          success: false,
          message: "No insurance found for this admission",
        });
      }

      // Generate PDF report
      const reportData = {
        patient: {
          name: patient.name,
          patientId: patient.patientId,
          age: patient.age,
          gender: patient.gender,
          contact: patient.contact,
        },
        insurance: patientInsurance.insurancePolicyId,
        admission: patient.admissionRecords.id(admissionId),
        patientInsurance,
        reportType,
        generatedAt: new Date(),
        generatedBy: req.userId,
      };

      const htmlContent = generateInsuranceReport(reportData);
      const pdfBuffer = await generatePdf(htmlContent);

      // Upload to drive
      const fileName = `Insurance_Report_${patientId}_${Date.now()}.pdf`;
      const driveLink = await uploadToDrive(
        pdfBuffer,
        fileName,
        "insurance_reports_folder_id"
      );

      res.status(200).json({
        success: true,
        message: "Insurance report generated successfully",
        data: {
          fileName,
          driveLink,
          reportData,
        },
      });
    } catch (error) {
      console.error("Generate insurance report error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate insurance report",
        error: error.message,
      });
    }
  }

  /**
   * Get insurance dashboard data
   */
  async getDashboardData(req, res) {
    try {
      const { timeFrame = "30" } = req.query; // days
      const days = parseInt(timeFrame);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get insurance statistics
      const totalPolicies = await InsurancePolicy.countDocuments({
        isActive: true,
      });
      const expiringPolicies = await InsurancePolicy.countDocuments({
        isActive: true,
        policyValidTo: {
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const claimStats = await InsurancePolicy.aggregate([
        { $unwind: "$claims" },
        {
          $group: {
            _id: "$claims.claimStatus",
            count: { $sum: 1 },
            totalAmount: { $sum: "$claims.amountClaimed" },
            approvedAmount: { $sum: "$claims.amountApproved" },
          },
        },
      ]);

      const preAuthStats = await InsurancePolicy.aggregate([
        {
          $group: {
            _id: "$preAuthorization.preAuthStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      const recentActivity = await InsurancePolicy.find({
        "auditTrail.performedAt": { $gte: startDate },
      })
        .sort({ "auditTrail.performedAt": -1 })
        .limit(10)
        .populate("auditTrail.performedBy", "name");

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalPolicies,
            expiringPolicies,
            activeClaims: claimStats.find((s) => s._id === "Filed")?.count || 0,
            pendingPreAuth:
              preAuthStats.find((s) => s._id === "Applied")?.count || 0,
          },
          claimStats,
          preAuthStats,
          recentActivity: recentActivity.map((policy) => ({
            policyNumber: policy.policyNumber,
            insuranceProvider: policy.insuranceProvider,
            lastActivity: policy.auditTrail[policy.auditTrail.length - 1],
          })),
        },
      });
    } catch (error) {
      console.error("Get dashboard data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message,
      });
    }
  }

  // Search and Filter

  /**
   * Search insurance policies
   */
  async searchPolicies(req, res) {
    try {
      const {
        searchTerm,
        insuranceProvider,
        claimStatus,
        policyStatus,
        page = 1,
        limit = 10,
      } = req.query;

      const query = {};

      if (searchTerm) {
        query.$or = [
          { policyNumber: { $regex: searchTerm, $options: "i" } },
          { policyholderName: { $regex: searchTerm, $options: "i" } },
          { insuranceProvider: { $regex: searchTerm, $options: "i" } },
        ];
      }

      if (insuranceProvider) {
        query.insuranceProvider = { $regex: insuranceProvider, $options: "i" };
      }

      if (claimStatus) {
        query["claims.claimStatus"] = claimStatus;
      }

      if (policyStatus) {
        const now = new Date();
        switch (policyStatus) {
          case "Active":
            query.isActive = true;
            query.policyValidFrom = { $lte: now };
            query.policyValidTo = { $gte: now };
            break;
          case "Expired":
            query.policyValidTo = { $lt: now };
            break;
          case "Inactive":
            query.isActive = false;
            break;
        }
      }

      const skip = (page - 1) * limit;

      const policies = await InsurancePolicy.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .populate("createdBy", "name")
        .populate("lastModifiedBy", "name");

      const total = await InsurancePolicy.countDocuments(query);

      res.status(200).json({
        success: true,
        data: {
          policies,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Search policies error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search policies",
        error: error.message,
      });
    }
  }

  // Reminders and Alerts

  /**
   * Add reminder
   */
  async addReminder(req, res) {
    try {
      const { policyId } = req.params;
      const { reminderType, reminderDate, message } = req.body;

      const insurancePolicy = await InsurancePolicy.findById(policyId);
      if (!insurancePolicy) {
        return res.status(404).json({
          success: false,
          message: "Insurance policy not found",
        });
      }

      const reminder = {
        reminderType,
        reminderDate: new Date(reminderDate),
        message,
        createdBy: req.userId,
      };

      insurancePolicy.reminders.push(reminder);

      await insurancePolicy.addAuditEntry(
        "Reminder Added",
        req.userId,
        reminder,
        req.ip
      );

      await insurancePolicy.save();

      res.status(201).json({
        success: true,
        message: "Reminder added successfully",
        data: reminder,
      });
    } catch (error) {
      console.error("Add reminder error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add reminder",
        error: error.message,
      });
    }
  }

  /**
   * Get active reminders
   */
  async getActiveReminders(req, res) {
    try {
      const { upcomingDays = 7 } = req.query;
      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + parseInt(upcomingDays));

      const policies = await InsurancePolicy.find({
        "reminders.isActive": true,
        "reminders.reminderDate": { $lte: upcomingDate },
      })
        .populate("reminders.createdBy", "name")
        .select("policyNumber insuranceProvider reminders");

      const activeReminders = [];

      policies.forEach((policy) => {
        policy.reminders
          .filter(
            (reminder) =>
              reminder.isActive && reminder.reminderDate <= upcomingDate
          )
          .forEach((reminder) => {
            activeReminders.push({
              policyId: policy._id,
              policyNumber: policy.policyNumber,
              insuranceProvider: policy.insuranceProvider,
              reminder,
            });
          });
      });

      // Sort by reminder date
      activeReminders.sort(
        (a, b) =>
          new Date(a.reminder.reminderDate) - new Date(b.reminder.reminderDate)
      );

      res.status(200).json({
        success: true,
        data: activeReminders,
      });
    } catch (error) {
      console.error("Get active reminders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active reminders",
        error: error.message,
      });
    }
  }
  // controllers/completeInsuranceController.js

  /**
   * Get complete insurance system data with all relationships
   * @route GET /api/insurance/complete-data
   */
  async getCompleteInsuranceData(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        searchTerm,
        insuranceProvider,
        policyStatus,
        claimStatus,
        preAuthStatus,
        verificationStatus,
        patientId,
        admissionId,
        includeHistory = false,
      } = req.query;

      // Build query
      const query = {};

      if (searchTerm) {
        query.$or = [
          { policyNumber: { $regex: searchTerm, $options: "i" } },
          { policyholderName: { $regex: searchTerm, $options: "i" } },
          { insuranceProvider: { $regex: searchTerm, $options: "i" } },
        ];
      }

      if (insuranceProvider) {
        query.insuranceProvider = { $regex: insuranceProvider, $options: "i" };
      }

      if (verificationStatus) {
        query.verificationStatus = verificationStatus;
      }

      if (claimStatus) {
        query["claims.claimStatus"] = claimStatus;
      }

      if (preAuthStatus) {
        query["preAuthorization.preAuthStatus"] = preAuthStatus;
      }

      if (policyStatus) {
        const now = new Date();
        switch (policyStatus) {
          case "Active":
            query.isActive = true;
            query.policyValidFrom = { $lte: now };
            query.policyValidTo = { $gte: now };
            break;
          case "Expired":
            query.policyValidTo = { $lt: now };
            break;
          case "Inactive":
            query.isActive = false;
            break;
        }
      }

      const skip = (page - 1) * limit;

      // Get complete insurance policies with all data
      const insurancePolicies = await InsurancePolicy.find(query)
        .populate("createdBy", "name usertype")
        .populate("lastModifiedBy", "name usertype")
        .populate("verifiedBy", "name usertype")
        .populate("preAuthorization.appliedBy", "name usertype")
        .populate("documents.uploadedBy", "name usertype")
        .populate("reminders.createdBy", "name usertype")
        .populate("internalNotes.createdBy", "name usertype")
        .populate("auditTrail.performedBy", "name usertype")
        .populate("claims.followUpNotes.createdBy", "name usertype")
        .populate("claims.tpaInteractions.recordedBy", "name usertype")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean();

      // Get patient insurance assignments for each policy
      const enrichedPolicies = await Promise.all(
        insurancePolicies.map(async (policy) => {
          // Get all patient assignments for this policy
          const patientAssignments = await PatientInsurance.find({
            insurancePolicyId: policy._id,
          })
            .populate("assignedBy", "name usertype")
            .populate("completedBy", "name usertype")
            .populate("eligibilityCheckedBy", "name usertype")
            .populate("admissionNotes.createdBy", "name usertype")
            .lean();

          // Get patient details for each assignment
          const assignmentsWithPatients = await Promise.all(
            patientAssignments.map(async (assignment) => {
              const patient = await patientSchema
                .findOne({
                  patientId: assignment.patientId,
                })
                .select("patientId name age gender contact address")
                .lean();

              // Get specific admission record
              let admissionDetails = null;
              if (patient && assignment.admissionId) {
                const admission = patient.admissionRecords?.find(
                  (record) =>
                    record._id.toString() === assignment.admissionId.toString()
                );
                if (admission) {
                  admissionDetails = {
                    _id: admission._id,
                    opdNumber: admission.opdNumber,
                    ipdNumber: admission.ipdNumber,
                    admissionDate: admission.admissionDate,
                    dischargeDate: admission.dischargeDate,
                    status: admission.status,
                    patientType: admission.patientType,
                    reasonForAdmission: admission.reasonForAdmission,
                    initialDiagnosis: admission.initialDiagnosis,
                    doctor: admission.doctor,
                    section: admission.section,
                    bedNumber: admission.bedNumber,
                    amountToBePayed: admission.amountToBePayed,
                  };
                }
              }

              return {
                ...assignment,
                patientDetails: patient,
                admissionDetails,
              };
            })
          );

          // Calculate policy statistics
          const totalClaims = policy.claims?.length || 0;
          const approvedClaims =
            policy.claims?.filter((claim) => claim.claimStatus === "Approved")
              ?.length || 0;
          const pendingClaims =
            policy.claims?.filter((claim) =>
              ["Filed", "In_Process"].includes(claim.claimStatus)
            )?.length || 0;
          const totalClaimedAmount =
            policy.claims?.reduce(
              (sum, claim) => sum + (claim.amountClaimed || 0),
              0
            ) || 0;
          const totalApprovedAmount =
            policy.claims?.reduce(
              (sum, claim) => sum + (claim.amountApproved || 0),
              0
            ) || 0;

          return {
            ...policy,
            patientAssignments: assignmentsWithPatients,
            statistics: {
              totalClaims,
              approvedClaims,
              pendingClaims,
              totalClaimedAmount,
              totalApprovedAmount,
              claimApprovalRate:
                totalClaims > 0
                  ? ((approvedClaims / totalClaims) * 100).toFixed(2)
                  : 0,
              utilizationPercentage: (
                (policy.sumInsuredUtilized / policy.sumInsured) *
                100
              ).toFixed(2),
            },
          };
        })
      );

      // Filter by specific patient or admission if requested
      let filteredPolicies = enrichedPolicies;
      if (patientId) {
        filteredPolicies = enrichedPolicies.filter((policy) =>
          policy.patientAssignments.some(
            (assignment) => assignment.patientId === patientId
          )
        );
      }

      if (admissionId) {
        filteredPolicies = enrichedPolicies.filter((policy) =>
          policy.patientAssignments.some(
            (assignment) => assignment.admissionId.toString() === admissionId
          )
        );
      }

      // Get total count
      const total = await InsurancePolicy.countDocuments(query);

      // Get overall statistics
      const overallStats = await InsurancePolicy.aggregate([
        {
          $group: {
            _id: null,
            totalPolicies: { $sum: 1 },
            totalSumInsured: { $sum: "$sumInsured" },
            totalUtilized: { $sum: "$sumInsuredUtilized" },
            averageSumInsured: { $avg: "$sumInsured" },
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
          },
        },
      ]);

      // Get provider-wise statistics
      const providerStats = await InsurancePolicy.aggregate([
        {
          $group: {
            _id: "$insuranceProvider",
            count: { $sum: 1 },
            totalCoverage: { $sum: "$sumInsured" },
            totalUtilized: { $sum: "$sumInsuredUtilized" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Get claims statistics
      const claimsStats = await InsurancePolicy.aggregate([
        { $unwind: "$claims" },
        {
          $group: {
            _id: "$claims.claimStatus",
            count: { $sum: 1 },
            totalAmount: { $sum: "$claims.amountClaimed" },
            approvedAmount: { $sum: "$claims.amountApproved" },
          },
        },
      ]);

      // Get pre-auth statistics
      const preAuthStats = await InsurancePolicy.aggregate([
        {
          $group: {
            _id: "$preAuthorization.preAuthStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get verification status statistics
      const verificationStats = await InsurancePolicy.aggregate([
        {
          $group: {
            _id: "$verificationStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get recent activities (audit trail)
      const recentActivities = await InsurancePolicy.find({
        "auditTrail.performedAt": {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      })
        .populate("auditTrail.performedBy", "name")
        .select("policyNumber insuranceProvider auditTrail")
        .sort({ "auditTrail.performedAt": -1 })
        .limit(20)
        .lean();

      // Get expiring policies (next 30 days)
      const expiringPolicies = await InsurancePolicy.find({
        isActive: true,
        policyValidTo: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
        .select("policyNumber insuranceProvider policyholderName policyValidTo")
        .sort({ policyValidTo: 1 })
        .lean();

      // Get active reminders
      const activeReminders = await InsurancePolicy.find({
        "reminders.isActive": true,
        "reminders.reminderDate": {
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
        .populate("reminders.createdBy", "name")
        .select("policyNumber insuranceProvider reminders")
        .lean();

      // Include history data if requested
      let historyData = null;
      if (includeHistory === "true") {
        historyData = await PatientHistory.find({})
          .select("patientId name history.dischargeSummary.isGenerated")
          .limit(50)
          .lean();
      }

      // Build comprehensive response
      const responseData = {
        policies: filteredPolicies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        overallStatistics: overallStats[0] || {
          totalPolicies: 0,
          totalSumInsured: 0,
          totalUtilized: 0,
          averageSumInsured: 0,
          activePolicies: 0,
        },
        providerStatistics: providerStats,
        claimsStatistics: claimsStats,
        preAuthStatistics: preAuthStats,
        verificationStatistics: verificationStats,
        recentActivities: recentActivities.map((policy) => ({
          policyNumber: policy.policyNumber,
          insuranceProvider: policy.insuranceProvider,
          activities: policy.auditTrail
            .filter(
              (activity) =>
                new Date(activity.performedAt) >=
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            )
            .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
            .slice(0, 5),
        })),
        expiringPolicies,
        activeReminders: activeReminders.map((policy) => ({
          policyNumber: policy.policyNumber,
          insuranceProvider: policy.insuranceProvider,
          reminders: policy.reminders.filter(
            (reminder) =>
              reminder.isActive &&
              new Date(reminder.reminderDate) <=
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ),
        })),
        filters: {
          searchTerm: searchTerm || null,
          insuranceProvider: insuranceProvider || null,
          policyStatus: policyStatus || null,
          claimStatus: claimStatus || null,
          preAuthStatus: preAuthStatus || null,
          verificationStatus: verificationStatus || null,
          patientId: patientId || null,
          admissionId: admissionId || null,
        },
        metadata: {
          generatedAt: new Date(),
          totalRecords: filteredPolicies.length,
          includeHistory: includeHistory === "true",
          dataCompleteness: {
            policiesWithClaims: enrichedPolicies.filter(
              (p) => p.claims?.length > 0
            ).length,
            policiesWithPreAuth: enrichedPolicies.filter(
              (p) => p.preAuthorization?.preAuthNumber
            ).length,
            policiesWithDocuments: enrichedPolicies.filter(
              (p) => p.documents?.length > 0
            ).length,
            verifiedPolicies: enrichedPolicies.filter(
              (p) => p.verificationStatus === "Verified"
            ).length,
          },
        },
      };

      // Include history if requested
      if (historyData) {
        responseData.historyData = historyData;
      }

      res.status(200).json({
        success: true,
        message: "Complete insurance data retrieved successfully",
        data: responseData,
      });
    } catch (error) {
      console.error("Get complete insurance data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve complete insurance data",
        error: error.message,
      });
    }
  }
}

export default new InsuranceController();

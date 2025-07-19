import hospitalDoctors from "../models/hospitalDoctorSchema.js";
import LabReport from "../models/labreportSchema.js";
import PatientHistory from "../models/patientHistorySchema.js";
import patientSchema from "../models/patientSchema.js";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Attendance from "../models/attendanceSchema.js";
import Nurse from "../models/nurseSchema.js";
import moment from "moment-timezone";
import axios from "axios";
import Appointment from "../models/appointmentSchema.js";
import PatientAppointment from "../models/appointmentSchema.js";
import Medicine from "../models/doctorMedicines.js";
import Investigation from "../models/investigationSchema.js";
import EmergencyMedication from "../models/nurse/emergencySchema.js";
import PatientCounter from "../models/patientCounter.js";
import { DischargeSummary } from "../models/dischargeSummarySchema.js";
import { generateCertificateHTML } from "../utils/medicalCertificate.js";
import { generatePdf } from "../services/pdfGenerator.js";
import { uploadToDrive } from "../services/uploader.js";
import { generateManualDischargeSummaryHTML } from "../utils/dischargeSummary.js";
export const getPatients = async (req, res) => {
  console.log(req.usertype);
  try {
    // Ensure only a doctor can access this route by checking the user type
    if (req.usertype !== "doctor") {
      return res
        .status(403)
        .json({ message: "Access denied. Only doctors can view patients." });
    }

    const patients = await patientSchema.find();
    res.status(200).json(patients);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching patients", error: error.message });
  }
};
// Route to admit a patient to the authenticated doctor
export const admitPatient = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Ensure the user is a doctor
    if (req.usertype !== "doctor") {
      return res
        .status(403)
        .json({ message: "Access denied. Only doctors can admit patients." });
    }

    // Retrieve the patient by ID
    const patient = await patientSchema.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const doctor = await hospitalDoctors.findById(req.userId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if the patient has any active admissions
    const hasActiveAdmission =
      patient.admissionRecords.length > 0 &&
      patient.admissionRecords[patient.admissionRecords.length - 1]
        .dischargeDate === undefined;

    if (hasActiveAdmission) {
      return res.status(400).json({
        message: `Patient ${patient.name} is already admitted. No new admission can be created until discharge.`,
      });
    }

    // Add a new admission record with the doctor’s name
    patient.admissionRecords.push({
      admissionDate: new Date(),
      doctorName: doctor.doctorName,
      dischargeDate: null, // Initialize dischargeDate as null
    });

    await patient.save();

    res.status(200).json({
      message: `Patient ${patient.name} admitted to doctor ${doctor.doctorName}`,
      patientDetails: patient,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error admitting patient", error: error.message });
  }
};

/**
 * Get pending patients assigned to the authenticated doctor with advanced filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAssignedPatients = async (req, res) => {
  try {
    const doctorId = req.userId;

    // Validate doctor ID
    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing doctor credentials",
        code: "INVALID_DOCTOR_ID",
      });
    }

    // Extract and validate query parameters
    const {
      page = 1,
      limit = 10,
      search = "",
      gender = "",
      ageMin = "",
      ageMax = "",
      city = "",
      state = "",
      patientType = "",
      sortBy = "admissionDate",
      sortOrder = "desc",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
    const skip = (pageNum - 1) * limitNum;

    // Build dynamic match conditions
    const matchConditions = {
      "admissionRecords.doctor.id": new mongoose.Types.ObjectId(doctorId),
      "admissionRecords.status": "Pending",
    };

    // Add search conditions
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchConditions.$or = [
        { name: searchRegex },
        { patientId: searchRegex },
        { contact: searchRegex },
      ];
    }

    // Add filter conditions
    if (gender) {
      matchConditions.gender = gender;
    }

    if (city) {
      matchConditions.city = new RegExp(city.trim(), "i");
    }

    if (state) {
      matchConditions.state = new RegExp(state.trim(), "i");
    }

    // Age range filter
    if (ageMin || ageMax) {
      matchConditions.age = {};
      if (ageMin) matchConditions.age.$gte = parseInt(ageMin);
      if (ageMax) matchConditions.age.$lte = parseInt(ageMax);
    }

    // Build aggregation pipeline for optimal performance
    const pipeline = [
      // Stage 1: Initial match
      { $match: matchConditions },

      // Stage 2: Unwind admission records to filter them
      { $unwind: "$admissionRecords" },

      // Stage 3: Match admission records for this doctor with pending status
      {
        $match: {
          "admissionRecords.doctor.id": new mongoose.Types.ObjectId(doctorId),
          "admissionRecords.status": "Pending",
        },
      },

      // Stage 4: Add patient type filter if specified
      ...(patientType
        ? [{ $match: { "admissionRecords.patientType": patientType } }]
        : []),

      // Stage 5: Add date range filter if specified
      ...(dateFrom || dateTo
        ? [
            {
              $match: {
                "admissionRecords.admissionDate": {
                  ...(dateFrom && { $gte: new Date(dateFrom) }),
                  ...(dateTo && { $lte: new Date(dateTo) }),
                },
              },
            },
          ]
        : []),

      // Stage 6: Group back by patient
      {
        $group: {
          _id: "$_id",
          patientId: { $first: "$patientId" },
          name: { $first: "$name" },
          age: { $first: "$age" },
          gender: { $first: "$gender" },
          contact: { $first: "$contact" },
          address: { $first: "$address" },
          city: { $first: "$city" },
          state: { $first: "$state" },
          country: { $first: "$country" },
          dob: { $first: "$dob" },
          imageUrl: { $first: "$imageUrl" },
          pendingAmount: { $first: "$pendingAmount" },
          admissionRecords: { $push: "$admissionRecords" },
        },
      },

      // Stage 7: Add computed fields
      {
        $addFields: {
          totalPendingAdmissions: { $size: "$admissionRecords" },
          latestAdmissionDate: { $max: "$admissionRecords.admissionDate" },
          earliestAdmissionDate: { $min: "$admissionRecords.admissionDate" },
        },
      },

      // Stage 8: Sort
      {
        $sort: {
          [sortBy === "admissionDate" ? "latestAdmissionDate" : sortBy]:
            sortOrder === "desc" ? -1 : 1,
        },
      },

      // Stage 9: Facet for pagination and count
      {
        $facet: {
          patients: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    // Execute aggregation pipeline
    const [result] = await patientSchema.aggregate(pipeline);

    const patients = result.patients || [];
    const totalCount = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Performance metrics
    const responseTime = Date.now();

    // Build response with metadata
    const response = {
      success: true,
      message: "Pending patients retrieved successfully",
      data: {
        patients,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
          limit: limitNum,
        },
        filters: {
          search: search || null,
          gender: gender || null,
          ageRange: {
            min: ageMin || null,
            max: ageMax || null,
          },
          location: {
            city: city || null,
            state: state || null,
          },
          patientType: patientType || null,
          dateRange: {
            from: dateFrom || null,
            to: dateTo || null,
          },
        },
        sorting: {
          sortBy,
          sortOrder,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Add performance warning for large datasets
    if (totalCount > 1000) {
      response.warning =
        "Large dataset detected. Consider using more specific filters for better performance.";
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error retrieving pending patients:", {
      doctorId: req.userId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Determine error type and response
    let statusCode = 500;
    let errorMessage = "Internal server error occurred";
    let errorCode = "INTERNAL_ERROR";

    if (error.name === "CastError") {
      statusCode = 400;
      errorMessage = "Invalid parameter format";
      errorCode = "INVALID_PARAMETER";
    } else if (error.name === "ValidationError") {
      statusCode = 400;
      errorMessage = "Validation error";
      errorCode = "VALIDATION_ERROR";
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: errorCode,
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        stack: error.stack,
      }),
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get available filter options for pending patients
 * This endpoint helps frontend build dynamic filter UI
 */
export const getPendingPatientsFilterOptions = async (req, res) => {
  try {
    const doctorId = req.userId;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid doctor credentials",
      });
    }

    const filterOptions = await patientSchema.aggregate([
      {
        $match: {
          "admissionRecords.doctor.id": new mongoose.Types.ObjectId(doctorId),
          "admissionRecords.status": "Pending",
        },
      },
      {
        $group: {
          _id: null,
          genders: { $addToSet: "$gender" },
          cities: { $addToSet: "$city" },
          states: { $addToSet: "$state" },
          countries: { $addToSet: "$country" },
          ageRange: {
            $push: {
              min: { $min: "$age" },
              max: { $max: "$age" },
            },
          },
          patientTypes: { $addToSet: "$admissionRecords.patientType" },
        },
      },
      {
        $project: {
          _id: 0,
          genders: {
            $filter: { input: "$genders", cond: { $ne: ["$$this", null] } },
          },
          cities: {
            $filter: { input: "$cities", cond: { $ne: ["$$this", null] } },
          },
          states: {
            $filter: { input: "$states", cond: { $ne: ["$$this", null] } },
          },
          countries: {
            $filter: { input: "$countries", cond: { $ne: ["$$this", null] } },
          },
          ageRange: {
            min: { $min: "$ageRange.min" },
            max: { $max: "$ageRange.max" },
          },
          patientTypes: {
            $filter: {
              input: "$patientTypes",
              cond: { $ne: ["$$this", null] },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: filterOptions[0] || {
        genders: [],
        cities: [],
        states: [],
        countries: [],
        ageRange: { min: 0, max: 100 },
        patientTypes: [],
      },
    });
  } catch (error) {
    console.error("Error getting filter options:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving filter options",
    });
  }
};

/**
 * Get pending patients statistics for dashboard
 */
export const getPendingPatientsStats = async (req, res) => {
  try {
    const doctorId = req.userId;

    if (!doctorId || !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid doctor credentials",
      });
    }

    const stats = await patientSchema.aggregate([
      {
        $match: {
          "admissionRecords.doctor.id": new mongoose.Types.ObjectId(doctorId),
          "admissionRecords.status": "Pending",
        },
      },
      { $unwind: "$admissionRecords" },
      {
        $match: {
          "admissionRecords.doctor.id": new mongoose.Types.ObjectId(doctorId),
          "admissionRecords.status": "Pending",
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: 1 },
          avgAge: { $avg: "$age" },
          genderDistribution: {
            $push: "$gender",
          },
          patientTypeDistribution: {
            $push: "$admissionRecords.patientType",
          },
          todayAdmissions: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$admissionRecords.admissionDate",
                    new Date(new Date().setHours(0, 0, 0, 0)),
                  ],
                },
                1,
                0,
              ],
            },
          },
          thisWeekAdmissions: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$admissionRecords.admissionDate",
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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

    const result = stats[0] || {
      totalPending: 0,
      avgAge: 0,
      genderDistribution: [],
      patientTypeDistribution: [],
      todayAdmissions: 0,
      thisWeekAdmissions: 0,
    };

    // Process distributions
    const genderCounts = result.genderDistribution.reduce((acc, gender) => {
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    const patientTypeCounts = result.patientTypeDistribution.reduce(
      (acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {}
    );

    res.status(200).json({
      success: true,
      data: {
        totalPending: result.totalPending,
        averageAge: Math.round(result.avgAge || 0),
        todayAdmissions: result.todayAdmissions,
        thisWeekAdmissions: result.thisWeekAdmissions,
        distributions: {
          gender: genderCounts,
          patientType: patientTypeCounts,
        },
      },
    });
  } catch (error) {
    console.error("Error getting pending patients stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving statistics",
    });
  }
};
export const getPatientDetailsForDoctor = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Ensure the user is a doctor
    if (req.usertype !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find the patient with admission records assigned to the doctor
    const patient = await patientSchema
      .findOne({
        patientId,
        "admissionRecords.doctor": req.userId, // Match admissions where this doctor is assigned
      })
      .populate("admissionRecords.doctor", "doctorName") // Populate doctor details
      .populate("admissionRecords.reports", "reportDetails") // Populate reports
      .populate("admissionRecords.followUps.nurseId", "nurseName"); // Populate follow-up nurse details

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient not found or not assigned to this doctor" });
    }

    res.status(200).json({ patient });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getDoctorProfile = async (req, res) => {
  const doctorId = req.userId; // Get doctorId from the request

  try {
    // Find the doctor by ID
    const doctorProfile = await hospitalDoctors
      .findById(doctorId)
      .select("-password"); // Exclude password for security

    // Check if doctor profile exists
    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Find patients assigned to this doctor (current admissions)
    const assignedPatients = await patientSchema.aggregate([
      // Unwind admission records to work with them individually
      { $unwind: "$admissionRecords" },
      // Match patients whose admission records reference this doctor
      {
        $match: {
          "admissionRecords.doctor.id": new mongoose.Types.ObjectId(doctorId),
          // Only include active admissions (not discharged)
          "admissionRecords.dischargeDate": { $exists: false },
        },
      },
      // Project only the needed fields
      {
        $project: {
          _id: 1,
          patientId: 1,
          name: 1,
          age: 1,
          gender: 1,
          contact: 1,
          imageUrl: 1,
          admissionId: "$admissionRecords._id",
          admissionDate: "$admissionRecords.admissionDate",
          reasonForAdmission: "$admissionRecords.reasonForAdmission",
          initialDiagnosis: "$admissionRecords.initialDiagnosis",
          bedNumber: "$admissionRecords.bedNumber",
          section: "$admissionRecords.section",
          status: "$admissionRecords.status",
        },
      },
      // Sort by admission date (newest first)
      { $sort: { admissionDate: -1 } },
    ]);

    // Find patients who have this doctor as a consultant
    const consultingPatients = await patientSchema.aggregate([
      // Unwind admission records to work with them individually
      { $unwind: "$admissionRecords" },
      // Match patients whose admission records have this doctor as a consultant
      {
        $match: {
          "admissionRecords.doctorConsultant": doctorProfile.name,
          // Only include active admissions (not discharged)
          "admissionRecords.dischargeDate": { $exists: false },
        },
      },
      // Project only the needed fields
      {
        $project: {
          _id: 1,
          patientId: 1,
          name: 1,
          age: 1,
          gender: 1,
          contact: 1,
          imageUrl: 1,
          admissionId: "$admissionRecords._id",
          admissionDate: "$admissionRecords.admissionDate",
          reasonForAdmission: "$admissionRecords.reasonForAdmission",
          initialDiagnosis: "$admissionRecords.initialDiagnosis",
          bedNumber: "$admissionRecords.bedNumber",
          section: "$admissionRecords.section",
          status: "$admissionRecords.status",
          primaryDoctor: "$admissionRecords.doctor.name",
          isConsultant: true,
        },
      },
      // Sort by admission date (newest first)
      { $sort: { admissionDate: -1 } },
    ]);

    // Get pending investigations ordered by this doctor
    const pendingInvestigations = await Investigation.find({
      doctorId: doctorId,
      status: { $in: ["Ordered", "Scheduled"] },
    })
      .sort({ orderDate: -1 })
      .populate("patientId", "name patientId")
      .limit(10); // Limit to most recent 10 for performance

    // Get investigation results that need review
    const investigationResults = await Investigation.find({
      doctorId: doctorId,
      status: "Results Available",
      "results.reviewedBy": { $exists: false }, // Results that haven't been reviewed
    })
      .sort({ completionDate: -1 })
      .populate("patientId", "name patientId")
      .limit(10); // Limit to most recent 10 for performance

    // Return doctor profile along with patient data
    return res.status(200).json({
      doctorProfile,
      patients: {
        assigned: assignedPatients,
        consulting: consultingPatients,
      },
      pendingInvestigations,
      investigationResults,
    });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return res
      .status(500)
      .json({ message: "Error fetching doctor profile", error: error.message });
  }
};
export const updateDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.userId; // Getting doctorId from authenticated user

    if (!doctorId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get updatable fields from request body
    const {
      doctorName,
      speciality,
      experience,
      department,
      phoneNumber,
      imageUrl,
      fcmToken,
    } = req.body;

    // Create an object with only the fields that are provided
    const updateFields = {};

    if (doctorName !== undefined) updateFields.doctorName = doctorName;
    if (speciality !== undefined) updateFields.speciality = speciality;
    if (experience !== undefined) updateFields.experience = experience;
    if (department !== undefined) updateFields.department = department;
    if (phoneNumber !== undefined) updateFields.phoneNumber = phoneNumber;
    if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
    if (fcmToken !== undefined) updateFields.fcmToken = fcmToken;

    // Check if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    // Find the doctor by ID and update the profile
    const updatedDoctor = await hospitalDoctors
      .findByIdAndUpdate(
        doctorId,
        { $set: updateFields },
        { new: true, runValidators: true } // Return the updated document and run schema validators
      )
      .select("-password"); // Exclude the password field from the response

    if (!updatedDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Return success response with updated doctor profile
    return res.status(200).json({
      message: "Doctor profile updated successfully",
      doctorProfile: updatedDoctor,
    });
  } catch (error) {
    console.error("Error updating doctor profile:", error);
    return res.status(500).json({
      message: "Failed to update doctor profile",
      error: error.message,
    });
  }
};

export const assignPatientToLab = async (req, res) => {
  const doctorId = req.userId;
  try {
    const { admissionId, patientId, labTestNameGivenByDoctor } = req.body;

    // Validate request fields
    if (!admissionId || !patientId || !doctorId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the patient exists
    const patient = await patientSchema.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Check if the admission record exists
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Optionally: Check for duplicate lab test assignment
    const existingLabReport = await LabReport.findOne({
      admissionId,
      labTestNameGivenByDoctor,
    });
    if (existingLabReport) {
      return res
        .status(400)
        .json({ message: "Lab test already assigned for this admission" });
    }

    // Create a new lab report assignment
    const labReport = new LabReport({
      admissionId,
      patientId,
      doctorId,
      labTestNameGivenByDoctor,
    });

    await labReport.save();

    res.status(200).json({
      message: "Patient assigned to lab successfully",
      labReport,
    });
  } catch (error) {
    console.error("Error assigning patient to lab:", error);
    res.status(500).json({
      message: "Error assigning patient to lab",
      error: error.message,
    });
  }
};
// Modified admitPatientByDoctor controller function

export const admitPatientByDoctor = async (req, res) => {
  try {
    const { admissionId, admitNote } = req.body;
    const doctorId = req.userId;
    console.log("doctor", doctorId);

    if (!admissionId) {
      return res.status(400).json({ message: "Admission ID is required" });
    }

    // Find the patient and relevant admission record
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    if (
      admissionRecord.doctor &&
      admissionRecord.doctor.id &&
      admissionRecord.doctor.id.toString() !== doctorId
    ) {
      return res.status(403).json({
        message: "You are not authorized to admit this patient",
      });
    }

    if (admissionRecord.status === "admitted") {
      return res.status(400).json({
        message: "This patient has already been admitted for this admission ID",
      });
    }

    // Get next IPD number when patient is being admitted to IPD
    const ipdNumber = await PatientCounter.getNextSequenceValue("ipdNumber");

    // Update the admission record with IPD details
    admissionRecord.status = "admitted";
    admissionRecord.admitNotes = admitNote || "General Ward";
    admissionRecord.ipdNumber = ipdNumber; // Add IPD number

    // If doctor info is not already set, you might want to add it here
    // admissionRecord.doctor = { id: doctorId, name: doctorName, usertype: "Doctor" };

    await patient.save();

    res.status(200).json({
      message: `Patient successfully admitted to IPD with IPD Number: ${ipdNumber}`,
      patient: {
        id: patient._id,
        name: patient.name,
        opdNumber: admissionRecord.opdNumber,
        ipdNumber: admissionRecord.ipdNumber,
        admissionRecord,
      },
    });
  } catch (error) {
    console.error("Error admitting patient:", error);
    res.status(500).json({
      message: "Error admitting patient",
      error: error.message,
    });
  }
};

export const getAdmittedPatientsByDoctor = async (req, res) => {
  try {
    const doctorId = req.userId; // Get doctor ID from authenticated user

    // Find all patients with admission records associated with this doctor
    const patients = await patientSchema.find({
      "admissionRecords.doctor.id": doctorId,
      "admissionRecords.status": "admitted", // Only admitted patients
    });

    if (patients.length === 0) {
      return res.status(404).json({
        message: "No admitted patients found for this doctor",
      });
    }

    // Filter admission records specifically for this doctor
    const filteredPatients = patients.map((patient) => {
      const relevantAdmissions = patient.admissionRecords.filter(
        (record) =>
          record.doctor &&
          record.doctor.id.toString() === doctorId &&
          record.status === "admitted"
      );
      return { ...patient.toObject(), admissionRecords: relevantAdmissions };
    });

    res.status(200).json({
      message: "Admitted patients retrieved successfully",
      patients: filteredPatients,
    });
  } catch (error) {
    console.error("Error retrieving admitted patients:", error);
    res.status(500).json({
      message: "Error retrieving admitted patients",
      error: error.message,
    });
  }
};

export const getPatientsAssignedByDoctor = async (req, res) => {
  const doctorId = req.userId;

  try {
    const labReports = await LabReport.find({
      doctorId,
      patientId: { $ne: null },
    })
      .populate({
        path: "patientId",
        match: { admissionRecords: { $exists: true, $not: { $size: 0 } } },
        select: "name age gender contact admissionRecords",
      })
      .populate({
        path: "doctorId",
        select: "doctorName email",
      })
      .sort({ _id: -1 });

    const filteredLabReports = labReports.filter((report) => report.patientId);

    if (!filteredLabReports || filteredLabReports.length === 0) {
      return res.status(404).json({
        message: "No patients with admission records assigned by this doctor.",
      });
    }

    // Add "return" here to ensure execution stops after sending response
    return res.status(200).json({
      message: "Patients assigned by the doctor retrieved successfully",
      labReports: filteredLabReports,
    });
  } catch (error) {
    console.error("Error retrieving patients assigned by doctor:", error);
    // Add "return" here as well
    return res
      .status(500)
      .json({ message: "Error retrieving patients", error: error.message });
  }
};

// export const dischargePatient = async (req, res) => {
//   const doctorId = req.userId;
//   const { patientId, admissionId } = req.body;
//   console.log("here is the deital", req.body);
//   if (!patientId || !admissionId || !doctorId) {
//     return res.status(400).json({ error: "Missing required parameters" });
//   }

//   try {
//     // Fetch the patient document
//     const patient = await patientSchema
//       .findOne({ patientId })
//       .populate("admissionRecords");
//     console.log(patient);
//     if (!patient) {
//       return res.status(404).json({ error: "Patient not found" });
//     }
//     console.log("Admission records:", patient.admissionRecords);

//     const admissionIndex = patient.admissionRecords.findIndex(
//       (admission) =>
//         admission._id.toString() === admissionId &&
//         admission.doctor.id.toString() === doctorId
//     );

//     if (admissionIndex === -1) {
//       console.log("Admission not found for:", {
//         patientId,
//         admissionId,
//         doctorId,
//       });
//       return res
//         .status(403)
//         .json({ error: "Unauthorized or admission not found" });
//     }
//     // Extract the admission record
//     const [admissionRecord] = patient.admissionRecords.splice(
//       admissionIndex,
//       1
//     );

//     // Mark patient as discharged
//     patient.discharged = true;

//     // Save the updated patient document
//     await patient.save();
//     const updatedPatient = await patientSchema.findOne({ patientId });
//     console.log("Final discharged status in DB:", updatedPatient.discharged);
//     // Fetch lab reports for this admission
//     const labReports = await LabReport.find({ admissionId }).exec();

//     // Add to PatientHistory
//     let patientHistory = await PatientHistory.findOne({ patientId });

//     if (!patientHistory) {
//       // Create a new history document if it doesn't exist
//       patientHistory = new PatientHistory({
//         patientId: patient.patientId,
//         name: patient.name,
//         gender: patient.gender,
//         contact: patient.contact,
//         age: patient.age,
//         history: [],
//       });
//     }
//     // Loop through each follow-up and ensure all details are included
//     const followUps = admissionRecord.followUps.map((followUp) => ({
//       ...followUp.toObject(), // Spread the follow-up data
//       // Include additional or computed values if necessary (e.g., final observations)
//     }));
//     const fourHrFollowUpSchema = admissionRecord.fourHrFollowUpSchema.map(
//       (followUp) => ({
//         ...followUp.toObject(), // Spread the follow-up data
//         // Include additional or computed values if necessary (e.g., final observations)
//       })
//     );
//     console.log("doctorConsulting:", admissionRecord.doctorConsulting);

//     // Append the admission record to the history, including lab reports
//     patientHistory.history.push({
//       admissionId,
//       admissionDate: admissionRecord.admissionDate,

//       previousRemainingAmount: patient.pendingAmount,
//       amountToBePayed: admissionRecord.amountToBePayed,
//       conditionAtDischarge: admissionRecord.conditionAtDischarge,
//       weight: admissionRecord.weight,
//       dischargeDate: new Date(),
//       reasonForAdmission: admissionRecord.reasonForAdmission,
//       symptoms: admissionRecord.symptoms,
//       initialDiagnosis: admissionRecord.initialDiagnosis,
//       doctor: admissionRecord.doctor,
//       reports: admissionRecord.reports,
//       followUps: followUps,

//       fourHrFollowUpSchema: fourHrFollowUpSchema,
//       labReports: labReports.map((report) => ({
//         labTestNameGivenByDoctor: report.labTestNameGivenByDoctor,
//         reports: report.reports,
//       })), // Add relevant lab report details
//       doctorPrescriptions: admissionRecord.doctorPrescriptions,
//       doctorConsulting: admissionRecord.doctorConsulting,
//       symptomsByDoctor: admissionRecord.symptomsByDoctor,
//       vitals: admissionRecord.vitals,
//       diagnosisByDoctor: admissionRecord.diagnosisByDoctor,
//     });

//     // Save the history document
//     await patientHistory.save();

//     // Notify the doctor about the discharge
//     notifyDoctor(doctorId, patientId, admissionRecord);

//     res.status(200).json({
//       message: "Patient discharged successfully",
//       updatedPatient: patient,
//       updatedHistory: patientHistory,
//     });
//   } catch (error) {
//     console.error("Error discharging patient:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
export const dischargePatient = async (req, res) => {
  const doctorId = req.userId;
  const { patientId, admissionId } = req.body;
  console.log("here is the detail", req.body);

  if (!patientId || !admissionId || !doctorId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Fetch the patient document
    const patient = await patientSchema
      .findOne({ patientId })
      .populate("admissionRecords");

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    console.log("Admission records:", patient.admissionRecords);

    const admissionIndex = patient.admissionRecords.findIndex(
      (admission) =>
        admission._id.toString() === admissionId &&
        admission.doctor.id.toString() === doctorId
    );

    if (admissionIndex === -1) {
      console.log("Admission not found for:", {
        patientId,
        admissionId,
        doctorId,
      });
      return res
        .status(403)
        .json({ error: "Unauthorized or admission not found" });
    }

    // Extract the admission record
    const [admissionRecord] = patient.admissionRecords.splice(
      admissionIndex,
      1
    );

    // Check if this was the patient's last admission
    if (patient.admissionRecords.length === 0) {
      patient.discharged = true;
    }

    await patient.save();

    const updatedPatient = await patientSchema.findOne({ patientId });
    console.log("Final discharged status in DB:", updatedPatient.discharged);

    // Fetch lab reports for this admission
    const labReports = await LabReport.find({ admissionId }).exec();

    // Add to PatientHistory
    let patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      patientHistory = new PatientHistory({
        patientId: patient.patientId,
        name: patient.name,
        gender: patient.gender,
        contact: patient.contact,
        age: patient.age,
        address: patient.address,
        dob: patient.dob,
        imageUrl: patient.imageUrl,
        history: [],
      });
    }

    // Process all the existing data (keeping your existing logic)
    const followUps = admissionRecord.followUps.map((followUp) => ({
      ...followUp.toObject(),
    }));

    const fourHrFollowUpSchema = admissionRecord.fourHrFollowUpSchema.map(
      (followUp) => ({
        ...followUp.toObject(),
      })
    );

    const doctorNotes =
      admissionRecord.doctorNotes?.map((note) => ({
        ...note.toObject(),
      })) || [];

    const medications =
      admissionRecord.medications?.map((medication) => ({
        ...medication.toObject(),
      })) || [];

    const ivFluids =
      admissionRecord.ivFluids?.map((fluid) => ({
        ...fluid.toObject(),
      })) || [];

    const procedures =
      admissionRecord.procedures?.map((procedure) => ({
        ...procedure.toObject(),
      })) || [];

    const specialInstructions =
      admissionRecord.specialInstructions?.map((instruction) => ({
        ...instruction.toObject(),
      })) || [];
    let dischargeSummaryHistory = null;
    if (admissionRecord.dischargeSummary) {
      const summary = admissionRecord.dischargeSummary;

      // Create historical discharge summary with archive metadata
      dischargeSummaryHistory = {
        isGenerated: summary.isGenerated,
        isDoctorGenerated: summary.isDoctorGenerated,
        fileName: summary.fileName,
        driveLink: summary.driveLink,
        generatedBy: summary.generatedBy,
        generatedAt: summary.generatedAt,
        savedAt: summary.savedAt,

        // Clinical summary data - preserved as arrays/objects
        finalDiagnosis: summary.finalDiagnosis,
        complaints: summary.complaints || [],
        pastHistory: summary.pastHistory || [],
        examFindings: summary.examFindings || [],
        generalExam: summary.generalExam || {},
        radiology: summary.radiology || [],
        pathology: summary.pathology || [],
        operation: summary.operation || {},
        treatmentGiven: summary.treatmentGiven || [],
        conditionOnDischarge: summary.conditionOnDischarge,

        // Metadata
        template: summary.template || "standard",
        version: summary.version || "1.0",

        // Historical tracking - new fields for archival
        originalAdmissionId: admissionRecord._id,
        archivedAt: new Date(),
        archiveReason: "Patient Discharged",
      };
    }

    // Create the history entry with ALL fields including OPD and IPD numbers
    const historyEntry = {
      admissionId,
      admissionDate: admissionRecord.admissionDate,
      dischargeDate: new Date(),
      status: admissionRecord.status,
      patientType: admissionRecord.patientType || "Internal",

      // Add OPD and IPD numbers to history
      opdNumber: admissionRecord.opdNumber,
      ipdNumber: admissionRecord.ipdNumber,

      admitNotes: admissionRecord.admitNotes,
      reasonForAdmission: admissionRecord.reasonForAdmission,
      doctorConsultant: admissionRecord.doctorConsultant,
      conditionAtDischarge: admissionRecord.conditionAtDischarge,
      amountToBePayed: admissionRecord.amountToBePayed,
      previousRemainingAmount: patient.pendingAmount,
      weight: admissionRecord.weight,
      symptoms: admissionRecord.symptoms,
      initialDiagnosis: admissionRecord.initialDiagnosis,
      doctor: admissionRecord.doctor,
      dischargeSummary: dischargeSummaryHistory,

      section: admissionRecord.section,
      bedNumber: admissionRecord.bedNumber,
      reports: admissionRecord.reports,

      followUps: followUps,
      fourHrFollowUpSchema: fourHrFollowUpSchema,

      labReports: labReports.map((report) => ({
        labTestNameGivenByDoctor: report.labTestNameGivenByDoctor,
        reports: report.reports,
      })),

      doctorPrescriptions: admissionRecord.doctorPrescriptions,
      doctorConsulting: admissionRecord.doctorConsulting,
      symptomsByDoctor: admissionRecord.symptomsByDoctor,
      diagnosisByDoctor: admissionRecord.diagnosisByDoctor,

      vitals: admissionRecord.vitals,

      doctorNotes: doctorNotes,
      medications: medications,
      ivFluids: ivFluids,
      procedures: procedures,
      specialInstructions: specialInstructions,
    };

    patientHistory.history.push(historyEntry);
    await patientHistory.save();

    // Notify the doctor about the discharge (implement as needed)
    // notifyDoctor(doctorId, patientId, admissionRecord);

    res.status(200).json({
      message: "Patient discharged successfully",
      updatedPatient: patient,
      updatedHistory: patientHistory,
      opdNumber: admissionRecord.opdNumber,
      ipdNumber: admissionRecord.ipdNumber,
    });
  } catch (error) {
    console.error("Error discharging patient:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// export const dischargePatient = async (req, res) => {
//   const doctorId = req.userId;
//   const {
//     patientId,
//     admissionId,
//     conditionAtDischarge,
//     finalDiagnosis,
//     dischargeInstructions,
//   } = req.body;

//   // Validation
//   if (!patientId || !admissionId || !doctorId) {
//     return res.status(400).json({
//       success: false,
//       error: "Missing required parameters: patientId, admissionId, or doctorId",
//     });
//   }

//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // Fetch patient with all admission records
//     const patient = await patientSchema
//       .findOne({ patientId })
//       .populate({
//         path: "admissionRecords",
//         populate: [
//           { path: "followUps.nurseId", select: "name" },
//           { path: "fourHrFollowUpSchema.nurseId", select: "name" },
//           { path: "doctor.id", select: "name specialization" },
//           { path: "section.id", select: "name type" },
//         ],
//       })
//       .session(session);

//     if (!patient) {
//       await session.abortTransaction();
//       return res.status(404).json({
//         success: false,
//         error: "Patient not found",
//       });
//     }

//     // Find the specific admission record
//     const admissionIndex = patient.admissionRecords.findIndex(
//       (admission) =>
//         admission._id.toString() === admissionId &&
//         admission.doctor.id._id.toString() === doctorId
//     );

//     if (admissionIndex === -1) {
//       await session.abortTransaction();
//       return res.status(403).json({
//         success: false,
//         error: "Unauthorized access or admission record not found",
//       });
//     }

//     // Extract and update the admission record
//     const admissionRecord = patient.admissionRecords[admissionIndex];

//     // Update discharge information
//     admissionRecord.conditionAtDischarge =
//       conditionAtDischarge ||
//       admissionRecord.conditionAtDischarge ||
//       "Discharged";
//     admissionRecord.diagnosisByDoctor = finalDiagnosis
//       ? [...(admissionRecord.diagnosisByDoctor || []), finalDiagnosis]
//       : admissionRecord.diagnosisByDoctor;

//     if (dischargeInstructions) {
//       admissionRecord.specialInstructions.push({
//         instruction: dischargeInstructions,
//         date: new Date().toISOString().split("T")[0],
//         time: new Date().toLocaleTimeString("en-US", { hour12: false }),
//       });
//     }

//     // Fetch all related lab reports for this admission
//     const labReports = await LabReport.find({
//       $or: [
//         { admissionId: admissionId },
//         {
//           patientId: patientId,
//           createdAt: {
//             $gte: admissionRecord.admissionDate,
//             $lte: new Date(),
//           },
//         },
//       ],
//     }).session(session);

//     // Remove the admission record from patient
//     const [dischargedAdmission] = patient.admissionRecords.splice(
//       admissionIndex,
//       1
//     );

//     // Mark patient as discharged if no more active admissions
//     if (patient.admissionRecords.length === 0) {
//       patient.discharged = true;
//     }

//     // Save updated patient document
//     await patient.save({ session });

//     // Create or update patient history
//     let patientHistory = await PatientHistory.findOne({ patientId }).session(
//       session
//     );

//     if (!patientHistory) {
//       patientHistory = new PatientHistory({
//         patientId: patient.patientId,
//         name: patient.name,
//         gender: patient.gender,
//         contact: patient.contact,
//         age: patient.age,
//         address: patient.address,
//         dob: patient.dob,
//         imageUrl: patient.imageUrl,
//         history: [],
//       });
//     }

//     // Comprehensive history entry creation
//     const historyEntry = {
//       admissionId: new mongoose.Types.ObjectId(admissionId),
//       admissionDate: dischargedAdmission.admissionDate,
//       dischargeDate: new Date(),
//       status: dischargedAdmission.status,
//       patientType: dischargedAdmission.patientType || "Internal",

//       // Admission details
//       admitNotes: dischargedAdmission.admitNotes,
//       reasonForAdmission: dischargedAdmission.reasonForAdmission,
//       doctorConsultant: dischargedAdmission.doctorConsultant || [],
//       conditionAtDischarge: dischargedAdmission.conditionAtDischarge,
//       amountToBePayed: dischargedAdmission.amountToBePayed,
//       previousRemainingAmount: patient.pendingAmount || 0,
//       weight: dischargedAdmission.weight,
//       symptoms: dischargedAdmission.symptoms,
//       initialDiagnosis: dischargedAdmission.initialDiagnosis,

//       // Doctor and facility information
//       doctor: {
//         id:
//           dischargedAdmission.doctor?.id?._id || dischargedAdmission.doctor?.id,
//         name: dischargedAdmission.doctor?.name,
//         usertype: dischargedAdmission.doctor?.usertype,
//       },
//       section: dischargedAdmission.section
//         ? {
//             id:
//               dischargedAdmission.section.id?._id ||
//               dischargedAdmission.section.id,
//             name: dischargedAdmission.section.name,
//             type: dischargedAdmission.section.type,
//           }
//         : null,
//       bedNumber: dischargedAdmission.bedNumber,

//       // Reports and references
//       reports: dischargedAdmission.reports || [],

//       // Follow-up records with complete data preservation
//       followUps:
//         dischargedAdmission.followUps?.map((followUp) => ({
//           ...followUp.toObject(),
//           nurseId: followUp.nurseId,
//           nurseName: followUp.nurseId?.name || "Unknown",
//         })) || [],

//       fourHrFollowUpSchema:
//         dischargedAdmission.fourHrFollowUpSchema?.map((followUp) => ({
//           ...followUp.toObject(),
//           nurseId: followUp.nurseId,
//           nurseName: followUp.nurseId?.name || "Unknown",
//         })) || [],

//       // Lab reports with complete data
//       labReports: labReports.map((report) => ({
//         labTestNameGivenByDoctor: report.labTestNameGivenByDoctor,
//         reports: report.reports || [],
//         requestDate: report.createdAt,
//         completedDate: report.updatedAt,
//       })),

//       // Medical records
//       doctorPrescriptions:
//         dischargedAdmission.doctorPrescriptions?.map((prescription) => ({
//           ...prescription.toObject(),
//         })) || [],

//       doctorConsulting:
//         dischargedAdmission.doctorConsulting?.map((consultation) => ({
//           ...consultation.toObject(),
//         })) || [],

//       symptomsByDoctor: dischargedAdmission.symptomsByDoctor || [],
//       diagnosisByDoctor: dischargedAdmission.diagnosisByDoctor || [],

//       // Vital signs history
//       vitals:
//         dischargedAdmission.vitals?.map((vital) => ({
//           ...vital.toObject(),
//         })) || [],

//       // Treatment records
//       doctorNotes:
//         dischargedAdmission.doctorNotes?.map((note) => ({
//           ...note.toObject(),
//         })) || [],

//       medications:
//         dischargedAdmission.medications?.map((medication) => ({
//           ...medication.toObject(),
//         })) || [],

//       ivFluids:
//         dischargedAdmission.ivFluids?.map((fluid) => ({
//           ...fluid.toObject(),
//         })) || [],

//       procedures:
//         dischargedAdmission.procedures?.map((procedure) => ({
//           ...procedure.toObject(),
//         })) || [],

//       specialInstructions:
//         dischargedAdmission.specialInstructions?.map((instruction) => ({
//           ...instruction.toObject(),
//         })) || [],
//     };

//     // Add the complete history entry
//     patientHistory.history.push(historyEntry);
//     await patientHistory.save({ session });

//     // Commit the transaction
//     await session.commitTransaction();

//     res.status(200).json({
//       success: true,
//       message: "Patient discharged successfully",
//       data: {
//         patient: {
//           patientId: patient.patientId,
//           name: patient.name,
//           discharged: patient.discharged,
//         },
//         dischargeDate: new Date(),
//         admissionId: admissionId,
//       },
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Error discharging patient:", error);

//     res.status(500).json({
//       success: false,
//       error: "Internal server error during patient discharge",
//       details:
//         process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   } finally {
//     session.endSession();
//   }
// };

export const getAllDoctorsProfiles = async (req, res) => {
  try {
    // Find all doctors' profiles
    const doctorsProfiles = await hospitalDoctors.find().select("-password"); // Exclude passwords for security

    // Check if doctors' profiles exist
    if (!doctorsProfiles || doctorsProfiles.length === 0) {
      return res.status(404).json({ message: "No doctors found" });
    }

    // Return doctors' profiles
    return res.status(200).json({ doctorsProfiles });
  } catch (error) {
    console.error("Error fetching doctors' profiles:", error);
    return res.status(500).json({
      message: "Error fetching doctors' profiles",
      error: error.message,
    });
  }
};

// Mock notification function
const notifyDoctor = (doctorId, patientId, admissionRecord) => {
  console.log(
    `Doctor ${doctorId} notified: Patient ${patientId} discharged from admission on ${admissionRecord.admissionDate}`
  );
};
export const getDischargedPatientsByDoctor = async (req, res) => {
  // const doctorId = req.userId;

  try {
    // Fetch patient history for the doctor, filtering by discharge date
    const patientsHistory = await PatientHistory.aggregate([
      {
        $unwind: "$history", // Unwind the history array to get each admission record separately
      },
      {
        $match: {
          // "history.doctor.id": new mongoose.Types.ObjectId(doctorId), // Match by doctor ID
          "history.dischargeDate": { $ne: null }, // Only include records with a discharge date
        },
      },
      {
        $project: {
          patientId: 1,
          name: 1,
          gender: 1,
          contact: 1,
          admissionId: "$history.admissionId",
          admissionDate: "$history.admissionDate",
          dischargeDate: "$history.dischargeDate",
          reasonForAdmission: "$history.reasonForAdmission",
          symptoms: "$history.symptoms",
          initialDiagnosis: "$history.initialDiagnosis",
          doctor: "$history.doctor",
          reports: "$history.reports",
          followUps: "$history.followUps",
          labReports: "$history.labReports",
        },
      },
    ]);

    if (!patientsHistory.length) {
      return res.status(404).json({ error: "No discharged patients found" });
    }

    res.status(200).json({
      message: "Discharged patients retrieved successfully",
      patientsHistory,
    });
  } catch (error) {
    console.error("Error fetching discharged patients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to generate PDF from HTML
export const getPatientHistory = async (req, res) => {
  // Create __dirname in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const { patientId } = req.params;

  try {
    // Fetch patient history
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate({
        path: "history.doctor.id",
        select: "name",
      })
      .populate({
        path: "history.labReports.reports",
        select: "labTestName reportUrl labType",
      });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient history not found" });
    }
    return res.status(200).json(patientHistory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addConsultant = async (req, res) => {
  const { patientId, admissionId, prescription } = req.body;

  try {
    // Validate request body
    if (!patientId || !admissionId || !prescription) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Find the admission record by its implicit `_id` (admissionId)
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ error: "Admission record not found" });
    }

    // Add the new prescription to the `doctorConsultant` field
    admissionRecord.doctorConsultant.push(prescription);

    // Save the updated patient document
    await patient.save();

    return res
      .status(200)
      .json({ message: "Prescription added successfully", patient });
  } catch (error) {
    console.error("Error adding prescription:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
export const fetchConsultant = async (req, res) => {
  const { admissionId } = req.params;

  if (!admissionId) {
    return res.status(400).json({ error: "Admission ID is required" });
  }

  try {
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Find the admission record with the specified ID
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord || !admissionRecord.doctorConsultant) {
      return res
        .status(404)
        .json({ error: "No prescriptions found for this admission" });
    }

    // Return the prescriptions associated with the admission
    res.status(200).json(admissionRecord.doctorConsultant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
};

// Suggestion endpoint

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let data;

// Load data asynchronously
const loadData = async () => {
  try {
    const filePath = path.resolve(__dirname, "test.json");
    const fileContent = await fs.readFile(filePath, "utf8");
    data = JSON.parse(fileContent);
    console.log(data);
  } catch (error) {
    console.error("Error reading or parsing test.json:", error);
    data = null;
  }
};

// Load data when the module is loaded
// loadData();

export const suggestions = (req, res) => {
  try {
    const query = req.query.query.toLowerCase();

    // Ensure data is defined and is an object
    if (!data || typeof data !== "object") {
      return res.status(500).json({ message: "Data source is not available" });
    }

    // Filter and return only the medicine names that match the query
    const suggestions = Object.values(data).filter(
      (item) => typeof item === "string" && item.toLowerCase().includes(query)
    );

    console.log(suggestions); // Log to verify the suggestions

    res.json(suggestions); // Send suggestions as the response
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addPrescription = async (req, res) => {
  try {
    const { patientId, admissionId, prescription } = req.body;

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add the prescription
    admission.doctorPrescriptions.push(prescription);

    // Save the updated patient document
    await patient.save();

    res
      .status(201)
      .json({ message: "Prescription added successfully", prescription });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add prescription", error: error.message });
  }
};
export const fetchPrescription = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Return the prescriptions
    res.status(200).json({ prescriptions: admission.doctorPrescriptions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch prescriptions", error: error.message });
  }
};

export const addSymptomsByDoctor = async (req, res) => {
  try {
    const { patientId, admissionId, symptoms } = req.body;
    console.log;
    if (!patientId || !admissionId || !symptoms) {
      return res.status(400).json({
        message: "Patient ID, Admission ID, and symptoms are required.",
      });
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId, "admissionRecords._id": admissionId }, // Matching patient and admission record
      { $push: { "admissionRecords.$.symptomsByDoctor": { $each: symptoms } } }, // Pushing symptoms to the specific admission
      { new: true }
    );

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or Admission not found." });
    }

    res.status(200).json({ message: "Symptoms added successfully.", patient });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
// Controller to fetch symptoms by patientId and admissionId
export const fetchSymptoms = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    console.log("checking", patientId, admissionId);
    // Validate that both patientId and admissionId are provided
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Find the patient and admission record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Extract the symptomsByDoctor field
    const symptoms = admissionRecord.symptomsByDoctor;

    res.status(200).json({ symptoms });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export const addVitals = async (req, res) => {
  try {
    const { patientId, admissionId, vitals } = req.body;

    if (!patientId || !admissionId || !vitals) {
      return res.status(400).json({
        message: "Patient ID, Admission ID, and vitals are required.",
      });
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId, "admissionRecords._id": admissionId }, // Matching patient and admission record
      { $push: { "admissionRecords.$.vitals": vitals } }, // Pushing vitals to the specific admission
      { new: true }
    );

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or Admission not found." });
    }

    res.status(200).json({ message: "Vitals added successfully.", patient });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
// Controller to fetch vitals by patientId and admissionId
export const fetchVitals = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    console.log(req.body);
    // Validate that both patientId and admissionId are provided
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Fetch the patient and admission records
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Extract the vitals
    const { vitals } = admissionRecord;

    res.status(200).json({ vitals });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export const addDiagnosisByDoctor = async (req, res) => {
  try {
    const { patientId, admissionId, diagnosis } = req.body;

    if (!patientId || !admissionId || !diagnosis) {
      return res.status(400).json({
        message: "Patient ID, Admission ID, and diagnosis are required.",
      });
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId, "admissionRecords._id": admissionId }, // Matching patient and admission record
      {
        $push: { "admissionRecords.$.diagnosisByDoctor": { $each: diagnosis } },
      }, // Pushing diagnosis to the specific admission
      { new: true }
    );

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or Admission not found." });
    }

    res.status(200).json({ message: "Diagnosis added successfully.", patient });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// Controller to fetch diagnosis by patientId and admissionId
export const fetchDiagnosis = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Validate that both patientId and admissionId are provided
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Find the patient document
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Locate the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Extract diagnosisByDoctor
    const diagnosis = admissionRecord.diagnosisByDoctor || [];

    res.status(200).json({ diagnosis });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
export const updateConditionAtDischarge = async (req, res) => {
  const { admissionId, conditionAtDischarge, amountToBePayed } = req.body;
  console.log(req.body);
  const doctorId = req.userId;

  if (!admissionId || !conditionAtDischarge) {
    return res
      .status(400)
      .json({ message: "Admission ID and condition are required." });
  }

  if (
    amountToBePayed == null ||
    isNaN(amountToBePayed) ||
    amountToBePayed < 0
  ) {
    return res
      .status(400)
      .json({ message: "Valid amountToBePayed is required." });
  }

  const validConditions = [
    "Discharged",
    "Transferred",
    "D.A.M.A.",
    "Absconded",
    "Expired",
  ];
  if (!validConditions.includes(conditionAtDischarge)) {
    return res
      .status(400)
      .json({ message: "Invalid conditionAtDischarge value." });
  }

  try {
    // Find and update the specific admission record in a single operation
    const patient = await patientSchema.findOneAndUpdate(
      {
        admissionRecords: {
          $elemMatch: {
            _id: admissionId,
            "doctor.id": doctorId,
          },
        },
      },
      {
        $set: {
          "admissionRecords.$.conditionAtDischarge": conditionAtDischarge,
          "admissionRecords.$.amountToBePayed": amountToBePayed,
        },
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({
        message:
          "Admission record not found or you are not authorized to update this record.",
      });
    }

    res.status(200).json({
      message:
        "Condition at discharge and payment amount updated successfully.",
    });
  } catch (error) {
    console.error("Error updating condition at discharge:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const addDoctorConsultant = async (req, res) => {
  try {
    const { patientId, admissionId, consulting } = req.body;
    console.log("Request Body:", req.body.consulting); // Check the structure of the incoming data
    console.log("Patient ID:", patientId, "Admission ID:", admissionId);
    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add the consulting data to the doctorConsulting array
    admission.doctorConsulting.push(consulting);

    console.log("Updated doctorConsulting:", admission.doctorConsulting); // Log to check if data is added correctly

    // Save the updated patient document
    await patient.save();

    res
      .status(201)
      .json({ message: "Consulting added successfully", consulting });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add consulting", error: error.message });
  }
};
export const getDoctorConsulting = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params; // Get parameters from the URL

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Return the doctorConsulting array
    res.status(200).json({
      message: "Doctor consulting fetched successfully",
      doctorConsulting: admission.doctorConsulting,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctor consulting",
      error: error.message,
    });
  }
};
export const deleteDoctorConsultant = async (req, res) => {
  try {
    const { patientId, admissionId, consultantId } = req.body;

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find index of the consultant entry
    const index = admission.doctorConsulting.findIndex(
      (doc) => doc._id.toString() === consultantId
    );

    if (index === -1) {
      return res.status(404).json({ message: "Doctor consultant not found" });
    }

    // Remove the consultant
    const removedConsultant = admission.doctorConsulting.splice(index, 1);

    // Save updated document
    await patient.save();

    res.status(200).json({
      message: "Doctor consultant deleted successfully",
      removedConsultant,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete doctor consultant",
      error: error.message,
    });
  }
};

export const amountToBePayed = async (req, res) => {
  try {
    const { patientId, admissionId, amount } = req.body;

    // Validate input
    if (
      !patientId ||
      !admissionId ||
      typeof amount !== "number" ||
      amount < 0
    ) {
      return res.status(400).json({ message: "Invalid input provided." });
    }

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Update the amount to be paid
    admissionRecord.amountToBePayed = amount;

    // Save the changes to the database
    await patient.save();

    res.status(200).json({
      message: "Amount updated successfully.",
      admissionRecord,
    });
  } catch (error) {
    console.error("Error updating amount to be paid:", error);
    res.status(500).json({ message: "Server error.", error });
  }
};
export const getPatientHistory1 = async (req, res) => {
  const { patientId } = req.params;

  // Validate if the patientId is provided
  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    // Fetch the patient history using the provided patientId
    const patientHistory = await PatientHistory.findOne(
      { patientId },
      {
        "history.followUps": 0, // Exclude follow-ups from the result
      }
    );

    // Check if history exists for the patient
    if (!patientHistory) {
      return res
        .status(404)
        .json({ error: `No history found for patient ID: ${patientId}` });
    }

    // Return the patient history
    res.status(200).json({
      message: "Patient history fetched successfully",
      history: patientHistory,
    });
  } catch (error) {
    console.error("Error fetching patient history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Load API key from environment variables or directly set it here
const genAI = new GoogleGenerativeAI("AIzaSyD2b5871MdBgJErszACzmBhtpLZrQe-U2k");

export const askQuestion = async (req, res) => {
  const { question } = req.body;

  try {
    // Fetch all patients dynamically from the database
    const patients = await patientSchema.find().sort({ _id: -1 });

    if (!patients || patients.length === 0) {
      return res.send("No patient records available.");
    }

    // Identify the patient mentioned in the question
    const patient = patients.find((p) =>
      question.toLowerCase().includes(p.name.toLowerCase())
    );

    if (!patient) {
      return res.send("No matching patient found for your query.");
    }

    // Check if the question is asking for prescriptions
    if (
      question.toLowerCase().includes("prescription") ||
      question.toLowerCase().includes("medicine")
    ) {
      const admissionDetails = patient.admissionRecords.map((record, index) => {
        const prescriptions = record.doctorPrescriptions.map(
          (prescription, i) => {
            const med = prescription.medicine;
            return `\n    Prescription ${i + 1}:
    - Medicine: ${med.name}
    - Morning: ${med.morning}
    - Afternoon: ${med.afternoon}
    - Night: ${med.night}
    - Comment: ${med.comment}
    - Prescribed Date: ${new Date(med.date).toLocaleDateString()}`;
          }
        );

        return `\n  Admission ${index + 1}:
  - Admission Date: ${new Date(record.admissionDate).toLocaleDateString()}
  - Discharge Status: ${record.conditionAtDischarge}
  - Reason for Admission: ${record.reasonForAdmission}
  - Prescriptions: ${
    prescriptions.length > 0 ? prescriptions.join("") : "No prescriptions found"
  }`;
      });

      const prescriptionResponse = `Prescriptions for ${patient.name}:
${
  admissionDetails.length > 0
    ? admissionDetails.join("\n")
    : "No admission records found."
}`;

      return res.send(prescriptionResponse);
    }

    // Otherwise, provide basic details
    const basicDetails = `Patient Details:
- Name: ${patient.name}
- Patient ID: ${patient.patientId}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Contact: ${patient.contact}
- Address: ${patient.address || "N/A"}
- DOB: ${patient.dob || "N/A"}
- Discharged: ${patient.discharged ? "Yes" : "No"}
- Pending Amount: ${patient.pendingAmount}`;

    return res.send(basicDetails);
  } catch (error) {
    console.error("Error processing question:", error.message);
    return res.status(500).send("Failed to process the question.");
  }
};
export const askQuestionAI = async (req, res) => {
  const { question } = req.body;

  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate content based on the question prompt
    const result = await model.generateContent(question);

    // Respond with the full result or just the AI-generated text
    return res.json({ answer: result.response.text() });
  } catch (error) {
    console.error("Error communicating with Gemini AI:", error.message);

    // Respond with an error message
    return res.status(500).json({ error: error.message });
  }
};
export const deletedPrescription = async (req, res) => {
  // app.delete("/prescriptions/:id", async (req, res) => {
  // app.delete("/doctors/deletePrescription/:patientId/:admissionId/:prescriptionId", async (req, res) => {
  const { patientId, admissionId, prescriptionId } = req.params;

  try {
    // Find the patient and remove the prescription from the specific admission record
    const updatedPatient = await patientSchema.findOneAndUpdate(
      {
        patientId: patientId,
        "admissionRecords._id": admissionId, // Match the admission record
      },
      {
        $pull: {
          "admissionRecords.$.doctorPrescriptions": { _id: prescriptionId },
        }, // Remove the prescription
      },
      { new: true } // Return the updated document
    );

    if (!updatedPatient) {
      return res.status(404).json({
        message: "Patient, admission record, or prescription not found",
      });
    }

    res.status(200).json({
      message: "Prescription deleted successfully",
      updatedPatient,
    });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deletedVitals = async (req, res) => {
  console.log("Deleting vitals");
  // app.delete("/prescriptions/:id", async (req, res) => {
  // app.delete("/doctors/deletePrescription/:patientId/:admissionId/:prescriptionId", async (req, res) => {
  const { patientId, admissionId, vitalsId } = req.params;

  try {
    // Find the patient and remove the prescription from the specific admission record
    const updatedPatient = await patientSchema.findOneAndUpdate(
      {
        patientId: patientId,
        "admissionRecords._id": admissionId, // Match the admission record
      },
      {
        $pull: {
          "admissionRecords.$.vitals": { _id: vitalsId },
        }, // Remove the prescription
      },
      { new: true } // Return the updated document
    );

    if (!updatedPatient) {
      return res.status(404).json({
        message: "Patient, admission record, or prescription not found",
      });
    }

    res.status(200).json({
      message: "Vitlas deleted successfully",
      updatedPatient,
    });
  } catch (error) {
    console.error("Error deleting vitals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const formatISTDate = (date) => {
  if (!date) return null;
  return moment(date).tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm A");
};
export const seeAllAttendees = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: "Nurse name is required" });
    }

    // Case-insensitive search
    const attendanceRecords = await Attendance.find({
      nurseName: { $regex: new RegExp(name, "i") },
    });

    if (attendanceRecords.length === 0) {
      return res
        .status(404)
        .json({ message: "No records found for this nurse" });
    }

    // Format the date fields before returning the records
    const formattedRecords = attendanceRecords.map((record) => ({
      ...record.toObject(),
      date: formatISTDate(record.date),
      checkIn: {
        ...record.checkIn,
        time: formatISTDate(record.checkIn.time),
      },
      checkOut: record.checkOut
        ? {
            ...record.checkOut,
            time: formatISTDate(record.checkOut.time),
          }
        : null,
    }));

    res.json(formattedRecords);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const getAllNurses = async (req, res) => {
  try {
    const nurses = await Nurse.find().select("nurseName -_id");
    res.json(nurses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getPatientSuggestions = async (req, res) => {
  const { patientId } = req.params;
  console.log("Recording patient");

  try {
    const patient = await patientSchema.findOne(
      { patientId },
      {
        age: 1,
        gender: 1,
        admissionRecords: 1, // Get the full admission record
      }
    );

    if (!patient || patient.admissionRecords.length === 0) {
      return res
        .status(404)
        .json({ message: "Patient or Admission record not found" });
    }

    // Since there's always one admission record, we take the first one
    const admission = patient.admissionRecords[0];

    return res.json({
      age: patient.age,
      gender: patient.gender,
      weight: admission.weight,
      symptoms: admission.symptomsByDoctor,
      vitals: admission.vitals,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching patient details" });
  }
};
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const getDiagnosis = async (req, res) => {
  try {
    // Extract patientId from the request body
    const { patientId } = req.params;
    console.log("This is the patient ID: ", patientId);

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required" });
    }

    // Fetch patient data from the existing API
    const { data } = await axios.get(
      `https://common.code2pdf.in/doctors/getPatientSuggestion/${patientId}`
    );
    console.log(data);
    // Extract necessary fields
    const { age, gender, weight, symptoms, vitals } = data;

    // Create a structured prompt for AI
    const prompt = `
      Given the following patient details, provide a JSON array of possible diagnoses.
      - Age: ${age}
      - Gender: ${gender}
      - Weight: ${weight} kg
      - Symptoms: ${symptoms.join(", ")}
      - Vitals:
        - Temperature: ${vitals[0]?.temperature}°F
        - Pulse: ${vitals[0]?.pulse} BPM
        - Blood Pressure: ${vitals[0]?.bloodPressure} mmHg
        - Blood Sugar Level: ${vitals[0]?.bloodSugarLevel} mg/dL
    
      Format the response as a **valid JSON array** give me atleast five possible:
      [
        "Disease 1",
        "Disease 2",
        "Disease 3"
      ]
    `;

    // Query the AI model
    const result = await model.generateContent(prompt);
    let diagnosis = result.response.text();

    // Clean up the response to remove markdown formatting and extract valid JSON
    diagnosis = diagnosis.replace(/```json\n|\n```/g, "").trim();

    // Parse the cleaned string into a JSON array
    const diagnosisArray = JSON.parse(diagnosis);
    console.log(diagnosisArray);
    // Send the cleaned-up response as a JSON array
    res.json({ diagnosis: diagnosisArray });
  } catch (error) {
    console.log("Error fetching diagnosis:", error);
    res.status(500).json({ error: "Failed to get diagnosis" });
  }
};
export const deleteSymptom = async (req, res) => {
  console.log("Deleting symptom");
  const { patientId, admissionId, symptom } = req.params;

  try {
    const updatedPatient = await patientSchema.findOneAndUpdate(
      {
        patientId: patientId,
        "admissionRecords._id": admissionId, // Find the specific admission record
      },
      {
        $pull: {
          "admissionRecords.$.symptomsByDoctor": symptom, // Remove the specific symptom
        },
      },
      { new: true } // Return the updated document
    );

    if (!updatedPatient) {
      return res.status(404).json({
        message: "Patient or admission record not found",
      });
    }

    res.status(200).json({
      message: "Symptom deleted successfully",
      updatedPatient,
    });
  } catch (error) {
    console.error("Error deleting symptom:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteDiagnosis = async (req, res) => {
  console.log("Deleting diagnosis");
  const { patientId, admissionId, diagnosis } = req.params;

  try {
    const updatedPatient = await patientSchema.findOneAndUpdate(
      {
        patientId: patientId,
        "admissionRecords._id": admissionId,
      },
      {
        $pull: {
          "admissionRecords.$[record].diagnosisByDoctor": diagnosis,
        },
      },
      {
        new: true,
        arrayFilters: [{ "record._id": admissionId }],
      }
    );

    if (!updatedPatient) {
      return res
        .status(404)
        .json({ message: "Patient or admission record not found" });
    }

    res.status(200).json({
      message: "Diagnosis deleted successfully",
      updatedPatient,
    });
  } catch (error) {
    console.error("Error deleting diagnosis:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const addNotes = async (req, res) => {
  const doctorId = req.userId;
  try {
    const { patientId, admissionId, text, date } = req.body;

    if (!patientId || !admissionId || !text || !date) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const doctor = await hospitalDoctors.findById(doctorId);
    if (!doctor) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Add the new doctor note
    admissionRecord.doctorNotes.push({
      text,
      doctorName: doctor.doctorName, // Add doctor's name
      date,
    });

    // Save the updated patient document
    await patient.save();

    res.status(200).json({
      message: "Doctor note added successfully.",
      doctorNotes: admissionRecord.doctorNotes,
    });
  } catch (error) {
    console.error("Error adding doctor note:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
export const deleteNote = async (req, res) => {
  try {
    const { patientId, admissionId, noteId } = req.body;

    if (!patientId || !admissionId || !noteId) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Find the index of the note to be deleted
    const noteIndex = admissionRecord.doctorNotes.findIndex(
      (note) => note._id.toString() === noteId
    );

    if (noteIndex === -1) {
      return res.status(404).json({ message: "Doctor note not found." });
    }

    // Remove the note from the array
    admissionRecord.doctorNotes.splice(noteIndex, 1);

    // Save the updated patient document
    await patient.save();

    res.status(200).json({
      message: "Doctor note deleted successfully.",
      doctorNotes: admissionRecord.doctorNotes,
    });
  } catch (error) {
    console.error("Error deleting doctor note:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
export const fetchNotes = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    console.log(req.params);
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Check if the doctor exists

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Return doctor notes
    res.status(200).json({
      message: "Doctor notes fetched successfully.",
      doctorNotes: admissionRecord.doctorNotes,
    });
  } catch (error) {
    console.error("Error fetching doctor notes:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
export const addDoctorTreatment = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      medications,
      ivFluids,
      procedures,
      specialInstructions,
    } = req.body;
    const doctorId = req.userId; // Doctor ID from authentication middleware

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Get current date and time in IST format
    const nowIST = moment().tz("Asia/Kolkata");
    const formattedDate = nowIST.format("YYYY-MM-DD");
    const formattedTime = nowIST.format("HH:mm:ss");

    // Append the new data if provided with IST timestamp
    if (medications) {
      medications.forEach((med) => {
        admissionRecord.medications.push({
          ...med,
          date: formattedDate,
          time: formattedTime,
        });
      });
    }
    if (ivFluids) {
      ivFluids.forEach((fluid) => {
        admissionRecord.ivFluids.push({
          ...fluid,
          date: formattedDate,
          time: formattedTime,
        });
      });
    }
    if (procedures) {
      procedures.forEach((proc) => {
        admissionRecord.procedures.push({
          ...proc,
          date: formattedDate,
          time: formattedTime,
        });
      });
    }
    if (specialInstructions) {
      specialInstructions.forEach((inst) => {
        admissionRecord.specialInstructions.push({
          ...inst,
          date: formattedDate,
          time: formattedTime,
        });
      });
    }

    // Save the updated patient document
    await patient.save();

    res.status(200).json({
      message: "Doctor treatment details added successfully",
      admissionRecord,
    });
  } catch (error) {
    console.error("Error adding doctor treatment details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getDoctorTreatment = async (req, res) => {
  console.log("getDoctorTreatment");
  try {
    const { patientId, admissionId } = req.params;

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    const getNurseName = async (nurseId) => {
      if (!nurseId) return null;
      try {
        const nurse = await Nurse.findById(nurseId).select("nurseName");
        return nurse ? nurse.nurseName : null;
      } catch (error) {
        console.error(`Error fetching nurse ${nurseId}:`, error);
        return null;
      }
    };
    // Extract relevant details
    const medications = await Promise.all(
      (admissionRecord.medications || []).map(async (medication) => {
        const nurseName = await getNurseName(medication.administeredBy);
        return {
          ...medication.toObject(),
          nurseName,
        };
      })
    );

    // Add nurse names to IV fluids
    const ivFluids = await Promise.all(
      (admissionRecord.ivFluids || []).map(async (ivFluid) => {
        const nurseName = await getNurseName(ivFluid.administeredBy);
        return {
          ...ivFluid.toObject(),
          nurseName,
        };
      })
    );

    // Add nurse names to procedures
    const procedures = await Promise.all(
      (admissionRecord.procedures || []).map(async (procedure) => {
        const nurseName = await getNurseName(procedure.administeredBy);
        return {
          ...procedure.toObject(),
          nurseName,
        };
      })
    );
    const specialInstructions = await Promise.all(
      (admissionRecord.specialInstructions || []).map(async (instruction) => {
        const nurseName = await getNurseName(instruction.completedBy);
        return {
          ...instruction.toObject(),
          nurseName,
        };
      })
    );
    const response = {
      medications,
      ivFluids,
      procedures,
      specialInstructions,
    };
    res.status(200).json({
      message: "Doctor Treatment fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching doctor treatment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteDoctorTreatment = async (req, res) => {
  try {
    const { patientId, admissionId, treatmentType, treatmentId } = req.body;

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Treatment types mapping
    const treatmentMapping = {
      medications: admissionRecord.medications,
      ivFluids: admissionRecord.ivFluids,
      procedures: admissionRecord.procedures,
      specialInstructions: admissionRecord.specialInstructions,
    };

    if (!treatmentMapping[treatmentType]) {
      return res.status(400).json({ message: "Invalid treatment type" });
    }

    // Remove the specific treatment item
    admissionRecord[treatmentType] = admissionRecord[treatmentType].filter(
      (item) => item._id.toString() !== treatmentId
    );

    // Save the updated patient document
    await patient.save();

    res.status(200).json({
      message: `${treatmentType} deleted successfully`,
      updatedAdmissionRecord: admissionRecord,
    });
  } catch (error) {
    console.error("Error deleting doctor treatment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.userId; // Get doctor ID from authenticated user

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID not found. Authentication required.",
      });
    }

    // Query parameters for filtering
    const {
      status, // Filter by appointment status
      date, // Filter by specific date
      startDate, // Filter by date range (start)
      endDate, // Filter by date range (end)
      searchQuery, // Search by patient name
      page = 1, // Pagination
      limit = 10, // Results per page
      sortBy = "date", // Sort field
      sortOrder = "asc", // Sort direction
    } = req.query;

    // First, get all patient IDs with their appointments for this doctor
    const patientAppointments = await PatientAppointment.find({
      "appointments.doctorId": doctorId,
    });

    // For each patient, determine which appointment is the latest
    const latestAppointmentIds = new Map();

    patientAppointments.forEach((patient) => {
      // Filter to only this doctor's appointments
      const doctorAppointments = patient.appointments.filter(
        (appt) => appt.doctorId === doctorId
      );

      if (doctorAppointments.length > 0) {
        // Sort by createdAt date (newest first)
        doctorAppointments.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        // The first one after sorting is the latest
        latestAppointmentIds.set(doctorAppointments[0]._id.toString(), true);
      }
    });

    // Build the aggregation pipeline
    const pipeline = [];

    // Unwind the appointments array to work with individual appointments
    pipeline.push({ $unwind: "$appointments" });

    // Filter for the specific doctor's appointments
    pipeline.push({
      $match: {
        "appointments.doctorId": doctorId,
      },
    });

    // Apply additional filters
    const additionalFilters = {};

    if (status) {
      additionalFilters["appointments.status"] = status;
    }

    // Date filtering logic
    if (date) {
      // Specific date filter
      additionalFilters["appointments.date"] = date;
    } else if (startDate && endDate) {
      // Date range filter
      additionalFilters["appointments.date"] = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (startDate) {
      // Only start date provided
      additionalFilters["appointments.date"] = { $gte: startDate };
    } else if (endDate) {
      // Only end date provided
      additionalFilters["appointments.date"] = { $lte: endDate };
    }

    // Apply additional filters if they exist
    if (Object.keys(additionalFilters).length > 0) {
      pipeline.push({ $match: additionalFilters });
    }

    // Search by patient name if provided
    if (searchQuery) {
      pipeline.push({
        $match: {
          patientName: { $regex: searchQuery, $options: "i" },
        },
      });
    }

    // Create a projection to shape the response
    pipeline.push({
      $project: {
        _id: 0,
        appointmentId: "$appointments._id",
        patientId: 1,
        patientName: 1,
        patientContact: 1,
        symptoms: "$appointments.symptoms",
        appointmentType: "$appointments.appointmentType",
        date: "$appointments.date",
        time: "$appointments.time",
        status: "$appointments.status",
        paymentStatus: "$appointments.paymentStatus",
        rescheduledTo: "$appointments.rescheduledTo",
        createdAt: "$appointments.createdAt",
        updatedAt: "$appointments.updatedAt",
      },
    });

    // Sort the results
    const sortField = sortBy === "patientName" ? "patientName" : sortBy;
    pipeline.push({
      $sort: {
        [sortField]: sortOrder === "desc" ? -1 : 1,
      },
    });

    // Get the total count for pagination
    const countPipeline = [...pipeline];
    const countResult = await PatientAppointment.aggregate([
      ...countPipeline,
      { $count: "totalAppointments" },
    ]);

    const totalAppointments =
      countResult.length > 0 ? countResult[0].totalAppointments : 0;
    const totalPages = Math.ceil(totalAppointments / limit);

    // Add pagination
    pipeline.push({ $skip: (parseInt(page) - 1) * parseInt(limit) });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute the aggregation
    const appointments = await PatientAppointment.aggregate(pipeline);

    // Add the isLatest flag to each appointment
    const appointmentsWithLatestFlag = appointments.map((appt) => {
      return {
        ...appt,
        isLatest: latestAppointmentIds.has(appt.appointmentId.toString()),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        appointments: appointmentsWithLatestFlag,
        pagination: {
          totalAppointments,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching doctor appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.params;
    const { status, rescheduledDate, rescheduledTime, doctorNotes } = req.body;

    if (!patientId || !appointmentId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Appointment ID are required" });
    }

    if (
      !status ||
      !["accepted", "canceled", "completed", "rescheduled", "no-show"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    // If status is rescheduled, check if new date and time are provided
    if (status === "rescheduled" && (!rescheduledDate || !rescheduledTime)) {
      return res
        .status(400)
        .json({ message: "Rescheduled date and time are required" });
    }

    // Find the patient appointment record
    const patientRecord = await PatientAppointment.findOne({ patientId });

    if (!patientRecord) {
      return res.status(404).json({ message: "Patient record not found" });
    }

    // Find the specific appointment
    const appointmentIndex = patientRecord.appointments.findIndex(
      (appt) => appt._id.toString() === appointmentId
    );

    if (appointmentIndex === -1) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appointment = patientRecord.appointments[appointmentIndex];

    // Update appointment status
    patientRecord.appointments[appointmentIndex].status = status;

    // If rescheduled, update with new date and time
    // BUT do not create a new appointment (as per your requirement)
    if (status === "rescheduled") {
      // Just store the rescheduled info in the existing appointment
      patientRecord.appointments[
        appointmentIndex
      ].rescheduledTo = `${rescheduledDate} ${rescheduledTime}`;

      // Note: We're NOT creating a new appointment here
      // New appointments will only be created when the receptionist handles the rescheduling
    }

    // If accepted, create a new patient record in the Patient collection if not exists
    if (status === "accepted") {
      // Check if patient already exists in Patient collection
      let patientExists = await patientSchema.findOne({ patientId });

      if (!patientExists) {
        // Create new patient in Patient schema
        const newPatient = new patientSchema({
          patientId: patientRecord.patientId,
          name: patientRecord.patientName,
          age: 0, // Default age (to be updated)
          gender: "Other", // Default gender (to be updated)
          contact: patientRecord.patientContact,
          discharged: false, // Initialize as not discharged
          admissionRecords: [
            {
              admissionDate: new Date(),
              status: "Pending",
              patientType: "external",
              reasonForAdmission: appointment.symptoms,
              initialDiagnosis: "",
              symptoms: appointment.symptoms,
              doctor: {
                id: appointment.doctorId,
                name: appointment.doctorName,
                usertype: "external",
              },
              doctorNotes: doctorNotes
                ? [
                    {
                      text: doctorNotes,
                      doctorName: appointment.doctorName,
                      date: new Date().toISOString().split("T")[0],
                      time: new Date().toTimeString().split(" ")[0],
                    },
                  ]
                : [],
            },
          ],
        });

        await newPatient.save();
      } else {
        // Add a new admission record to existing patient
        patientExists.discharged = false; // Reset discharged status when accepting a new appointment
        patientExists.admissionRecords.push({
          admissionDate: new Date(),
          status: "Pending",
          patientType: "external",
          reasonForAdmission: appointment.symptoms,
          initialDiagnosis: "",
          symptoms: appointment.symptoms,
          doctor: {
            id: appointment.doctorId,
            name: appointment.doctorName,
          },
          doctorNotes: doctorNotes
            ? [
                {
                  text: doctorNotes,
                  doctorName: appointment.doctorName,
                  date: new Date().toISOString().split("T")[0],
                  time: new Date().toTimeString().split(" ")[0],
                },
              ]
            : [],
        });

        await patientExists.save();
      }
    }

    await patientRecord.save();

    res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully`,
      updatedAppointment: patientRecord.appointments[appointmentIndex],
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const addMedicine = async (req, res) => {
  try {
    const { name, category, morning, afternoon, night, comment } = req.body;
    const doctorId = req.userId; // Extract doctorId from request
    const doctor = await hospitalDoctors.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const newMedicine = new Medicine({
      name,
      category,
      morning: morning || "0",
      afternoon: afternoon || "0",
      night: night || "0",
      comment: comment || "",
      addedBy: {
        doctorId: doctor._id,
        doctorName: doctor.doctorName,
      },
    });

    await newMedicine.save();

    return res.status(201).json({
      message: "Medicine added successfully",
      medicine: newMedicine,
    });
  } catch (error) {
    console.error("Error adding medicine:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getDoctorMedicines = async (req, res) => {
  try {
    const doctorId = req.userId; // Assuming req.userId contains the authenticated doctor's ID

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required." });
    }

    const medicines = await Medicine.find({ "addedBy.doctorId": doctorId });

    if (!medicines.length) {
      return res
        .status(404)
        .json({ message: "No medicines found for this doctor." });
    }

    res.status(200).json(medicines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
};

export const deleteDoctorMedicine = async (req, res) => {
  try {
    const { medicineId } = req.params;

    if (!medicineId) {
      return res.status(400).json({ message: "Medicine ID is required." });
    }

    const deletedMedicine = await Medicine.findByIdAndDelete(medicineId);

    if (!deletedMedicine) {
      return res
        .status(404)
        .json({ message: "Medicine not found or already deleted." });
    }

    res.status(200).json({
      message: "Medicine deleted successfully.",
      deletedMedicine,
    });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
export const getEmergencyMedicationsForDoctor = async (req, res) => {
  try {
    const doctorId = req.userId;

    // Validate doctor authentication

    // Query parameters for filtering and pagination
    const {
      page = 1,
      limit = 10,
      status,
      patientId,
      startDate,
      endDate,
      sortBy = "administeredAt",
      sortOrder = "desc",
    } = req.query;

    // Build the aggregation pipeline
    const pipeline = [
      // Stage 1: Lookup patient information
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "patientId",
          as: "patient",
        },
      },
      // Stage 2: Unwind patient array
      {
        $unwind: "$patient",
      },
      // Stage 3: Match patients assigned to this doctor
      {
        $match: {
          "patient.admissionRecords": {
            $elemMatch: {
              "doctor.id": new mongoose.Types.ObjectId(doctorId),
            },
          },
        },
      },
      // Stage 4: Lookup nurse information for administeredBy
      {
        $lookup: {
          from: "nurses",
          localField: "administeredBy",
          foreignField: "_id",
          as: "nurse",
        },
      },
      // Stage 5: Lookup reviewing nurse information
      {
        $lookup: {
          from: "nurses",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewingNurse",
        },
      },
      // Stage 6: Lookup doctor approval information
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "doctorApproval.doctorId",
          foreignField: "_id",
          as: "approvingDoctor",
        },
      },
    ];

    // Add additional filters based on query parameters
    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    if (patientId) {
      matchStage.patientId = patientId;
    }

    if (startDate || endDate) {
      matchStage.administeredAt = {};
      if (startDate) {
        matchStage.administeredAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.administeredAt.$lte = new Date(endDate);
      }
    }

    // Add match stage if filters exist
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Add project stage to format the output
    pipeline.push({
      $project: {
        _id: 1,
        patientId: 1,
        admissionId: 1,
        medicationName: 1,
        dosage: 1,
        administeredAt: 1,
        nurseName: 1,
        reason: 1,
        status: 1,
        reviewedAt: 1,
        justification: 1,
        patient: {
          _id: "$patient._id",
          name: "$patient.name",
          age: "$patient.age",
          gender: "$patient.gender",
          contact: "$patient.contact",
          patientId: "$patient.patientId",
        },
        nurse: {
          $cond: {
            if: { $gt: [{ $size: "$nurse" }, 0] },
            then: {
              _id: { $arrayElemAt: ["$nurse._id", 0] },
              name: { $arrayElemAt: ["$nurse.name", 0] },
              employeeId: { $arrayElemAt: ["$nurse.employeeId", 0] },
            },
            else: null,
          },
        },
        reviewingNurse: {
          $cond: {
            if: { $gt: [{ $size: "$reviewingNurse" }, 0] },
            then: {
              _id: { $arrayElemAt: ["$reviewingNurse._id", 0] },
              name: { $arrayElemAt: ["$reviewingNurse.name", 0] },
              employeeId: { $arrayElemAt: ["$reviewingNurse.employeeId", 0] },
            },
            else: null,
          },
        },
        doctorApproval: {
          approved: "$doctorApproval.approved",
          notes: "$doctorApproval.notes",
          timestamp: "$doctorApproval.timestamp",
          doctor: {
            $cond: {
              if: { $gt: [{ $size: "$approvingDoctor" }, 0] },
              then: {
                _id: { $arrayElemAt: ["$approvingDoctor._id", 0] },
                name: { $arrayElemAt: ["$approvingDoctor.name", 0] },
                employeeId: {
                  $arrayElemAt: ["$approvingDoctor.employeeId", 0],
                },
              },
              else: null,
            },
          },
        },
      },
    });

    // Add sorting
    const sortStage = {};
    sortStage[sortBy] = sortOrder === "desc" ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // Execute aggregation with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const emergencyMedications = await EmergencyMedication.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    // Get total count for pagination
    const totalCount = await EmergencyMedication.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Group medications by status for summary
    const statusSummary = await EmergencyMedication.aggregate([
      ...pipeline.slice(0, -2), // Remove sort and project stages
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format status summary
    const summary = {
      total,
      pending: statusSummary.find((s) => s._id === "Pending")?.count || 0,
      approved: statusSummary.find((s) => s._id === "Approved")?.count || 0,
      rejected: statusSummary.find((s) => s._id === "Rejected")?.count || 0,
      pendingDoctorApproval:
        statusSummary.find((s) => s._id === "PendingDoctorApproval")?.count ||
        0,
    };

    res.status(200).json({
      success: true,
      message: "Emergency medications retrieved successfully",
      data: {
        emergencyMedications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
        summary,
        filters: {
          status,
          patientId,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching emergency medications:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching emergency medications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const updateMedicine = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { id } = req.params;
    const { name, category, morning, afternoon, night, comment } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required." });
    }

    const medicine = await Medicine.findOne({
      _id: medicineId,
      "addedBy.doctorId": doctorId,
    });

    if (!medicine) {
      return res
        .status(404)
        .json({ message: "Medicine not found or unauthorized access." });
    }

    // Update medicine fields if provided
    if (name) medicine.name = name;
    if (category) medicine.category = category;
    if (morning !== undefined) medicine.morning = morning;
    if (afternoon !== undefined) medicine.afternoon = afternoon;
    if (night !== undefined) medicine.night = night;
    if (comment !== undefined) medicine.comment = comment;

    await medicine.save();

    res
      .status(200)
      .json({ message: "Medicine updated successfully.", medicine });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
};

// Helper function to extract just the symptom name (without the timestamp)
const extractSymptomName = (symptomWithTimestamp) => {
  // Pattern to match symptom text before the timestamp format
  const parts = symptomWithTimestamp.split(" - ");
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return symptomWithTimestamp; // Return the original if no timestamp found
};

export const getSymptomAnalytics = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    // Object to store symptom counts
    const symptomCountMap = {};
    // Array to store all symptoms for unique symptoms list
    const allSymptoms = [];

    // Process each patient and their admission records (current patients)
    patients.forEach((patient) => {
      patient.admissionRecords.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            // Extract clean symptom name
            const symptomName = extractSymptomName(symptomWithTimestamp);

            // Count occurrences
            if (symptomCountMap[symptomName]) {
              symptomCountMap[symptomName]++;
            } else {
              symptomCountMap[symptomName] = 1;
            }

            // Add to all symptoms
            allSymptoms.push(symptomName);
          });
        }
      });
    });

    // Process historical records
    patientHistories.forEach((patientHistory) => {
      patientHistory.history.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            // Extract clean symptom name
            const symptomName = extractSymptomName(symptomWithTimestamp);

            // Count occurrences
            if (symptomCountMap[symptomName]) {
              symptomCountMap[symptomName]++;
            } else {
              symptomCountMap[symptomName] = 1;
            }

            // Add to all symptoms
            allSymptoms.push(symptomName);
          });
        }
      });
    });

    // Convert to array for sorting
    const symptomCounts = Object.entries(symptomCountMap).map(
      ([name, count]) => ({
        name,
        count,
      })
    );

    // Sort by count (most frequent first)
    symptomCounts.sort((a, b) => b.count - a.count);

    // Get unique symptoms (those that appear exactly once)
    const uniqueSymptoms = symptomCounts
      .filter((item) => item.count === 1)
      .map((item) => item.name);

    // Format the response
    const response = {
      totalPatients: patients.length,
      totalSymptomRecords: allSymptoms.length,
      mostUsedSymptoms: symptomCounts.slice(0, 10), // Top 10 most common
      uniqueSymptoms: uniqueSymptoms,
      allSymptoms: symptomCounts, // Full list with counts
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error in getSymptomAnalytics:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving symptom analytics",
      error: error.message,
    });
  }
};

// Get co-occurring symptoms (symptoms that frequently appear together)
export const getCoOccurringSymptoms = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    // Track co-occurrences - using a Map for keys with multiple symptoms
    const coOccurrenceMap = {};

    // Function to process symptoms from a patient record
    const processSymptoms = (symptoms) => {
      if (!symptoms || symptoms.length < 2) return;

      // Extract symptom names
      const symptomNames = symptoms.map((symptomWithTimestamp) =>
        extractSymptomName(symptomWithTimestamp)
      );

      // Generate all unique pairs of symptoms
      for (let i = 0; i < symptomNames.length; i++) {
        for (let j = i + 1; j < symptomNames.length; j++) {
          // Sort to ensure consistent pairing regardless of order
          const pair = [symptomNames[i], symptomNames[j]].sort().join("---");

          if (!coOccurrenceMap[pair]) {
            coOccurrenceMap[pair] = 1;
          } else {
            coOccurrenceMap[pair]++;
          }
        }
      }
    };

    // Process current patients
    patients.forEach((patient) => {
      patient.admissionRecords.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          processSymptoms(record.symptomsByDoctor);
        }
      });
    });

    // Process historical records
    patientHistories.forEach((patientHistory) => {
      patientHistory.history.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          processSymptoms(record.symptomsByDoctor);
        }
      });
    });

    // Convert to array and format for response
    const coOccurrences = Object.entries(coOccurrenceMap)
      .map(([pairKey, count]) => {
        const [symptom1, symptom2] = pairKey.split("---");
        return {
          pair: [symptom1, symptom2],
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    return res.status(200).json({
      success: true,
      data: {
        coOccurrences: coOccurrences.slice(0, 20), // Return top 20 co-occurring pairs
        totalPairs: coOccurrences.length,
      },
    });
  } catch (error) {
    console.error("Error in getCoOccurringSymptoms:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving co-occurring symptoms",
      error: error.message,
    });
  }
};

// Get symptom trends over time
export const getSymptomTrends = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    const timelineData = {};

    // Process each current patient record to extract date-based trends
    patients.forEach((patient) => {
      patient.admissionRecords.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            // Example format: "cough - 2025-04-23 11:34:57 PM"
            const parts = symptomWithTimestamp.split(" - ");
            if (parts.length >= 2) {
              const symptomName = parts[0].trim();

              // Get date part only (YYYY-MM-DD)
              const datePart = parts[1].split(" ")[0];

              if (!timelineData[datePart]) {
                timelineData[datePart] = {};
              }

              if (!timelineData[datePart][symptomName]) {
                timelineData[datePart][symptomName] = 1;
              } else {
                timelineData[datePart][symptomName]++;
              }
            }
          });
        }
      });
    });

    // Process historical records
    patientHistories.forEach((patientHistory) => {
      patientHistory.history.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            // Example format: "cough - 2025-04-23 11:34:57 PM"
            const parts = symptomWithTimestamp.split(" - ");
            if (parts.length >= 2) {
              const symptomName = parts[0].trim();

              // Get date part only (YYYY-MM-DD)
              const datePart = parts[1].split(" ")[0];

              if (!timelineData[datePart]) {
                timelineData[datePart] = {};
              }

              if (!timelineData[datePart][symptomName]) {
                timelineData[datePart][symptomName] = 1;
              } else {
                timelineData[datePart][symptomName]++;
              }
            }
          });
        }
      });
    });

    // Convert to array format for easier consumption by frontend
    const trendArray = Object.keys(timelineData).map((date) => {
      const symptoms = timelineData[date];
      return {
        date,
        symptoms: Object.keys(symptoms).map((name) => ({
          name,
          count: symptoms[name],
        })),
      };
    });

    // Sort by date ascending
    trendArray.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({
      success: true,
      data: trendArray,
    });
  } catch (error) {
    console.error("Error in getSymptomTrends:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving symptom trends",
      error: error.message,
    });
  }
};

// Get seasonal symptom patterns
export const getSeasonalSymptoms = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    // Track symptom occurrences by month
    const monthlySymptoms = {
      1: {},
      2: {},
      3: {},
      4: {},
      5: {},
      6: {},
      7: {},
      8: {},
      9: {},
      10: {},
      11: {},
      12: {},
    };

    // Process symptoms from current patients
    patients.forEach((patient) => {
      patient.admissionRecords.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            const parts = symptomWithTimestamp.split(" - ");
            if (parts.length >= 2) {
              const symptomName = parts[0].trim();
              const datePart = parts[1].split(" ")[0]; // "YYYY-MM-DD" format

              // Extract month
              const month = parseInt(datePart.split("-")[1]);

              // Add to monthly counts
              if (!monthlySymptoms[month][symptomName]) {
                monthlySymptoms[month][symptomName] = 1;
              } else {
                monthlySymptoms[month][symptomName]++;
              }
            }
          });
        }
      });
    });

    // Process symptoms from historical records
    patientHistories.forEach((patientHistory) => {
      patientHistory.history.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            const parts = symptomWithTimestamp.split(" - ");
            if (parts.length >= 2) {
              const symptomName = parts[0].trim();
              const datePart = parts[1].split(" ")[0]; // "YYYY-MM-DD" format

              // Extract month
              const month = parseInt(datePart.split("-")[1]);

              // Add to monthly counts
              if (!monthlySymptoms[month][symptomName]) {
                monthlySymptoms[month][symptomName] = 1;
              } else {
                monthlySymptoms[month][symptomName]++;
              }
            }
          });
        }
      });
    });

    // Format data for response
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const seasonalData = Object.keys(monthlySymptoms).map((month) => {
      const monthIndex = parseInt(month) - 1;
      const symptoms = Object.entries(monthlySymptoms[month])
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        month: monthIndex + 1,
        monthName: monthNames[monthIndex],
        symptoms: symptoms.slice(0, 5), // Top 5 symptoms for each month
        totalSymptomCount: symptoms.reduce((sum, s) => sum + s.count, 0),
      };
    });

    return res.status(200).json({
      success: true,
      data: seasonalData,
    });
  } catch (error) {
    console.error("Error in getSeasonalSymptoms:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving seasonal symptom patterns",
      error: error.message,
    });
  }
};

// Get symptom comparison by patient demographics
export const getSymptomDemographics = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    // Objects to store symptom distributions by demographics
    const symptomsByGender = {
      Male: {},
      Female: {},
      Other: {},
    };

    const symptomsByAgeRange = {
      "Under 18": {},
      "18-30": {},
      "31-45": {},
      "46-60": {},
      "Over 60": {},
    };

    // Process each current patient
    patients.forEach((patient) => {
      // Determine age group
      let ageGroup;
      if (patient.age < 18) ageGroup = "Under 18";
      else if (patient.age <= 30) ageGroup = "18-30";
      else if (patient.age <= 45) ageGroup = "31-45";
      else if (patient.age <= 60) ageGroup = "46-60";
      else ageGroup = "Over 60";

      // Process each symptom
      patient.admissionRecords.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            const symptomName = extractSymptomName(symptomWithTimestamp);

            // Add to gender-based counts
            if (!symptomsByGender[patient.gender][symptomName]) {
              symptomsByGender[patient.gender][symptomName] = 1;
            } else {
              symptomsByGender[patient.gender][symptomName]++;
            }

            // Add to age-based counts
            if (!symptomsByAgeRange[ageGroup][symptomName]) {
              symptomsByAgeRange[ageGroup][symptomName] = 1;
            } else {
              symptomsByAgeRange[ageGroup][symptomName]++;
            }
          });
        }
      });
    });

    // Process historical records
    patientHistories.forEach((patientHistory) => {
      // Determine age group - using age from history record
      let ageGroup;
      if (patientHistory.age < 18) ageGroup = "Under 18";
      else if (patientHistory.age <= 30) ageGroup = "18-30";
      else if (patientHistory.age <= 45) ageGroup = "31-45";
      else if (patientHistory.age <= 60) ageGroup = "46-60";
      else ageGroup = "Over 60";

      // Process each historical record
      patientHistory.history.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            const symptomName = extractSymptomName(symptomWithTimestamp);

            // Add to gender-based counts
            if (!symptomsByGender[patientHistory.gender][symptomName]) {
              symptomsByGender[patientHistory.gender][symptomName] = 1;
            } else {
              symptomsByGender[patientHistory.gender][symptomName]++;
            }

            // Add to age-based counts
            if (!symptomsByAgeRange[ageGroup][symptomName]) {
              symptomsByAgeRange[ageGroup][symptomName] = 1;
            } else {
              symptomsByAgeRange[ageGroup][symptomName]++;
            }
          });
        }
      });
    });

    // Format the response
    const formatDemographicData = (dataObj) => {
      return Object.keys(dataObj).map((category) => {
        const symptoms = Object.entries(dataObj[category])
          .map(([name, count]) => ({
            name,
            count,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          category,
          symptoms,
          totalCount: symptoms.reduce((sum, item) => sum + item.count, 0),
        };
      });
    };

    return res.status(200).json({
      success: true,
      data: {
        byGender: formatDemographicData(symptomsByGender),
        byAgeRange: formatDemographicData(symptomsByAgeRange),
      },
    });
  } catch (error) {
    console.error("Error in getSymptomDemographics:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving symptom demographics",
      error: error.message,
    });
  }
};
// Get symptoms by geographical location
export const getSymptomsByLocation = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    // Track symptoms by geographical regions
    const symptomsByCity = {};
    const symptomsByState = {};
    const symptomsByCountry = {};

    // Process current patients
    patients.forEach((patient) => {
      // Skip if location data is missing
      if (!patient.city && !patient.state && !patient.country) return;

      const city = patient.city || "Unknown";
      const state = patient.state || "Unknown";
      const country = patient.country || "Unknown";

      // Initialize location objects if they don't exist
      if (!symptomsByCity[city]) symptomsByCity[city] = {};
      if (!symptomsByState[state]) symptomsByState[state] = {};
      if (!symptomsByCountry[country]) symptomsByCountry[country] = {};

      // Process each admission record for symptoms
      patient.admissionRecords.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            const symptomName = extractSymptomName(symptomWithTimestamp);

            // Add to city-based counts
            if (!symptomsByCity[city][symptomName]) {
              symptomsByCity[city][symptomName] = 1;
            } else {
              symptomsByCity[city][symptomName]++;
            }

            // Add to state-based counts
            if (!symptomsByState[state][symptomName]) {
              symptomsByState[state][symptomName] = 1;
            } else {
              symptomsByState[state][symptomName]++;
            }

            // Add to country-based counts
            if (!symptomsByCountry[country][symptomName]) {
              symptomsByCountry[country][symptomName] = 1;
            } else {
              symptomsByCountry[country][symptomName]++;
            }
          });
        }
      });
    });

    // Process historical records (if PatientHistory schema has location fields)
    patientHistories.forEach((patientHistory) => {
      // Assuming PatientHistory schema has been updated with location fields
      // If not, you'll need to adjust this part accordingly
      const city = patientHistory.city || "Unknown";
      const state = patientHistory.state || "Unknown";
      const country = patientHistory.country || "Unknown";

      // Initialize location objects if they don't exist
      if (!symptomsByCity[city]) symptomsByCity[city] = {};
      if (!symptomsByState[state]) symptomsByState[state] = {};
      if (!symptomsByCountry[country]) symptomsByCountry[country] = {};

      patientHistory.history.forEach((record) => {
        if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
          record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
            const symptomName = extractSymptomName(symptomWithTimestamp);

            // Add to location-based counts
            if (!symptomsByCity[city][symptomName]) {
              symptomsByCity[city][symptomName] = 1;
            } else {
              symptomsByCity[city][symptomName]++;
            }

            if (!symptomsByState[state][symptomName]) {
              symptomsByState[state][symptomName] = 1;
            } else {
              symptomsByState[state][symptomName]++;
            }

            if (!symptomsByCountry[country][symptomName]) {
              symptomsByCountry[country][symptomName] = 1;
            } else {
              symptomsByCountry[country][symptomName]++;
            }
          });
        }
      });
    });

    // Format the response
    const formatLocationData = (dataObj) => {
      return Object.keys(dataObj).map((location) => {
        const symptoms = Object.entries(dataObj[location])
          .map(([name, count]) => ({
            name,
            count,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          location,
          symptoms: symptoms.slice(0, 10), // Top 10 symptoms for each location
          totalCount: symptoms.reduce((sum, item) => sum + item.count, 0),
        };
      });
    };

    return res.status(200).json({
      success: true,
      data: {
        byCity: formatLocationData(symptomsByCity),
        byState: formatLocationData(symptomsByState),
        byCountry: formatLocationData(symptomsByCountry),
      },
    });
  } catch (error) {
    console.error("Error in getSymptomsByLocation:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving symptom location data",
      error: error.message,
    });
  }
};
// Get potential outbreak detection based on symptom clustering by location
export const getOutbreakDetection = async (req, res) => {
  try {
    // Fetch data from both current and historical records
    const [patients, patientHistories] = await Promise.all([
      patientSchema.find({}),
      PatientHistory.find({}),
    ]);

    // Track recent symptom frequencies by location and time period
    const recentSymptomsByLocation = {};

    // Define what "recent" means - for example, last 30 days
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 30);

    // Process current patients for recent admissions
    patients.forEach((patient) => {
      // Skip if location data is missing
      if (!patient.city || !patient.state || !patient.country) return;

      const locationKey = `${patient.city}, ${patient.state}, ${patient.country}`;
      if (!recentSymptomsByLocation[locationKey]) {
        recentSymptomsByLocation[locationKey] = {
          city: patient.city,
          state: patient.state,
          country: patient.country,
          symptoms: {},
          recentAdmissionCount: 0,
          totalPatients: 0,
        };
      }

      recentSymptomsByLocation[locationKey].totalPatients++;

      // Check each admission for recent date and symptoms
      patient.admissionRecords.forEach((record) => {
        const admissionDate = new Date(record.admissionDate);
        // Only consider recent admissions
        if (admissionDate >= recentCutoff) {
          recentSymptomsByLocation[locationKey].recentAdmissionCount++;

          if (record.symptomsByDoctor && record.symptomsByDoctor.length > 0) {
            record.symptomsByDoctor.forEach((symptomWithTimestamp) => {
              const symptomName = extractSymptomName(symptomWithTimestamp);

              if (
                !recentSymptomsByLocation[locationKey].symptoms[symptomName]
              ) {
                recentSymptomsByLocation[locationKey].symptoms[symptomName] = 1;
              } else {
                recentSymptomsByLocation[locationKey].symptoms[symptomName]++;
              }
            });
          }
        }
      });
    });

    // Similar processing could be done for historical records if relevant
    // ...

    // Calculate outbreak potential
    // This is a simple algorithm that could be improved with more sophisticated methods
    const outbreakPotential = [];

    Object.values(recentSymptomsByLocation).forEach((locationData) => {
      // Skip locations with few patients
      if (locationData.recentAdmissionCount < 3) return;

      // Calculate the percentage of recent admissions compared to total patients
      const recentAdmissionPercentage =
        (locationData.recentAdmissionCount / locationData.totalPatients) * 100;

      // Find dominant symptoms (symptoms that appear in a significant percentage of recent cases)
      const dominantSymptoms = Object.entries(locationData.symptoms)
        .map(([name, count]) => ({
          name,
          count,
          percentage: (count / locationData.recentAdmissionCount) * 100,
        }))
        .filter((symptom) => symptom.percentage >= 40) // Symptoms present in at least 40% of recent cases
        .sort((a, b) => b.percentage - a.percentage);

      // If there are dominant symptoms and a significant percentage of recent admissions
      if (dominantSymptoms.length > 0 && recentAdmissionPercentage >= 30) {
        outbreakPotential.push({
          location: {
            city: locationData.city,
            state: locationData.state,
            country: locationData.country,
          },
          recentAdmissions: locationData.recentAdmissionCount,
          totalPatients: locationData.totalPatients,
          recentPercentage: recentAdmissionPercentage.toFixed(2),
          dominantSymptoms,
          alertLevel: recentAdmissionPercentage >= 60 ? "High" : "Medium",
        });
      }
    });

    // Sort by alert level and recent percentage
    outbreakPotential.sort((a, b) => {
      if (a.alertLevel === b.alertLevel) {
        return parseFloat(b.recentPercentage) - parseFloat(a.recentPercentage);
      }
      return a.alertLevel === "High" ? -1 : 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        outbreakAlerts: outbreakPotential,
        alertCount: outbreakPotential.length,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Error in getOutbreakDetection:", error);
    return res.status(500).json({
      success: false,
      message: "Error analyzing potential outbreaks",
      error: error.message,
    });
  }
};
export const createInvestigation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      patientId,
      admissionId,
      investigationType,
      otherInvestigationType,
      reasonForInvestigation,
      priority,
      scheduledDate,
      clinicalHistory,
      investigationDetails,
      tags,
    } = req.body;

    const doctorId = req.userId; // Extracted from auth middleware

    // Validate required fields
    if (!patientId || !investigationType || !reasonForInvestigation) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: patientId, investigationType, and reasonForInvestigation are required",
      });
    }

    // Verify patient exists - Using patientId field instead of _id
    const patient = await patientSchema.findOne({ patientId: patientId });
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    // Get doctor information to include doctor name
    const doctor = await hospitalDoctors.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    // If admissionId is provided, verify it exists for this patient
    if (admissionId) {
      const admissionExists = patient.admissionRecords.some(
        (record) => record._id.toString() === admissionId
      );

      if (!admissionExists) {
        return res.status(404).json({
          success: false,
          message: "Admission record not found for this patient",
        });
      }
    }

    // Create new investigation
    const investigation = new Investigation({
      patientId: patient._id, // Use MongoDB _id for reference
      patientIdNumber: patientId, // Store the string patientId as well for reference
      doctorId,
      doctorName: doctor.doctorName, // Store doctor name for easier reference
      investigationType,
      admissionRecordId: admissionId || null,
      reasonForInvestigation,
      status: "Ordered",
      orderDate: new Date(),
      priority: priority || "Routine",
    });

    // Add optional fields if provided
    if (otherInvestigationType && investigationType === "Other") {
      investigation.otherInvestigationType = otherInvestigationType;
    }

    if (scheduledDate) {
      investigation.scheduledDate = new Date(scheduledDate);
      investigation.status = "Scheduled";
    }

    if (clinicalHistory) {
      investigation.clinicalHistory = clinicalHistory;
    }

    if (investigationDetails) {
      // Check if investigationDetails is a string and convert it to an object
      if (typeof investigationDetails === "string") {
        // For blood tests, store in parameters array
        if (
          investigationType === "Blood Test" ||
          investigationType === "Urine Test"
        ) {
          investigation.investigationDetails = {
            parameters: investigationDetails
              .split(",")
              .map((item) => item.trim()),
          };
        } else if (
          investigationType === "X-Ray" ||
          investigationType === "MRI" ||
          investigationType === "CT Scan" ||
          investigationType === "Ultrasound" ||
          investigationType === "CT PNS" ||
          investigationType === "Nasal Endoscopy" ||
          investigationType === "Laryngoscopy"
        ) {
          // For imaging studies
          investigation.investigationDetails = {
            bodySite: investigationDetails,
          };
        } else if (
          investigationType === "Glucose Tolerance Test" ||
          investigationType === "DEXA Scan" ||
          investigationType === "VEP" ||
          investigationType === "SSEP" ||
          investigationType === "BAER"
        ) {
          // For functional tests
          investigation.investigationDetails = {
            testProtocol: investigationDetails,
          };
        } else if (investigationType === "Breath Test") {
          // For breath tests
          investigation.investigationDetails = {
            testSubstance: investigationDetails,
          };
        } else {
          // Default: store as parameters
          investigation.investigationDetails = {
            parameters: [investigationDetails],
          };
        }
      } else if (typeof investigationDetails === "object") {
        // If it's already an object, use it directly
        investigation.investigationDetails = investigationDetails;
      }
    }

    if (tags && Array.isArray(tags)) {
      investigation.tags = tags;
    }

    // Save the investigation
    await investigation.save({ session });

    // Add a doctor note to the admission record about the investigation if admissionId is provided
    if (admissionId) {
      const admissionIndex = patient.admissionRecords.findIndex(
        (record) => record._id.toString() === admissionId
      );

      if (admissionIndex !== -1) {
        const doctorNote = {
          text: `Ordered investigation: ${investigation.fullInvestigationName} - ${reasonForInvestigation}`,
          doctorName: doctor.doctorName, // Use doctor name from doctor record
          time: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
        };

        patient.admissionRecords[admissionIndex].doctorNotes.push(doctorNote);
        await patient.save({ session });
      }
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Investigation ordered successfully",
      data: investigation,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Error creating investigation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to order investigation",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// Get all investigations for a patient
export const getPatientInvestigations = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Find patient by patientId string
    const patient = await patientSchema.findOne({ patientId: patientId });
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    // Optional query parameters for filtering
    const { status, type, startDate, endDate } = req.query;

    // Build filter object using MongoDB _id
    const filter = { patientId: patient._id };

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.investigationType = type;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) {
        filter.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.orderDate.$lte = new Date(endDate);
      }
    }

    const investigations = await Investigation.find(filter)
      .sort({ orderDate: -1 })
      .populate("doctorId", "name");

    return res.status(200).json({
      success: true,
      count: investigations.length,
      data: investigations,
    });
  } catch (error) {
    console.error("Error retrieving investigations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve investigations",
      error: error.message,
    });
  }
};
export const getDoctorInvestigations = async (req, res) => {
  try {
    // Get doctor ID from authenticated user
    const doctorId = req.userId;

    // Get query parameters for filtering
    const {
      status,
      type,
      patientId,
      startDate,
      endDate,
      priority,
      isAbnormal,
      page = 1,
      limit = 10,
      sortBy = "orderDate",
      sortOrder = "desc",
    } = req.query;

    // Build filter object - always filter by doctor ID
    const filter = { doctorId };

    // Apply additional filters if provided
    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.investigationType = type;
    }

    if (patientId) {
      // Check if it's a patientIdNumber (string) or an ObjectId
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        filter.patientId = patientId;
      } else {
        filter.patientIdNumber = patientId;
      }
    }

    if (priority) {
      filter.priority = priority;
    }

    if (isAbnormal !== undefined) {
      filter["results.isAbnormal"] = isAbnormal === "true";
    }

    // Date range filter for orderDate
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) {
        filter.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.orderDate.$lte = new Date(endDate);
      }
    }

    // Calculate pagination values
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Set up sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get total count
    const total = await Investigation.countDocuments(filter);

    // Execute query with pagination and sorting
    const investigations = await Investigation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .populate("patientId", "name age gender contact discharged")
      .lean();

    // Calculate additional fields
    const enhancedInvestigations = investigations.map((investigation) => {
      // Calculate days elapsed since order
      const daysSinceOrdered = Math.floor(
        (new Date() - new Date(investigation.orderDate)) / (1000 * 60 * 60 * 24)
      );

      // Determine if investigation is overdue based on priority
      let isOverdue = false;
      if (
        investigation.status === "Ordered" ||
        investigation.status === "Scheduled"
      ) {
        switch (investigation.priority) {
          case "STAT":
            isOverdue = daysSinceOrdered > 1;
            break;
          case "Urgent":
            isOverdue = daysSinceOrdered > 3;
            break;
          case "Routine":
            isOverdue = daysSinceOrdered > 7;
            break;
        }
      }

      // Return enhanced investigation object
      return {
        ...investigation,
        daysSinceOrdered,
        isOverdue,
        hasAttachments:
          investigation.attachments && investigation.attachments.length > 0,
        hasResults: investigation.status === "Results Available",
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNumber);

    // Return response
    return res.status(200).json({
      success: true,
      count: total,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        pageSize: limitNumber,
        totalItems: total,
      },
      data: enhancedInvestigations,
    });
  } catch (error) {
    console.error("Error fetching doctor investigations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor investigations",
      error: error.message,
    });
  }
};
export const getPatientInvestigationsByAdmission = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params; // or req.query

    if (!patientId || !admissionId) {
      return res.status(400).json({
        success: false,
        message: "Both patientId and admissionId are required",
      });
    }

    // Build filter
    const filter = {
      admissionRecordId: admissionId,
    };

    // Add patientId filter
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      filter.patientId = patientId;
    } else {
      filter.patientIdNumber = patientId;
    }

    // Get all investigations for this admission
    const investigations = await Investigation.find(filter)
      .sort({ orderDate: -1 })
      .populate("patientId", "name age gender contact discharged")
      .populate("doctorId", "name specialization")
      .lean();

    // Enhance the investigations data
    const enhancedInvestigations = investigations.map((investigation) => {
      const daysSinceOrdered = Math.floor(
        (new Date() - new Date(investigation.orderDate)) / (1000 * 60 * 60 * 24)
      );

      let isOverdue = false;
      if (
        investigation.status === "Ordered" ||
        investigation.status === "Scheduled"
      ) {
        switch (investigation.priority) {
          case "STAT":
            isOverdue = daysSinceOrdered > 1;
            break;
          case "Urgent":
            isOverdue = daysSinceOrdered > 3;
            break;
          case "Routine":
            isOverdue = daysSinceOrdered > 7;
            break;
        }
      }

      return {
        ...investigation,
        daysSinceOrdered,
        isOverdue,
        hasAttachments:
          investigation.attachments && investigation.attachments.length > 0,
        hasResults: investigation.status === "Results Available",
        patientDischarged: investigation.patientId?.discharged || false,
      };
    });

    // Return response
    return res.status(200).json({
      success: true,
      count: investigations.length,
      data: enhancedInvestigations,
    });
  } catch (error) {
    console.error("Error fetching patient investigations by admission:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient investigations",
      error: error.message,
    });
  }
};
export const getLabReportsByAdmissionId = async (req, res) => {
  try {
    const { admissionId } = req.params;

    // Validate if provided admission ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(admissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID format",
      });
    }

    // Find lab reports associated with the given admission ID
    const labReports = await LabReport.find({ admissionId })
      .populate("patientId", "name patientId") // Populate patient details
      .populate("doctorId", "name") // Populate doctor details
      .sort({ "reports.uploadedAt": -1 }); // Sort by most recent upload

    // Check if any lab reports were found
    if (!labReports || labReports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No lab reports found for this admission",
      });
    }

    // Return the lab reports
    return res.status(200).json({
      success: true,
      count: labReports.length,
      data: labReports,
    });
  } catch (error) {
    console.error("Error fetching lab reports:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching lab reports",
      error: error.message,
    });
  }
};
export const doctorBulkApproveEmergencyMedications = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const doctorId = req.userId;
    const { medications } = req.body; // Array of {medicationId, approved, notes}

    if (!medications || !Array.isArray(medications)) {
      return res.status(400).json({
        success: false,
        message: "medications array is required",
      });
    }

    // Get doctor details
    const doctor = await mongoose
      .model("hospitalDoctor")
      .findById(doctorId)
      .select("doctorName ")
      .lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const results = [];
    let addedToPatientCount = 0;

    for (const med of medications) {
      const { medicationId, approved, notes } = med;

      if (!medicationId || typeof approved !== "boolean") {
        results.push({
          medicationId,
          success: false,
          message: "Invalid medicationId or approved value",
        });
        continue;
      }

      try {
        const medication = await EmergencyMedication.findOne({
          _id: medicationId,
          patientId,
          admissionId,
        });

        if (!medication) {
          results.push({
            medicationId,
            success: false,
            message: "Medication not found",
          });
          continue;
        }

        // Update doctor approval
        medication.doctorApproval = {
          approved,
          doctorId,
          doctorName: doctor.name,
          notes: notes || "",
          timestamp: new Date(),
          priority: "Medium",
        };

        await medication.save();

        // Check if should add to patient record
        let addedToRecord = false;
        if (approved && medication.status === "Approved") {
          const patient = await patientSchema.findOne({ patientId });

          if (patient) {
            const admissionIndex = patient.admissionRecords.findIndex(
              (record) => record._id.toString() === admissionId
            );

            if (admissionIndex !== -1) {
              patient.admissionRecords[admissionIndex].medications.push({
                name: `${medication.medicationName} (EMERGENCY - APPROVED)`,
                dosage: medication.dosage,
                type: "Emergency",
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                // administrationStatus: "Administered",
                // administeredBy: medication.administeredBy,
                // administeredAt: medication.administeredAt,
                // administrationNotes: `Emergency medication approved by Dr. ${doctor.name}`,
              });

              await patient.save();
              addedToRecord = true;
              addedToPatientCount++;
            }
          }
        }

        results.push({
          medicationId,
          success: true,
          approved,
          addedToPatientRecord: addedToRecord,
          message: approved ? "Approved" : "Rejected",
        });
      } catch (error) {
        results.push({
          medicationId,
          success: false,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${medications.length} medications. ${addedToPatientCount} added to patient record.`,
      data: {
        patientId,
        admissionId,
        doctorName: doctor.name,
        processedCount: medications.length,
        addedToPatientCount,
        results,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error bulk approving emergency medications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process bulk approval",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
export const getPatientAdmissionDetails = async (req, res, next) => {
  try {
    const { patientId, admissionId } = req.params;

    // Validate required parameters
    if (!patientId || !admissionId) {
      return next(createError(400, "Patient ID and Admission ID are required"));
    }

    // Validate ObjectId format for admissionId
    // if (!validateObjectId(admissionId)) {
    //   return next(createError(400, "Invalid admission ID format"));
    // }

    // Find patient by patientId
    const patient = await patientSchema
      .findOne({ patientId })
      .populate({
        path: "admissionRecords.doctor.id",
        select: "name specialization department",
      })
      .populate({
        path: "admissionRecords.section.id",
        select: "name type capacity",
      })
      .populate({
        path: "admissionRecords.medications.administeredBy",
        select: "name nurseId",
      })
      .populate({
        path: "admissionRecords.ivFluids.administeredBy",
        select: "name nurseId",
      })
      .populate({
        path: "admissionRecords.procedures.administeredBy",
        select: "name nurseId",
      })
      .populate({
        path: "admissionRecords.specialInstructions.completedBy",
        select: "name nurseId",
      })
      .lean();

    if (!patient) {
      return next(createError(404, "Patient not found"));
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return next(createError(404, "Admission record not found"));
    }

    // Get patient history for this admission (if discharged)
    let patientHistory = null;
    if (
      admissionRecord.conditionAtDischarge !== "Discharged" ||
      admissionRecord.dischargeDate
    ) {
      patientHistory = await PatientHistory.findOne({
        patientId: patient.patientId,
        "admissionRecord._id": admissionId,
      })
        .populate({
          path: "admissionRecord.doctor.id",
          select: "name specialization department",
        })
        .lean();
    }

    // Format the response data
    const responseData = {
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        address: patient.address,
        city: patient.city,
        state: patient.state,
        country: patient.country,
        dob: patient.dob,
        imageUrl: patient.imageUrl,
        discharged: patient.discharged,
        pendingAmount: patient.pendingAmount,
      },
      currentAdmission: {
        ...admissionRecord,
        // Calculate admission duration
        admissionDuration: admissionRecord.dischargeDate
          ? Math.ceil(
              (new Date(admissionRecord.dischargeDate) -
                new Date(admissionRecord.admissionDate)) /
                (1000 * 60 * 60 * 24)
            )
          : Math.ceil(
              (new Date() - new Date(admissionRecord.admissionDate)) /
                (1000 * 60 * 60 * 24)
            ),

        // Get pending tasks summary
        pendingTasks: {
          medications:
            admissionRecord.medications?.filter(
              (med) => med.administrationStatus === "Pending"
            ).length || 0,
          ivFluids:
            admissionRecord.ivFluids?.filter(
              (iv) => iv.administrationStatus === "Pending"
            ).length || 0,
          procedures:
            admissionRecord.procedures?.filter(
              (proc) => proc.administrationStatus === "Pending"
            ).length || 0,
          specialInstructions:
            admissionRecord.specialInstructions?.filter(
              (inst) => inst.status === "Pending"
            ).length || 0,
        },

        // Latest vitals
        latestVitals:
          admissionRecord.vitals?.length > 0
            ? admissionRecord.vitals[admissionRecord.vitals.length - 1]
            : null,

        // Recent doctor notes (last 5)
        recentDoctorNotes: admissionRecord.doctorNotes?.slice(-5) || [],
      },
      // Include history if patient was discharged
      ...(patientHistory && {
        dischargeHistory: {
          dischargedAt: patientHistory.dischargedAt,
          admissionRecord: patientHistory.admissionRecord,
        },
      }),

      // Metadata
      metadata: {
        retrievedAt: new Date().toISOString(),
        isCurrentAdmission: !admissionRecord.dischargeDate,
        totalAdmissions: patient.admissionRecords.length,
      },
    };

    // Success response
    res.status(200).json({
      success: true,
      message: "Patient admission details retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error in getPatientAdmissionDetails:", error);
    next(
      createError(500, "Internal server error while retrieving patient details")
    );
  }
};
export const getCounterValues = async (req, res) => {
  try {
    const opdCount = await PatientCounter.getCurrentSequenceValue("opdNumber");
    const ipdCount = await PatientCounter.getCurrentSequenceValue("ipdNumber");

    res.status(200).json({
      success: true,
      data: {
        currentOPDNumber: opdCount,
        currentIPDNumber: ipdCount,
        nextOPDNumber: opdCount + 1,
        nextIPDNumber: ipdCount + 1,
      },
    });
  } catch (error) {
    console.error("Error fetching counter values:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch counter values",
    });
  }
};

// Helper function to reset counters (admin only)
export const resetCounters = async (req, res) => {
  try {
    const { counterType, newValue = 0 } = req.body;

    if (!["opdNumber", "ipdNumber", "both"].includes(counterType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid counter type. Use 'opdNumber', 'ipdNumber', or 'both'",
      });
    }

    let result = {};

    if (counterType === "both") {
      result.opdNumber = await PatientCounter.resetCounter(
        "opdNumber",
        newValue
      );
      result.ipdNumber = await PatientCounter.resetCounter(
        "ipdNumber",
        newValue
      );
    } else {
      result[counterType] = await PatientCounter.resetCounter(
        counterType,
        newValue
      );
    }

    res.status(200).json({
      success: true,
      message: "Counter(s) reset successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error resetting counters:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset counters",
    });
  }
};

export const getAllDischargeSummaries = async (req, res) => {
  try {
    // Extract query parameters with defaults
    const {
      page = 1,
      limit = 10,
      sortBy = "generatedAt",
      sortOrder = "desc",
      search = "",
      patientId,
      isManuallyGenerated,
      dateFrom,
      dateTo,
      fileName,
    } = req.query;

    // Validate and sanitize inputs
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Cap at 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = {};

    // Search functionality (searches in patientId and fileName)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [{ patientId: searchRegex }, { fileName: searchRegex }];
    }

    // Specific filters
    if (patientId) {
      filter.patientId = patientId;
    }

    if (fileName) {
      filter.fileName = new RegExp(fileName, "i");
    }

    if (isManuallyGenerated !== undefined) {
      filter.isManuallyGenerated = isManuallyGenerated === "true";
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      filter.generatedAt = {};
      if (dateFrom) {
        filter.generatedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add 1 day to include the entire dateTo day
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        filter.generatedAt.$lt = endDate;
      }
    }

    // Validate sort field to prevent NoSQL injection
    const allowedSortFields = [
      "generatedAt",
      "patientId",
      "fileName",
      "isManuallyGenerated",
    ];
    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "generatedAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Execute query with aggregation for better performance
    const [summaries, totalCount] = await Promise.all([
      DischargeSummary.find(filter)
        .select("-__v") // Exclude version field
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance as we don't need Mongoose document methods

      DischargeSummary.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Response object
    const response = {
      success: true,
      data: {
        summaries,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
          skip,
        },
        filters: {
          search: search || null,
          patientId: patientId || null,
          fileName: fileName || null,
          isManuallyGenerated: isManuallyGenerated
            ? isManuallyGenerated === "true"
            : null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          sortBy: sortField,
          sortOrder,
        },
      },
      message: `Retrieved ${summaries.length} discharge summaries`,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching discharge summaries:", error);

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid date format provided",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch discharge summaries",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const getPatientsList = async (req, res) => {
  try {
    // Extract and validate query parameters
    const {
      page = 1,
      limit = 20,
      sortBy = "serialNumber",
      sortOrder = "desc",
      search = "",
      filterType = "all", // all, today, yesterday, ipd, opd, date-range
      dateFrom,
      dateTo,
      status,
      doctorId,
      sectionId,
    } = req.query;

    // Validate and sanitize inputs
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Validate ObjectIds if provided
    if (doctorId && !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID format",
      });
    }

    if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID format",
      });
    }

    // Build date filter based on filterType
    let dateFilter = {};
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    switch (filterType) {
      case "today":
        dateFilter = {
          "admissionRecords.admissionDate": {
            $gte: startOfToday,
            $lt: endOfToday,
          },
        };
        break;
      case "yesterday":
        dateFilter = {
          "admissionRecords.admissionDate": {
            $gte: yesterday,
            $lt: startOfToday,
          },
        };
        break;
      case "date-range":
        if (dateFrom || dateTo) {
          dateFilter["admissionRecords.admissionDate"] = {};
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            if (isNaN(fromDate.getTime())) {
              return res.status(400).json({
                success: false,
                message: "Invalid dateFrom format",
              });
            }
            dateFilter["admissionRecords.admissionDate"].$gte = fromDate;
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            if (isNaN(toDate.getTime())) {
              return res.status(400).json({
                success: false,
                message: "Invalid dateTo format",
              });
            }
            toDate.setDate(toDate.getDate() + 1);
            dateFilter["admissionRecords.admissionDate"].$lt = toDate;
          }
        }
        break;
    }

    // Build search filter
    const searchFilter = search?.trim()
      ? {
          $or: [
            { name: new RegExp(search.trim(), "i") },
            { patientId: new RegExp(search.trim(), "i") },
            { contact: new RegExp(search.trim(), "i") },
            { "admissionRecords.opdNumber": parseInt(search.trim()) || 0 },
            { "admissionRecords.ipdNumber": parseInt(search.trim()) || 0 },
          ],
        }
      : {};

    // Build aggregation pipeline
    const pipeline = [
      // Initial match with basic filters
      {
        $match: {
          ...dateFilter,
          ...searchFilter,
        },
      },

      // Add latest admission record and statistics
      {
        $addFields: {
          latestAdmission: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$admissionRecords",
                  sortBy: { admissionDate: -1 },
                },
              },
              0,
            ],
          },
          totalAdmissions: { $size: "$admissionRecords" },
          ipdAdmissions: {
            $size: {
              $filter: {
                input: "$admissionRecords",
                cond: {
                  $and: [
                    { $ne: ["$$this.ipdNumber", null] },
                    { $ne: ["$$this.ipdNumber", undefined] },
                    { $gt: ["$$this.ipdNumber", 0] },
                  ],
                },
              },
            },
          },
        },
      },

      // Filter by patient type (IPD/OPD) if specified
      ...(filterType === "ipd"
        ? [
            {
              $match: {
                $and: [
                  { "latestAdmission.ipdNumber": { $ne: null } },
                  { "latestAdmission.ipdNumber": { $ne: undefined } },
                  { "latestAdmission.ipdNumber": { $gt: 0 } },
                ],
              },
            },
          ]
        : []),

      ...(filterType === "opd"
        ? [
            {
              $match: {
                $or: [
                  { "latestAdmission.ipdNumber": null },
                  { "latestAdmission.ipdNumber": undefined },
                  { "latestAdmission.ipdNumber": 0 },
                  { "latestAdmission.ipdNumber": { $exists: false } },
                ],
              },
            },
          ]
        : []),

      // Filter by status if specified
      ...(status
        ? [
            {
              $match: { "latestAdmission.status": status },
            },
          ]
        : []),

      // Filter by doctor if specified
      ...(doctorId
        ? [
            {
              $match: {
                "latestAdmission.doctor.id": new mongoose.Types.ObjectId(
                  doctorId
                ),
              },
            },
          ]
        : []),

      // Filter by section if specified
      ...(sectionId
        ? [
            {
              $match: {
                "latestAdmission.section.id": new mongoose.Types.ObjectId(
                  sectionId
                ),
              },
            },
          ]
        : []),

      // Lookup patient history
      {
        $lookup: {
          from: "patienthistories",
          localField: "patientId",
          foreignField: "patientId",
          as: "patientHistory",
        },
      },

      // Add computed fields
      {
        $addFields: {
          historyRecord: { $arrayElemAt: ["$patientHistory", 0] },
          visitCount: {
            $add: [
              "$totalAdmissions",
              {
                $size: {
                  $ifNull: [
                    {
                      $getField: {
                        field: "history",
                        input: { $arrayElemAt: ["$patientHistory", 0] },
                      },
                    },
                    [],
                  ],
                },
              },
            ],
          },
        },
      },

      // Add last discharge information
      {
        $addFields: {
          lastDischarge: {
            $cond: {
              if: {
                $gt: [
                  { $size: { $ifNull: ["$historyRecord.history", []] } },
                  0,
                ],
              },
              then: {
                $arrayElemAt: [
                  {
                    $sortArray: {
                      input: "$historyRecord.history",
                      sortBy: { dischargeDate: -1 },
                    },
                  },
                  0,
                ],
              },
              else: null,
            },
          },
        },
      },

      // Project final fields with corrected patient type logic
      {
        $project: {
          patientId: 1,
          name: 1,
          age: 1,
          gender: 1,
          contact: 1,
          address: 1,
          city: 1,
          state: 1,
          dob: 1,
          discharged: 1,
          pendingAmount: 1,
          imageUrl: 1,

          // Latest admission info
          currentOpdNumber: "$latestAdmission.opdNumber",
          currentIpdNumber: "$latestAdmission.ipdNumber",
          currentAdmissionDate: "$latestAdmission.admissionDate",
          currentStatus: "$latestAdmission.status",
          currentDoctor: "$latestAdmission.doctor",
          currentSection: "$latestAdmission.section",
          currentBedNumber: "$latestAdmission.bedNumber",
          currentDischargeDate: "$latestAdmission.dischargeDate",
          reasonForAdmission: "$latestAdmission.reasonForAdmission",
          conditionAtDischarge: "$latestAdmission.conditionAtDischarge",
          patientType: "$latestAdmission.patientType",
          admitNotes: "$latestAdmission.admitNotes",
          amountToBePayed: "$latestAdmission.amountToBePayed",

          // Visit statistics
          totalVisits: "$visitCount",
          totalAdmissions: 1,
          ipdAdmissions: 1,
          opdOnlyVisits: { $subtract: ["$totalAdmissions", "$ipdAdmissions"] },

          // Last discharge info
          lastDischargeDate: "$lastDischarge.dischargeDate",
          lastDischargeCondition: "$lastDischarge.conditionAtDischarge",
          lastDischargeDoctor: "$lastDischarge.doctor",

          // FIXED: Patient type indicator with proper null/undefined checking
          patientType: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$latestAdmission.ipdNumber", null] },
                  { $ne: ["$latestAdmission.ipdNumber", undefined] },
                  { $gt: ["$latestAdmission.ipdNumber", 0] },
                ],
              },
              then: "IPD",
              else: "OPD",
            },
          },

          // FIXED: Serial number logic
          serialNumber: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$latestAdmission.ipdNumber", null] },
                  { $ne: ["$latestAdmission.ipdNumber", undefined] },
                  { $gt: ["$latestAdmission.ipdNumber", 0] },
                ],
              },
              then: "$latestAdmission.ipdNumber",
              else: "$latestAdmission.opdNumber",
            },
          },

          // Add more useful fields
          daysSinceAdmission: {
            $cond: {
              if: "$latestAdmission.admissionDate",
              then: {
                $dateDiff: {
                  startDate: "$latestAdmission.admissionDate",
                  endDate: "$$NOW",
                  unit: "day",
                },
              },
              else: null,
            },
          },

          // Check if patient has any pending medications
          hasPendingTasks: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$latestAdmission.medications", []] },
                    cond: { $eq: ["$$this.administrationStatus", "Pending"] },
                  },
                },
              },
              0,
            ],
          },
        },
      },

      // Remove the patientHistory field as it's no longer needed
      {
        $unset: ["patientHistory", "historyRecord", "lastDischarge"],
      },
    ];

    // Add sorting
    const validSortFields = [
      "serialNumber",
      "currentOpdNumber",
      "currentIpdNumber",
      "currentAdmissionDate",
      "name",
      "totalVisits",
      "daysSinceAdmission",
    ];
    const sortField = validSortFields.includes(sortBy)
      ? sortBy
      : "serialNumber";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    pipeline.push({
      $sort: { [sortField]: sortDirection },
    });

    // Execute aggregation with pagination
    const [patients, totalCountResult] = await Promise.all([
      patientSchema.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limitNum },
      ]),
      patientSchema.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const totalCount = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get summary statistics
    const summaryStats = await patientSchema.aggregate([
      {
        $addFields: {
          latestAdmission: {
            $arrayElemAt: [
              {
                $sortArray: {
                  input: "$admissionRecords",
                  sortBy: { admissionDate: -1 },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          ipdPatients: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$latestAdmission.ipdNumber", null] },
                    { $ne: ["$latestAdmission.ipdNumber", undefined] },
                    { $gt: ["$latestAdmission.ipdNumber", 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          opdPatients: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$latestAdmission.ipdNumber", null] },
                    { $eq: ["$latestAdmission.ipdNumber", undefined] },
                    { $eq: ["$latestAdmission.ipdNumber", 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          todayAdmissions: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$latestAdmission.admissionDate", startOfToday] },
                    { $lt: ["$latestAdmission.admissionDate", endOfToday] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          pendingAmount: { $sum: { $ifNull: ["$pendingAmount", 0] } },
          avgAge: { $avg: "$age" },
        },
      },
    ]);

    const stats = summaryStats[0] || {
      totalPatients: 0,
      ipdPatients: 0,
      opdPatients: 0,
      todayAdmissions: 0,
      pendingAmount: 0,
      avgAge: 0,
    };

    // Build response
    const response = {
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum,
          skip,
        },
        statistics: {
          ...stats,
          pendingAmount: Math.round(stats.pendingAmount * 100) / 100,
          avgAge: Math.round(stats.avgAge * 10) / 10,
        },
        filters: {
          search: search || null,
          filterType,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          status: status || null,
          doctorId: doctorId || null,
          sectionId: sectionId || null,
          sortBy: sortField,
          sortOrder,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestedBy: req.userId,
          userType: req.usertype,
        },
      },
      message: `Retrieved ${patients.length} patients successfully`,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching patients list:", error);

    // Different error responses based on error type
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid parameter format",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching patients list",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const generateMedicalCertificate = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      diagnosis,
      medicalLeaveStartDate,
      expectedRestDuration,
      expectedReturnDate,
      additionalNotes = "",
      certificateType = "illness",
    } = req.body;

    // Get doctor ID from auth middleware
    const doctorId = req.userId;

    // Validate required fields
    if (!patientId || !admissionId || !diagnosis || !medicalLeaveStartDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields for medical certificate generation",
        requiredFields: [
          "patientId",
          "admissionId",
          "diagnosis",
          "medicalLeaveStartDate",
        ],
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(admissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID format",
      });
    }

    // Find doctor details
    const doctor = await hospitalDoctors.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }
    const doctorSignatureUrl =
      "https://res.cloudinary.com/dnznafp2a/image/upload/v1751720742/WhatsApp_Image_2025-06-23_at_18.41.26_vimkib.jpg";
    // Find patient and specific admission record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Format dates in IST format
    const formatDateIST = (date) => {
      return new Date(date).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };
    const formatDateTimeIST = (date) => {
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };

    const currentDate = formatDateIST(new Date());
    const currentDateTime = formatDateTimeIST(new Date());

    const leaveStartDate = formatDateIST(medicalLeaveStartDate);
    const returnDate = expectedReturnDate
      ? formatDateIST(expectedReturnDate)
      : "To be determined based on medical assessment";

    // Determine gender pronoun
    const pronoun =
      patient.gender === "Female"
        ? "She"
        : patient.gender === "Male"
        ? "He"
        : "They";
    const possessivePronoun =
      patient.gender === "Female"
        ? "her"
        : patient.gender === "Male"
        ? "his"
        : "their";

    // Generate certificate HTML content
    const certificateHtml = generateCertificateHTML({
      patient,
      admissionRecord,
      diagnosis,
      leaveStartDate,
      expectedRestDuration,
      returnDate,
      doctor,
      doctorSignatureUrl,
      currentDate,
      pronoun,
      possessivePronoun,
      additionalNotes,
      certificateType,
      currentDateTime,
    });

    // Generate PDF
    const pdfBuffer = await generatePdf(certificateHtml);

    // Create filename
    const filename = `Medical_Certificate_${patient.name.replace(
      /\s+/g,
      "_"
    )}_${patientId}_${Date.now()}.pdf`;

    // Upload to Google Drive using configured folder ID
    const certificateUrl = await uploadToDrive(
      pdfBuffer,
      filename,
      "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"
    );

    // Log certificate generation for audit trail
    console.log(
      `Medical certificate generated for patient ${patientId} by doctor ${
        doctor.doctorName
      } at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
    );

    // Send response
    res.status(200).json({
      success: true,
      message: "Medical certificate generated successfully",
      data: {
        certificateUrl,
        filename,
        patientDetails: {
          name: patient.name,
          patientId: patient.patientId,
          age: patient.age,
          gender: patient.gender,
        },
        certificateDetails: {
          diagnosis,
          medicalLeaveStartDate: leaveStartDate,
          expectedRestDuration,
          expectedReturnDate: returnDate,
          issueDate: currentDate,
          doctorName: doctor.doctorName,
          doctorSpeciality: doctor.speciality,
          doctorDepartment: doctor.department,
        },
        admissionInfo: {
          opdNumber: admissionRecord.opdNumber,
          ipdNumber: admissionRecord.ipdNumber,
          admissionDate: admissionRecord.admissionDate,
          reasonForAdmission: admissionRecord.reasonForAdmission,
        },
      },
    });
  } catch (error) {
    console.error("Error generating medical certificate:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate medical certificate",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const generateDischargeSummaryByDoctor = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.userId; // From auth middleware

  const {
    "Final Diagnosis": finalDiagnosis,
    Complaints: complaints,
    "Past History": pastHistory,
    "Exam Findings": examFindings,
    "General Exam": generalExam,
    Radiology: radiology,
    Pathology: pathology,
    Operation: operation,
    "Treatment Given": treatmentGiven,
    "Condition on Discharge": conditionOnDischarge,

    // Options
    uploadToDriveFlag = true,
    template = "standard",
  } = req.body;

  try {
    // Get current IST time
    const getCurrentIST = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + istOffset);
      return istTime;
    };

    const currentIST = getCurrentIST();

    // Convert date to IST
    const convertToIST = (date) => {
      if (!date) return null;
      const inputDate = new Date(date);
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utc = inputDate.getTime() + inputDate.getTimezoneOffset() * 60000;
      return new Date(utc + istOffset);
    };

    // Validate required fields
    const requiredFields = {
      "Final Diagnosis": finalDiagnosis,
      Complaints: complaints,
      "Exam Findings": examFindings,
      "Condition on Discharge": conditionOnDischarge,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(
        ([key, value]) =>
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === "string" && value.trim() === "")
      )
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        code: "MISSING_REQUIRED_FIELDS",
        missingFields,
      });
    }

    // Fetch current patient data (not history)
    const patient = await patientSchema
      .findOne({ patientId })
      .populate("admissionRecords.doctor.id", "name specialization license")
      .populate("admissionRecords.section.id", "name type department");

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND",
      });
    }

    // Get latest admission record from patient schema
    const latestAdmission = patient.latestAdmission;

    if (!latestAdmission) {
      return res.status(404).json({
        success: false,
        error: "No active admission found for patient",
        code: "NO_ACTIVE_ADMISSION",
      });
    }

    // Check if patient is already discharged
    if (latestAdmission.status === "Discharged") {
      return res.status(400).json({
        success: false,
        error: "Patient is already discharged",
        code: "PATIENT_ALREADY_DISCHARGED",
      });
    }

    // Helper functions
    const formatArrayToText = (arr) => {
      if (!arr || !Array.isArray(arr)) return "N/A";
      return arr.join("\n");
    };

    const formatGeneralExam = (examObj) => {
      if (!examObj || typeof examObj !== "object") return "N/A";
      const examParts = [];
      if (examObj.Temp) examParts.push(`Temp : ${examObj.Temp}`);
      if (examObj.Pulse) examParts.push(`Pulse : ${examObj.Pulse}`);
      if (examObj.BP) examParts.push(`BP : ${examObj.BP}`);
      if (examObj.SPO2) examParts.push(`SPO2 : ${examObj.SPO2}`);
      return examParts.length > 0 ? examParts.join(", ") : "N/A";
    };

    const formatOperation = (opObj) => {
      if (!opObj || typeof opObj !== "object") return "N/A";
      let operationText = "";

      if (opObj.Type) operationText += `${opObj.Type}`;
      if (opObj.Date) operationText += ` On : ${opObj.Date}`;
      if (opObj.Surgeon) operationText += `\nSurgeon : ${opObj.Surgeon}`;
      if (opObj.Anaesthetist)
        operationText += `\nAnaesthetist : ${opObj.Anaesthetist}`;
      if (opObj["Anaesthesia Type"])
        operationText += `, Type : ${opObj["Anaesthesia Type"]}`;

      if (opObj.Procedure && Array.isArray(opObj.Procedure)) {
        operationText += "\nPROCEDURE -" + opObj.Procedure.join("\n");
      }

      return operationText || "N/A";
    };

    // Convert dates to IST
    const admissionDateIST = latestAdmission.admissionDate
      ? convertToIST(latestAdmission.admissionDate)
      : null;
    const dischargeDateIST = currentIST; // Current time as projected discharge
    const doctor = hospitalDoctors.findById(userId);
    // Prepare summary data from current patient record
    const summaryData = {
      // Patient basic info
      patientName: patient.name,
      age: patient.age || "N/A",
      sex: patient.gender || "N/A",
      address: patient.address || "N/A",

      // Admission details from current admission
      ipdNo: latestAdmission.ipdNumber || "N/A",
      opdNo: latestAdmission.opdNumber || "N/A",
      consultant: latestAdmission.doctor?.name || "N/A",
      admissionDate: admissionDateIST
        ? admissionDateIST.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "N/A",
      admissionTime: admissionDateIST
        ? admissionDateIST.toLocaleTimeString("en-IN", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A",
      dischargeDate: dischargeDateIST.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      dischargeTime: dischargeDateIST.toLocaleTimeString("en-IN", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      }),

      // Clinical data from doctor input
      finalDiagnosis: finalDiagnosis || "N/A",
      complaints: formatArrayToText(complaints),
      pastHistory:
        formatArrayToText(pastHistory) || "NO H/O - ANY DRUG ALLERGY",
      examFindings: formatArrayToText(examFindings),
      generalExam: formatGeneralExam(generalExam),
      radiology: formatArrayToText(radiology),
      pathology: formatArrayToText(pathology),
      operation: formatOperation(operation),
      treatmentGiven: formatArrayToText(treatmentGiven),
      conditionOnDischarge: conditionOnDischarge || "N/A",

      // Meta info
      generatedBy: doctor.doctorName || "N/A",
      generatedAt: currentIST,
      isDoctorGenerated: true,
      isPreview: true, // This is a preview, not saved yet
    };

    console.log(
      `Generating discharge summary preview for patient ${patientId} by doctor ${userId}`
    );

    // Generate HTML and PDF
    const htmlContent = generateManualDischargeSummaryHTML(summaryData);
    const pdfBuffer = await generatePdf(htmlContent);

    // Generate filename
    const timestamp = currentIST.toISOString().replace(/[:.]/g, "-");
    const sanitizedName = patient.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Discharge_Summary_Preview_${sanitizedName}_${timestamp}.pdf`;

    // Upload to Drive if requested (for preview)
    let driveLink = null;
    if (uploadToDriveFlag) {
      const folderId =
        process.env.DISCHARGE_SUMMARY_FOLDER_ID ||
        "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
      try {
        driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);
        console.log(
          `Discharge summary preview uploaded to Drive: ${driveLink}`
        );
      } catch (uploadError) {
        console.error("Error uploading preview to Drive:", uploadError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Discharge summary generated successfully (Preview Mode)",
      isPreview: true,
      data: {
        fileName,
        driveLink,
        pdfSize: pdfBuffer.length,
        generatedAt: summaryData.generatedAt,
        isDoctorGenerated: true,
        patientInfo: {
          patientId: patient.patientId,
          name: summaryData.patientName,
          age: summaryData.age,
          gender: summaryData.sex,
          opdNumber: summaryData.opdNo,
          ipdNumber: summaryData.ipdNo,
          currentStatus: latestAdmission.status,
        },
        summaryData: {
          consultant: summaryData.consultant,
          admissionDate: summaryData.admissionDate,
          dischargeDate: summaryData.dischargeDate,
          finalDiagnosis: summaryData.finalDiagnosis,
          conditionOnDischarge: summaryData.conditionOnDischarge,
        },
        // Include full summary data for saving later
        fullSummaryData: {
          finalDiagnosis,
          complaints,
          pastHistory,
          examFindings,
          generalExam,
          radiology,
          pathology,
          operation,
          treatmentGiven,
          conditionOnDischarge,
          uploadToDriveFlag,
          template,
        },
        // Additional metadata for save operation
        metadata: {
          admissionRecordId: latestAdmission._id,
          generatedBy: userId,
          generatedAt: currentIST,
          patientId: patient.patientId,
        },
      },
    });
  } catch (error) {
    console.error("Error generating discharge summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate discharge summary",
      code: "SUMMARY_GENERATION_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const confirmSaveSummaryToDB = async (req, res) => {
  const userId = req.userId; // From auth middleware

  const {
    patientId,
    driveLink,
    fileName,
    fullSummaryData,
    metadata,
    summaryData,
  } = req.body;

  try {
    // Validate doctor access

    // Validate required fields
    if (
      !patientId ||
      !driveLink ||
      !fileName ||
      !fullSummaryData ||
      !metadata
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields for saving summary",
        code: "MISSING_SAVE_FIELDS",
        required: [
          "patientId",
          "driveLink",
          "fileName",
          "fullSummaryData",
          "metadata",
        ],
      });
    }

    // Get current IST time
    const getCurrentIST = () => {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + istOffset);
      return istTime;
    };

    const currentIST = getCurrentIST();

    // Find patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND",
      });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.id(
      metadata.admissionRecordId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        error: "Admission record not found",
        code: "ADMISSION_RECORD_NOT_FOUND",
      });
    }

    // Check if summary already exists
    if (
      admissionRecord.dischargeSummary &&
      admissionRecord.dischargeSummary.isGenerated
    ) {
      return res.status(400).json({
        success: false,
        error: "Discharge summary already exists for this admission",
        code: "SUMMARY_ALREADY_EXISTS",
      });
    }

    // Save discharge summary data to admission record
    admissionRecord.dischargeSummary = {
      isGenerated: true,
      isDoctorGenerated: true,
      fileName: fileName,
      driveLink: driveLink,
      generatedBy: userId,
      generatedAt: currentIST,
      savedAt: currentIST,

      // Clinical data
      finalDiagnosis: fullSummaryData.finalDiagnosis,
      complaints: fullSummaryData.complaints,
      pastHistory: fullSummaryData.pastHistory,
      examFindings: fullSummaryData.examFindings,
      generalExam: fullSummaryData.generalExam,
      radiology: fullSummaryData.radiology,
      pathology: fullSummaryData.pathology,
      operation: fullSummaryData.operation,
      treatmentGiven: fullSummaryData.treatmentGiven,
      conditionOnDischarge: fullSummaryData.conditionOnDischarge,

      // Metadata
      template: fullSummaryData.template || "standard",
      version: "1.0",
    };

    // If finalizeDischarge is true, also update discharge status

    // Save patient record
    await patient.save();

    console.log(
      `Discharge summary saved to DB for patient ${patientId}, admission ${metadata.admissionRecordId}`
    );

    // Prepare response data
    const responseData = {
      success: true,
      message: "Discharge summary saved and patient marked as discharged",
      data: {
        patientId: patient.patientId,
        patientName: patient.name,
        admissionId: admissionRecord._id,
        opdNumber: admissionRecord.opdNumber,
        ipdNumber: admissionRecord.ipdNumber,

        dischargeSummary: {
          fileName: admissionRecord.dischargeSummary.fileName,
          driveLink: admissionRecord.dischargeSummary.driveLink,
          generatedAt: admissionRecord.dischargeSummary.generatedAt,
          savedAt: admissionRecord.dischargeSummary.savedAt,
          isDoctorGenerated: true,
        },

        admissionStatus: {
          status: admissionRecord.status,
          dischargeDate: admissionRecord.dischargeDate,
          conditionAtDischarge: admissionRecord.conditionAtDischarge,
        },

        clinicalSummary: {
          finalDiagnosis: admissionRecord.dischargeSummary.finalDiagnosis,
          conditionOnDischarge:
            admissionRecord.dischargeSummary.conditionOnDischarge,
        },
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error saving discharge summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save discharge summary",
      code: "SUMMARY_SAVE_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const getMedicationStatus = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const userId = req.userId;
    const userType = req.usertype;

    // Validate required parameters
    if (!patientId || !admissionId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID and Admission ID are required",
      });
    }

    // Validate MongoDB ObjectId format for admissionId
    if (!mongoose.Types.ObjectId.isValid(admissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID format",
      });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Get medications from the admission record
    const medications = admissionRecord.medications || [];

    // Get unique nurse IDs for population
    const nurseIds = medications
      .filter((med) => med.administeredBy)
      .map((med) => med.administeredBy)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    // Populate nurse data separately
    const Nurse = mongoose.model("Nurse");
    const nurses = await Nurse.find({
      _id: { $in: nurseIds },
    }).select("nurseName email usertype");

    // Create a nurse lookup map
    const nurseMap = {};
    nurses.forEach((nurse) => {
      nurseMap[nurse._id.toString()] = nurse;
    });

    if (medications.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No medications found for this admission",
        data: {
          patientInfo: {
            patientId: patient.patientId,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            contact: patient.contact,
          },
          admissionInfo: {
            admissionId: admissionRecord._id,
            opdNumber: admissionRecord.opdNumber,
            ipdNumber: admissionRecord.ipdNumber,
            admissionDate: admissionRecord.admissionDate,
            status: admissionRecord.status,
            doctor: admissionRecord.doctor,
            section: admissionRecord.section,
            bedNumber: admissionRecord.bedNumber,
          },
          medications: [],
          summary: {
            totalMedications: 0,
            pendingCount: 0,
            administeredCount: 0,
            skippedCount: 0,
          },
        },
      });
    }

    // Process medications with all necessary fields
    const medicationDetails = medications.map((med) => {
      const nurse = med.administeredBy
        ? nurseMap[med.administeredBy.toString()]
        : null;

      return {
        medicationId: med._id,
        name: med.name,
        dosage: med.dosage,
        type: med.type,
        scheduledDate: med.date,
        scheduledTime: med.time,
        administrationStatus: med.administrationStatus || "Pending",
        administeredBy: nurse
          ? {
              id: nurse._id,
              nurseName: nurse.nurseName,
              email: nurse.email,
              usertype: nurse.usertype,
            }
          : null,
        administeredAt: med.administeredAt,
        administrationNotes: med.administrationNotes || "",
        createdAt: med.createdAt || null,
        updatedAt: med.updatedAt || null,
      };
    });

    // Calculate summary statistics
    const summary = {
      totalMedications: medications.length,
      pendingCount: medications.filter(
        (med) =>
          !med.administrationStatus || med.administrationStatus === "Pending"
      ).length,
      administeredCount: medications.filter(
        (med) => med.administrationStatus === "Administered"
      ).length,
      skippedCount: medications.filter(
        (med) => med.administrationStatus === "Skipped"
      ).length,
    };

    // Sort medications by scheduled date and time
    medicationDetails.sort((a, b) => {
      // First sort by date
      if (a.scheduledDate && b.scheduledDate) {
        const dateA = new Date(a.scheduledDate);
        const dateB = new Date(b.scheduledDate);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
      }

      // Then by time
      if (a.scheduledTime && b.scheduledTime) {
        return a.scheduledTime.localeCompare(b.scheduledTime);
      }

      // Finally by medication name
      return a.name.localeCompare(b.name);
    });

    // Group medications by status for easier frontend handling
    const medicationsByStatus = {
      pending: medicationDetails.filter(
        (med) => med.administrationStatus === "Pending"
      ),
      administered: medicationDetails.filter(
        (med) => med.administrationStatus === "Administered"
      ),
      skipped: medicationDetails.filter(
        (med) => med.administrationStatus === "Skipped"
      ),
    };

    // Prepare response data
    const responseData = {
      patientInfo: {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        address: patient.address,
        imageUrl: patient.imageUrl,
      },
      admissionInfo: {
        admissionId: admissionRecord._id,
        opdNumber: admissionRecord.opdNumber,
        ipdNumber: admissionRecord.ipdNumber,
        admissionDate: admissionRecord.admissionDate,
        status: admissionRecord.status,
        doctor: admissionRecord.doctor,
        section: admissionRecord.section,
        bedNumber: admissionRecord.bedNumber,
        reasonForAdmission: admissionRecord.reasonForAdmission,
      },
      medications: medicationDetails,
      medicationsByStatus,
      summary,
      metadata: {
        requestedBy: userId,
        requestedByType: userType,
        timestamp: new Date(),
        totalRecords: medications.length,
      },
    };

    return res.status(200).json({
      success: true,
      message: "Medication status retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Error getting medication status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const getPatientEmergencyMedicationsForDoctor = async (req, res) => {
  try {
    const doctorId = req.userId;

    // Validate doctor authentication

    // Get specific patient and admission from params
    const { patientId: paramPatientId, admissionId: paramAdmissionId } =
      req.params;

    // Query parameters for filtering and pagination
    const {
      page = 1,
      limit = 10,
      status,
      patientId: queryPatientId,
      startDate,
      endDate,
      sortBy = "administeredAt",
      sortOrder = "desc",
    } = req.query;

    // Use param patientId if provided, otherwise use query patientId
    const finalPatientId = paramPatientId || queryPatientId;

    // Build the aggregation pipeline
    const pipeline = [
      // Stage 1: Initial match for specific patient if provided
      ...(finalPatientId ? [{ $match: { patientId: finalPatientId } }] : []),

      // Stage 2: Match for specific admission if provided
      ...(paramAdmissionId
        ? [
            {
              $match: {
                admissionId: new mongoose.Types.ObjectId(paramAdmissionId),
              },
            },
          ]
        : []),

      // Stage 3: Lookup patient information
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "patientId",
          as: "patient",
        },
      },
      // Stage 4: Unwind patient array
      {
        $unwind: "$patient",
      },
      // Stage 5: Match patients assigned to this doctor
      {
        $match: {
          "patient.admissionRecords": {
            $elemMatch: {
              "doctor.id": new mongoose.Types.ObjectId(doctorId),
              ...(paramAdmissionId
                ? { _id: new mongoose.Types.ObjectId(paramAdmissionId) }
                : {}),
            },
          },
        },
      },
      // Stage 6: Lookup nurse information for administeredBy
      {
        $lookup: {
          from: "nurses",
          localField: "administeredBy",
          foreignField: "_id",
          as: "nurse",
        },
      },
      // Stage 7: Lookup reviewing nurse information
      {
        $lookup: {
          from: "nurses",
          localField: "reviewedBy",
          foreignField: "_id",
          as: "reviewingNurse",
        },
      },
      // Stage 8: Lookup doctor approval information
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "doctorApproval.doctorId",
          foreignField: "_id",
          as: "approvingDoctor",
        },
      },
    ];

    // Add additional filters based on query parameters
    const matchStage = {};

    if (status) {
      matchStage.status = status;
    }

    // Don't add patientId to matchStage if it's already filtered in pipeline
    if (queryPatientId && !finalPatientId) {
      matchStage.patientId = queryPatientId;
    }

    if (startDate || endDate) {
      matchStage.administeredAt = {};
      if (startDate) {
        matchStage.administeredAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.administeredAt.$lte = new Date(endDate);
      }
    }

    // Add match stage if filters exist
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Add project stage to format the output
    pipeline.push({
      $project: {
        _id: 1,
        patientId: 1,
        admissionId: 1,
        medicationName: 1,
        dosage: 1,
        administeredAt: 1,
        nurseName: 1,
        reason: 1,
        status: 1,
        reviewedAt: 1,
        justification: 1,
        patient: {
          _id: "$patient._id",
          name: "$patient.name",
          age: "$patient.age",
          gender: "$patient.gender",
          contact: "$patient.contact",
          patientId: "$patient.patientId",
        },
        nurse: {
          $cond: {
            if: { $gt: [{ $size: "$nurse" }, 0] },
            then: {
              _id: { $arrayElemAt: ["$nurse._id", 0] },
              name: { $arrayElemAt: ["$nurse.name", 0] },
              employeeId: { $arrayElemAt: ["$nurse.employeeId", 0] },
            },
            else: null,
          },
        },
        reviewingNurse: {
          $cond: {
            if: { $gt: [{ $size: "$reviewingNurse" }, 0] },
            then: {
              _id: { $arrayElemAt: ["$reviewingNurse._id", 0] },
              name: { $arrayElemAt: ["$reviewingNurse.name", 0] },
              employeeId: { $arrayElemAt: ["$reviewingNurse.employeeId", 0] },
            },
            else: null,
          },
        },
        doctorApproval: {
          approved: "$doctorApproval.approved",
          notes: "$doctorApproval.notes",
          timestamp: "$doctorApproval.timestamp",
          doctor: {
            $cond: {
              if: { $gt: [{ $size: "$approvingDoctor" }, 0] },
              then: {
                _id: { $arrayElemAt: ["$approvingDoctor._id", 0] },
                name: { $arrayElemAt: ["$approvingDoctor.name", 0] },
                employeeId: {
                  $arrayElemAt: ["$approvingDoctor.employeeId", 0],
                },
              },
              else: null,
            },
          },
        },
      },
    });

    // Add sorting
    const sortStage = {};
    sortStage[sortBy] = sortOrder === "desc" ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // Execute aggregation with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const emergencyMedications = await EmergencyMedication.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    // Get total count for pagination
    const totalCount = await EmergencyMedication.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Group medications by status for summary
    const statusSummary = await EmergencyMedication.aggregate([
      ...pipeline.slice(0, -2), // Remove sort and project stages
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format status summary
    const summary = {
      total,
      pending: statusSummary.find((s) => s._id === "Pending")?.count || 0,
      approved: statusSummary.find((s) => s._id === "Approved")?.count || 0,
      rejected: statusSummary.find((s) => s._id === "Rejected")?.count || 0,
      pendingDoctorApproval:
        statusSummary.find((s) => s._id === "PendingDoctorApproval")?.count ||
        0,
    };

    res.status(200).json({
      success: true,
      message: "Emergency medications retrieved successfully",
      data: {
        emergencyMedications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
        summary,
        filters: {
          status,
          patientId: finalPatientId,
          admissionId: paramAdmissionId,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching emergency medications:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching emergency medications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Create new surgical notes
export const createSurgicalNotes = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const surgicalData = req.body;

    // Find patient and specific admission
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

    // Validate required fields
    const requiredFields = [
      "surgeryDate",
      "surgeryTime",
      "preOperativeDiagnosis",
      "indicationForSurgery",
      "surgicalProcedure",
      "anesthesiaType",
      "surgicalFindings",
      "procedureDescription",
      "postOperativeDiagnosis",
      "procedureOutcome",
    ];

    const missingFields = requiredFields.filter(
      (field) => !surgicalData[field]
    );
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }
    const surgeon = await hospitalDoctors.findById(req.userId);
    if (!surgeon) {
      return res.status(404).json({
        success: false,
        message: "Surgeon not found",
      });
    }
    surgicalData.surgeonName = surgeon.doctorName;
    // Add surgeon information from auth middleware
    surgicalData.surgeonId = req.userId;
    surgicalData.lastModifiedBy = req.userId;

    // Initialize surgical notes array if it doesn't exist
    if (!admission.surgicalNotes) {
      admission.surgicalNotes = [];
    }

    // Create new surgical note
    const surgicalNote = {
      ...surgicalData,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    admission.surgicalNotes.push(surgicalNote);

    // Save patient
    await patient.save();

    // Get the created note
    const createdNote =
      admission.surgicalNotes[admission.surgicalNotes.length - 1];

    res.status(201).json({
      success: true,
      message: "Surgical notes created successfully",
      data: createdNote,
    });
  } catch (error) {
    console.error("Error creating surgical notes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all surgical notes for a patient admission
export const getSurgicalNotes = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    const patient = await patientSchema
      .findOne({ patientId })
      .populate(
        "admissionRecords.surgicalNotes.surgeonId",
        "name specialization"
      )
      .populate("admissionRecords.surgicalNotes.assistantSurgeons.id", "name")
      .populate("admissionRecords.surgicalNotes.anesthesiologistId", "name");

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

    const surgicalNotes = admission.surgicalNotes || [];

    res.status(200).json({
      success: true,
      message: "Surgical notes retrieved successfully",
      data: surgicalNotes,
      count: surgicalNotes.length,
    });
  } catch (error) {
    console.error("Error retrieving surgical notes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get specific surgical note

// Update surgical notes
export const updateSurgicalNotes = async (req, res) => {
  try {
    const { patientId, admissionId, noteId } = req.params;
    const updateData = req.body;

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

    const surgicalNote = admission.surgicalNotes.id(noteId);
    if (!surgicalNote) {
      return res.status(404).json({
        success: false,
        message: "Surgical note not found",
      });
    }

    // Check if user is authorized to update (original surgeon or admin)
    if (
      surgicalNote.surgeonId.toString() !== req.userId &&
      req.usertype !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this surgical note",
      });
    }

    // Store previous version
    const previousVersion = {
      versionNumber: surgicalNote.version,
      modifiedAt: surgicalNote.updatedAt,
      modifiedBy: surgicalNote.lastModifiedBy,
      changes: "Updated surgical notes",
    };

    if (!surgicalNote.previousVersions) {
      surgicalNote.previousVersions = [];
    }
    surgicalNote.previousVersions.push(previousVersion);

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "version") {
        surgicalNote[key] = updateData[key];
      }
    });

    // Update metadata
    surgicalNote.updatedAt = new Date();
    surgicalNote.lastModifiedBy = req.userId;
    surgicalNote.version += 1;

    await patient.save();

    res.status(200).json({
      success: true,
      message: "Surgical notes updated successfully",
      data: surgicalNote,
    });
  } catch (error) {
    console.error("Error updating surgical notes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete surgical notes
export const deleteSurgicalNotes = async (req, res) => {
  try {
    const { patientId, admissionId, noteId } = req.params;

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

    const surgicalNote = admission.surgicalNotes.id(noteId);
    if (!surgicalNote) {
      return res.status(404).json({
        success: false,
        message: "Surgical note not found",
      });
    }

    // Check if user is authorized to delete (original surgeon or admin)
    if (
      surgicalNote.surgeonId.toString() !== req.userId &&
      req.usertype !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this surgical note",
      });
    }

    // Remove the surgical note
    admission.surgicalNotes.pull(noteId);
    await patient.save();

    res.status(200).json({
      success: true,
      message: "Surgical notes deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting surgical notes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

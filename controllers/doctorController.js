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

export const getAssignedPatients = async (req, res) => {
  try {
    const doctorId = req.userId; // Get doctor ID from authenticated user

    // Find all patients with admission records assigned to this doctor
    const patients = await patientSchema.find({
      "admissionRecords.doctor.id": doctorId,
    });

    // Filter admission records specifically assigned to this doctor
    const filteredPatients = patients.map((patient) => {
      const relevantAdmissions = patient.admissionRecords.filter(
        (record) => record.doctor && record.doctor.id.toString() === doctorId
      );
      return { ...patient.toObject(), admissionRecords: relevantAdmissions };
    });

    res.status(200).json({
      message: "Patients assigned to doctor retrieved successfully",
      patients: filteredPatients,
    });
  } catch (error) {
    console.error("Error retrieving assigned patients:", error);
    res
      .status(500)
      .json({ message: "Error retrieving patients", error: error.message });
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
    const { admissionId, admitNote } = req.body; // Get admission ID and admit note from request
    const doctorId = req.userId; // Get doctor ID from authenticated user
    console.log("doctor", doctorId);

    // Validate admission ID
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
    console.log(admissionRecord.doctor.id.toString());

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    if (admissionRecord.doctor.id.toString() !== doctorId) {
      return res.status(403).json({
        message: "You are not authorized to admit this patient",
      });
    }

    if (admissionRecord.status === "admitted") {
      return res.status(400).json({
        message: "This patient has already been admitted for this admission ID",
      });
    }

    // Update the admission record with the doctor details and admit note
    admissionRecord.status = "admitted"; // Update the status
    admissionRecord.admitNotes = admitNote || "General Ward"; // Save the admit note, default to General Ward if not provided

    // Save the updated patient document
    await patient.save();

    res.status(200).json({
      message: "Patient successfully admitted",
      patient: {
        id: patient._id,
        name: patient.name,
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
      // Mark patient as discharged if this was their last admission
      patient.discharged = true;
    }

    // Save the updated patient document
    await patient.save();

    const updatedPatient = await patientSchema.findOne({ patientId });
    console.log("Final discharged status in DB:", updatedPatient.discharged);

    // Fetch lab reports for this admission
    const labReports = await LabReport.find({ admissionId }).exec();

    // Add to PatientHistory
    let patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      // Create a new history document if it doesn't exist
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

    // Process follow-ups, ensuring we capture all data
    const followUps = admissionRecord.followUps.map((followUp) => ({
      ...followUp.toObject(),
    }));

    const fourHrFollowUpSchema = admissionRecord.fourHrFollowUpSchema.map(
      (followUp) => ({
        ...followUp.toObject(),
      })
    );

    // Process doctor notes
    const doctorNotes =
      admissionRecord.doctorNotes?.map((note) => ({
        ...note.toObject(),
      })) || [];

    // Process medications
    const medications =
      admissionRecord.medications?.map((medication) => ({
        ...medication.toObject(),
      })) || [];

    // Process IV fluids
    const ivFluids =
      admissionRecord.ivFluids?.map((fluid) => ({
        ...fluid.toObject(),
      })) || [];

    // Process procedures
    const procedures =
      admissionRecord.procedures?.map((procedure) => ({
        ...procedure.toObject(),
      })) || [];

    // Process special instructions
    const specialInstructions =
      admissionRecord.specialInstructions?.map((instruction) => ({
        ...instruction.toObject(),
      })) || [];

    // Create the history entry with ALL fields from admissionRecord
    const historyEntry = {
      admissionId,
      admissionDate: admissionRecord.admissionDate,
      dischargeDate: new Date(),
      status: admissionRecord.status,
      patientType: admissionRecord.patientType || "Internal", // Default value if not present

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

      // Add section and bed number if present
      section: admissionRecord.section,
      bedNumber: admissionRecord.bedNumber,

      // Add reports
      reports: admissionRecord.reports,

      // Add follow-ups and monitoring data
      followUps: followUps,
      fourHrFollowUpSchema: fourHrFollowUpSchema,

      // Add lab reports
      labReports: labReports.map((report) => ({
        labTestNameGivenByDoctor: report.labTestNameGivenByDoctor,
        reports: report.reports,
      })),

      // Add doctor prescriptions and consulting
      doctorPrescriptions: admissionRecord.doctorPrescriptions,
      doctorConsulting: admissionRecord.doctorConsulting,
      symptomsByDoctor: admissionRecord.symptomsByDoctor,
      diagnosisByDoctor: admissionRecord.diagnosisByDoctor,

      // Add vitals
      vitals: admissionRecord.vitals,

      // Add treatment records
      doctorNotes: doctorNotes,
      medications: medications,
      ivFluids: ivFluids,
      procedures: procedures,
      specialInstructions: specialInstructions,
    };

    // Push the complete history entry
    patientHistory.history.push(historyEntry);

    // Save the history document
    await patientHistory.save();

    // Notify the doctor about the discharge
    notifyDoctor(doctorId, patientId, admissionRecord);

    res.status(200).json({
      message: "Patient discharged successfully",
      updatedPatient: patient,
      updatedHistory: patientHistory,
    });
  } catch (error) {
    console.error("Error discharging patient:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
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
    "A.M.A.",
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

    // Extract relevant details
    const response = {
      medications: admissionRecord.medications || [],
      ivFluids: admissionRecord.ivFluids || [],
      procedures: admissionRecord.procedures || [],
      specialInstructions: admissionRecord.specialInstructions || [],
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

export const updateMedicine = async (req, res) => {
  try {
    const doctorId = req.userId;
    const { medicineId } = req.params;
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

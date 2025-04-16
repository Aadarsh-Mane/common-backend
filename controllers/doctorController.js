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

    // Return doctor profile
    return res.status(200).json({ doctorProfile });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return res
      .status(500)
      .json({ message: "Error fetching doctor profile", error: error.message });
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
  const doctorId = req.userId; // Get the doctorId from the request's user (assuming you're using authentication)

  try {
    // Fetch lab reports where the doctorId matches the logged-in doctor and patientId is not null
    const labReports = await LabReport.find({
      doctorId,
      patientId: { $ne: null },
    }) // Filter out records with null patientId
      .populate({
        path: "patientId",
        match: { admissionRecords: { $exists: true, $not: { $size: 0 } } }, // Exclude patients with empty admissionRecords
        select: "name age gender contact admissionRecords", // Select specific fields from the Patient schema
      })
      .populate({
        path: "doctorId",
        select: "doctorName email", // Select specific fields from the Doctor schema
      })
      .sort({ _id: -1 }); // Sort by _id in descending order (newest documents first)

    // Filter out lab reports where patientId is null after population
    const filteredLabReports = labReports.filter((report) => report.patientId);

    if (!filteredLabReports || filteredLabReports.length === 0) {
      return res.status(404).json({
        message: "No patients with admission records assigned by this doctor.",
      });
    }

    res.status(200).json({
      message: "Patients assigned by the doctor retrieved successfully",
      labReports: filteredLabReports,
    });
  } catch (error) {
    console.error("Error retrieving patients assigned by doctor:", error);
    res
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
      `http://localhost:3000/doctors/getPatientSuggestion/${patientId}`
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
    const doctorId = req.userId; // Extract doctorId from req.userId

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required" });
    }

    // Find all patient records that contain appointments for this doctor
    const appointments = await PatientAppointment.find({
      "appointments.doctorId": doctorId,
    });

    if (!appointments || appointments.length === 0) {
      return res
        .status(404)
        .json({ message: "No appointments found for this doctor" });
    }

    // Extract only the appointments that belong to this doctor
    const doctorAppointments = appointments.flatMap((patient) =>
      patient.appointments
        .filter((appt) => appt.doctorId === doctorId)
        .map((appt) => ({
          _id: appt._id, // Include MongoDB generated ID
          patientId: patient.patientId,
          patientName: patient.patientName,
          patientContact: patient.patientContact,
          doctorId: appt.doctorId,
          doctorName: appt.doctorName,
          doctorSpecialization: appt.doctorSpecialization,
          symptoms: appt.symptoms,
          appointmentType: appt.appointmentType,
          date: appt.date,
          time: appt.time,
          status: appt.status,
          paymentStatus: appt.paymentStatus,
          rescheduledTo: appt.rescheduledTo,
          createdAt: appt.createdAt, // Timestamp of when the appointment was created
          updatedAt: appt.updatedAt, // Timestamp of last update
        }))
    );

    res.status(200).json({ doctorAppointments });
  } catch (error) {
    console.error("Error fetching doctor's appointments:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    const { patientId, appointmentId, newDate, newTime } = req.body;

    if (!patientId || !appointmentId || !newDate || !newTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the patient record
    const patient = await PatientAppointment.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific appointment
    const appointment = patient.appointments.id(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Update appointment details
    appointment.status = "rescheduled";
    appointment.rescheduledTo = `${newDate} ${newTime}`;
    appointment.date = newDate;
    appointment.time = newTime;

    // Save the updated patient document
    await patient.save();

    res
      .status(200)
      .json({ message: "Appointment rescheduled successfully", appointment });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { patientId, appointmentId, status } = req.body;
    const doctorId = req.userId; // Extract doctorId from authenticated user

    if (!patientId || !appointmentId || !status || !doctorId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["completed", "canceled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status update" });
    }

    // Find the patient record
    const patientRecord = await PatientAppointment.findOne({ patientId });

    if (!patientRecord) {
      return res.status(404).json({ message: "Patient record not found" });
    }

    // Find the index of the appointment
    const appointmentIndex = patientRecord.appointments.findIndex(
      (appt) =>
        appt._id.toString() === appointmentId && appt.doctorId === doctorId
    );

    if (appointmentIndex === -1) {
      return res
        .status(404)
        .json({ message: "Appointment not found or unauthorized" });
    }

    if (status === "canceled") {
      // ❌ Delete the appointment if canceled
      patientRecord.appointments.splice(appointmentIndex, 1);
      await patientRecord.save();
      return res
        .status(200)
        .json({ message: "Appointment canceled and removed" });
    } else if (status === "completed") {
      // ✅ Update status to completed
      patientRecord.appointments[appointmentIndex].status = "completed";
      await patientRecord.save();
      return res
        .status(200)
        .json({ message: "Appointment marked as completed" });
    }
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({ message: "Internal Server Error" });
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

import { client } from "../../helpers/twilio.js";
import hospitalDoctors from "../../models/hospitalDoctorSchema.js";
import PatientHistory from "../../models/patientHistorySchema.js";
import patientSchema from "../../models/patientSchema.js";
import { sendNotification } from "../notifyController.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { fileURLToPath } from "url"; // To handle __dirname in ESM
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import puppeteer from "puppeteer";
import { response } from "express";
import mongoose from "mongoose";
import pdf from "html-pdf";
import dotenv from "dotenv";
import moment from "moment";
import cloudinary from "../../helpers/cloudinary.js";
import { generatePdf } from "../../services/pdfGenerator.js";
import { uploadToDrive } from "../../services/uploader.js";
import Appointment from "../../models/appointmentSchema.js";
import PatientAppointment from "../../models/appointmentSchema.js";
import externalDoctors from "../../models/externalDoctor.js";
import Section from "../../models/sectionSchema.js";
import BillingRecord from "../../models/hospitalSchema.js";
import {
  generateDischargeSummaryHTML,
  generateManualDischargeSummaryHTML,
} from "../../utils/dischargeSummary.js";
import {
  generateDischargeBillHTML,
  generateOPDBillHTML,
} from "../../utils/dischargeBill.js";
import Bill from "../../models/billtrachSchema.js";
import DepositReceipt from "../../models/depositSchema.js";
import { generateDepositReceiptHTML } from "../../utils/depositBill.js";
import PatientCounter from "../../models/patientCounter.js";
import { DischargeSummary } from "../../models/dischargeSummarySchema.js";
import {
  generateConsultingHTML,
  generateDiagnosisHTML,
  generateDoctorNotesHTML,
  generatePrescriptionsHTML,
  generateSymptomsHTML,
  generateVitalsHTML,
} from "../../services/medicalRecordGenerator.js";
dotenv.config(); // Load environment variables from .env file
dayjs.extend(utc);
dayjs.extend(timezone);

// export const addPatient = async (req, res) => {
//   const {
//     name,
//     age,
//     gender,
//     contact,
//     address,
//     weight,
//     caste,
//     reasonForAdmission,
//     symptoms,
//     initialDiagnosis,
//     isReadmission
//   } = req.body;

//   try {
//     let patient = await patientSchema.findOne({ name, contact });

//     if (patient) {
//       let daysSinceLastAdmission = null;

//       // Check if the patient has been discharged
//       if (!patient.discharged) {
//         // If not discharged, calculate days since last admission
//         if (patient.admissionRecords.length > 0) {
//           const lastAdmission =
//             patient.admissionRecords[patient.admissionRecords.length - 1]
//               .admissionDate;
//           daysSinceLastAdmission = dayjs().diff(dayjs(lastAdmission), "day");
//         }
//       } else {
//         // Patient has been discharged, check history for the last discharge date
//         let patientHistory = await PatientHistory.findOne({
//           patientId: patient.patientId,
//         });

//         if (patientHistory) {
//           // Fetch the latest discharge date from the history
//           const lastDischarge = patientHistory.history
//             .filter((entry) => entry.dischargeDate)
//             .sort((a, b) =>
//               dayjs(b.dischargeDate).isBefore(a.dischargeDate) ? -1 : 1
//             )[0];

//           if (lastDischarge) {
//             // Calculate the days since last discharge
//             daysSinceLastAdmission = dayjs().diff(
//               dayjs(lastDischarge.dischargeDate),
//               "day"
//             );
//           }
//         }

//         // Set discharged status to false for re-admission
//         patient.discharged = false;
//       }

//       // Add new admission record
//       patient.admissionRecords.push({
//         admissionDate: new Date(),
//         reasonForAdmission,
//         symptoms,
//         initialDiagnosis,
//       });

//       // Save updated patient record
//       await patient.save();

//       return res.status(200).json({
//         message: `Patient ${name} re-admitted successfully.`,
//         patientDetails: patient,
//         daysSinceLastAdmission,
//         admissionRecords: patient.admissionRecords,
//       });
//     }

//     // If patient does not exist, create a new one with a generated patientId
//     const patientId = generatePatientId(name);

//     patient = new patientSchema({
//       patientId,
//       name,
//       age,
//       gender,
//       contact,
//       address,
//       weight,
//       caste,
//       admissionRecords: [
//         {
//           admissionDate: new Date(),
//           reasonForAdmission,
//           symptoms,
//           initialDiagnosis,
//         },
//       ],
//     });
//     await patient.save();
//     // const messageBody = `Dear ${name}, welcome to our spandan hospital. Your patient ID is ${patientId}. Wishing you a speedy recovery!`;

//     // await client.messages.create({
//     //   from: "+14152149378", // Twilio phone number
//     //   to: contact,
//     //   body: messageBody,
//     // });

//     res.status(200).json({
//       message: `Patient ${name} added successfully with ID ${patientId}.`,
//       patientDetails: patient,
//     });
//   } catch (error) {
//     console.error("Error adding patient:", error);
//     res
//       .status(500)
//       .json({ message: "Error adding patient", error: error.message });
//   }
// };
// const generatePatientId = (name) => {
//   const initials = name.slice(0, 3).toUpperCase(); // First three letters of the name
//   const randomDigits = Math.floor(100 + Math.random() * 900); // Generate three random digits
//   return `${initials}${randomDigits}`;
// };
export const generateUniqueId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  let id = "";

  // Generate 3 random letters
  for (let i = 0; i < 3; i++) {
    id += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate 3 random numbers
  for (let i = 0; i < 3; i++) {
    id += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return id;
};

export const addPatient = async (req, res) => {
  const {
    name,
    age,
    gender,
    contact,
    address,
    weight,
    caste,
    dob,
    reasonForAdmission,
    symptoms,
    initialDiagnosis,
    isReadmission,
  } = req.body;
  const file = req.file;

  try {
    console.log(req.body);
    let patient;
    let imageUrl = "";

    // Handle file upload if present
    if (file) {
      const auth = new google.auth.GoogleAuth({
        credentials: ServiceAccount,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      const drive = google.drive({ version: "v3", auth });

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      const fileMetadata = {
        name: file.originalname,
        parents: ["1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"],
      };
      const media = {
        mimeType: file.mimetype,
        body: bufferStream,
      };

      const uploadResponse = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });

      imageUrl = uploadResponse.data.webViewLink;
    }

    if (isReadmission === "true") {
      // Handle readmission
      if (!req.body.patientId) {
        return res.status(404).json({
          error: "Patient ID is required for readmission.",
        });
      }

      patient = await patientSchema.findOne({
        patientId: req.body.patientId,
      });

      if (!patient) {
        return res.status(404).json({
          message: "Patient not found for readmission.",
        });
      }

      if (!patient.discharged) {
        return res.status(400).json({
          message: "Patient is not discharged.",
        });
      }

      // Check if patient has been discharged by reception
      const patientHistory = await PatientHistory.findOne({
        patientId: req.body.patientId,
      });

      if (patientHistory && patientHistory.history.length > 0) {
        const lastRecord =
          patientHistory.history[patientHistory.history.length - 1];
        if (!lastRecord.dischargedByReception) {
          return res.status(400).json({
            message: "Patient has not been discharged by reception.",
          });
        }
      }

      let daysSinceLastAdmission = null;

      // Calculate days since last discharge
      if (patientHistory && patientHistory.history.length > 0) {
        const lastDischarge = patientHistory.history
          .filter((entry) => entry.dischargeDate)
          .sort((a, b) =>
            dayjs(b.dischargeDate).isBefore(a.dischargeDate) ? -1 : 1
          )[0];

        if (lastDischarge) {
          daysSinceLastAdmission = dayjs().diff(
            dayjs(lastDischarge.dischargeDate),
            "day"
          );
        }
      }

      // Get next OPD number for readmission
      const opdNumber = await PatientCounter.getNextSequenceValue("opdNumber");

      // Set discharged status to false for re-admission
      patient.discharged = false;

      // Update patient details
      patient.name = name;
      patient.age = age;
      patient.gender = gender;
      patient.contact = contact;
      patient.address = address;
      patient.caste = caste;
      if (imageUrl) patient.imageUrl = imageUrl;

      // Add new admission record for re-admission with OPD number
      patient.admissionRecords.push({
        admissionDate: new Date(),
        reasonForAdmission,
        weight,
        symptoms,
        initialDiagnosis,
        opdNumber: opdNumber, // Add OPD number
        status: "Pending", // Initial status for new admission
      });

      await patient.save();

      return res.status(200).json({
        message: `Patient ${name} re-admitted successfully with OPD Number: ${opdNumber}.`,
        patientDetails: patient,
        daysSinceLastAdmission,
        opdNumber,
        admissionRecords: patient.admissionRecords,
      });
    } else {
      // Create new patient
      const patientId = generatePatientId(name);
      const opdNumber = await PatientCounter.getNextSequenceValue("opdNumber");

      patient = new patientSchema({
        patientId,
        name,
        age,
        gender,
        contact,
        address,
        caste,
        imageUrl,
        admissionRecords: [
          {
            admissionDate: new Date(),
            reasonForAdmission,
            symptoms,
            initialDiagnosis,
            weight,
            opdNumber: opdNumber, // Add OPD number
            status: "Pending",
          },
        ],
      });

      await patient.save();

      return res.status(200).json({
        message: `Patient ${name} added successfully with ID ${patientId} and OPD Number: ${opdNumber}.`,
        patientDetails: patient,
        opdNumber,
      });
    }
  } catch (error) {
    console.error("Error adding patient:", error);
    res.status(500).json({
      message: "Error adding patient",
      error: error.message,
    });
  }
};
const generatePatientId = (name) => {
  const initials = name.slice(0, 3).toUpperCase(); // First three letters of the name
  const randomDigits = Math.floor(100 + Math.random() * 900); // Generate three random digits
  return `${initials}${randomDigits}`;
};

export const acceptAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { note } = req.body; // Optional note field

  try {
    // Find the appointment by ID
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Update status and note
    appointment.status = "Confirmed";
    if (note) appointment.note = note;

    await appointment.save();

    res.status(200).json({
      message: `Appointment for ${appointment.name} confirmed successfully.`,
      appointmentDetails: appointment,
    });
  } catch (error) {
    console.error("Error confirming appointment:", error);
    res
      .status(500)
      .json({ message: "Error confirming appointment", error: error.message });
  }
};
export const assignDoctor = async (req, res) => {
  try {
    const { patientId, doctorId, admissionId, isReadmission } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the doctor
    const doctor = await hospitalDoctors.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if admission record exists
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }
    // if (admissionRecord.doctor && admissionRecord.doctor.id.equals(doctorId)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Doctor is already assigned to this patient" });
    // }
    // Assign doctor to admission record
    admissionRecord.doctor = {
      id: doctorId,
      name: doctor.doctorName,
      usertype: doctor.usertype,
    };
    await patient.save();

    // Check if doctor has FCM token
    if (doctor.fcmToken) {
      // Send notification to the doctor
      const title = "New Patient Assignment";
      const body = `You have been assigned a new patient: ${patient.name}`;
      await sendNotification(doctor.fcmToken, title, body);
    } else {
      console.warn("Doctor does not have an FCM token. Notification not sent.");
    }

    return res
      .status(200)
      .json({ message: "Doctor assigned successfully", patient });
  } catch (error) {
    console.error("Error assigning doctor:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
// Controller to list all available doctors
export const listDoctors = async (req, res) => {
  try {
    // Retrieve all doctors, with an option to filter by availability if required
    const doctors = await hospitalDoctors
      .find()
      .select("-password -createdAt -fcmToken");

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "No available doctors found." });
    }

    res.status(200).json({ doctors });
  } catch (error) {
    console.error("Error listing doctors:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve doctors.", error: error.message });
  }
};
export const listExternalDoctors = async (req, res) => {
  try {
    // Retrieve all doctors, with an option to filter by availability if required
    const doctors = await hospitalDoctors
      .find({
        usertype: "external",
        // available: true,
      })
      .select("-password -createdAt -fcmToken");

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "No available doctors found." });
    }

    res.status(200).json({ doctors });
  } catch (error) {
    console.error("Error listing doctors:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve doctors.", error: error.message });
  }
};
// Controller to list all patients
export const listPatients = async (req, res) => {
  try {
    // Retrieve all patients from the database
    const patients = await patientSchema.find().sort({ _id: -1 });

    if (!patients || patients.length === 0) {
      return res.status(404).json({ message: "No patients found." });
    }

    res.status(200).json({ patients });
  } catch (error) {
    console.error("Error listing patients:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve patients.", error: error.message });
  }
};
export const getDoctorsPatient = async (req, res) => {
  try {
    const { doctorName } = req.params; // Assuming doctor name is passed as a query parameter

    // Find patients where any admission record has the specified doctor name
    const patients = await patientSchema.find({
      admissionRecords: {
        $elemMatch: { "doctor.name": doctorName },
      },
    });

    // If no patients are found, return a 404 message
    if (!patients || patients.length === 0) {
      return res
        .status(404)
        .json({ message: "No patients found for this doctor" });
    }

    // Return the list of patients assigned to this doctor
    return res.status(200).json({ patients });
  } catch (error) {
    console.error("Error retrieving doctor's patients:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getDischargedPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    const patientHistory = await PatientHistory.aggregate([
      {
        $match: { patientId: patientId }, // Match the specific patient by ID
      },
      {
        $project: {
          _id: 0,
          patientId: 1,
          name: 1,
          gender: 1,
          contact: 1,
          lastRecord: { $arrayElemAt: ["$history", -1] }, // Get the last element of the history array
        },
      },
    ]);

    if (patientHistory.length === 0) {
      return res
        .status(404)
        .json({ error: "Patient not found or no history available." });
    }

    const result = patientHistory[0];

    // Format the dates in the last record
    if (result.lastRecord) {
      const lastRecord = result.lastRecord;
      lastRecord.admissionDate = dayjs(lastRecord.admissionDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD hh:mm:ss A"); // Format: 2025-01-04 03:18:43 PM
      lastRecord.dischargeDate = dayjs(lastRecord.dischargeDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD hh:mm:ss A");
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching patient history:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
// export const dischargePatientByReception = async (req, res) => {
//   try {
//     const { patientId, admissionId, amountPaid } = req.body;

//     if (!patientId || !admissionId || amountPaid == null) {
//       return res.status(400).json({
//         error: "Patient ID, admission ID, and amount paid are required.",
//       });
//     }

//     // Find the patient record
//     const patient = await patientSchema.findOne({ patientId });

//     if (!patient) {
//       return res.status(404).json({ error: "Patient not found." });
//     }

//     // Find the admission record
//     const admissionRecord = patient.admissionRecords.find(
//       (record) => record._id.toString() === admissionId
//     );

//     if (!admissionRecord) {
//       return res.status(404).json({ error: "Admission record not found." });
//     }

//     // Calculate remaining amount
//     const { amountToBePayed } = admissionRecord;
//     const previousPendingAmount = patient.pendingAmount || 0;
//     const totalAmountDue = amountToBePayed + previousPendingAmount;
//     const newPendingAmount = totalAmountDue - amountPaid;

//     // Update admission record and patient pending amount
//     admissionRecord.dischargeDate = new Date(); // Set discharge date
//     admissionRecord.status = "Discharged"; // Update status
//     admissionRecord.previousRemainingAmount = previousPendingAmount;

//     // Update pending amount in the patient schema
//     patient.pendingAmount = Math.max(newPendingAmount, 0);
//     patient.discharged = newPendingAmount <= 0; // Mark as fully settled if no pending amount

//     await patient.save();

//     return res.status(200).json({
//       message: "Patient discharged successfully.",
//       updatedAdmissionRecord: admissionRecord,
//       updatedPendingAmount: patient.pendingAmount,
//     });
//   } catch (error) {
//     console.error("Error discharging patient:", error);
//     return res.status(500).json({ error: "Internal server error." });
//   }
// };
export const dischargePatientByReception = async (req, res) => {
  try {
    const { patientId, admissionId, amountPaid } = req.body;

    if (!patientId || !admissionId || amountPaid == null) {
      return res.status(400).json({
        error: "Patient ID, admission ID, and amount paid are required.",
      });
    }

    // Find the patient record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Fetch the patient's history to get the most recent admission record
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory || patientHistory.history.length === 0) {
      return res.status(404).json({ error: "Patient history not found." });
    }

    // Find the most recent admission record in the history
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const { amountToBePayed } = lastRecord;

    // Calculate remaining amount
    const previousPendingAmount = patient.pendingAmount || 0;
    const totalAmountDue = amountToBePayed + previousPendingAmount;
    const newPendingAmount = totalAmountDue - amountPaid;

    // Update the pending amount in the patient schema
    patient.pendingAmount = Math.max(newPendingAmount, 0); // Ensure no negative pending amount
    patient.discharged = newPendingAmount <= 0; // Mark as fully discharged if no pending amount

    await patient.save();

    return res.status(200).json({
      message: "Patient discharged successfully.",
      updatedPendingAmount: patient.pendingAmount,
    });
  } catch (error) {
    console.error("Error discharging patient:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
const ServiceAccount = {
  type: "service_account",
  project_id: "doctor-dd7e8",
  private_key_id: "368a04ac49ec5efde71ccbdd682fbedf9bccd513",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5gOfzkapJPjva\nAXrXdmnhZc3Lsws8nGqMv1HUUSwsR+bKkUtK+UI5N7bBrhD/ydad1GILXvS2QF2D\nxDImTS0Nk4Y7OokUHR1v4/iXtPVTC/VMU+Zcrudl+RL8uei/UOzcfLEDI8s0Qgly\naZtjqGI9fYQU2Ig1XXkcSYHCKvY6352E8NBxI+yA7VRzyZnv/MEuozCPvayKGtnH\n3ol7I76PKJHRkgKV6omZhKWlUXBdNMU0cdIthJcXdEr0RrcyRUyITaibcYXsbJMT\nEo+1iA5PxlUelQpJcVd4Pj91y3VfslP3zcNFeEFS6d3ua2mnQ3uTbGxr0BqTlUEG\nPx9UBQoXAgMBAAECggEANy5QUVUIaac4mJ4OE5/m2SS2dhy5f/sretjCl7zZvgZZ\ncfKMii3hdDHNjImiBuTckbCGxckmVDyLVNH89QXKHBrBOEcuVaxfgFQ5M6+htmV9\nP4pJoVJqBRx1eHY49Qg2nVP+N+fi35WxR7aAgcGqD46Rxr2urukySKbZEZBEFLjE\nUCy/j+qhAPhPXQgj4TCahLM55u9Yj21l7BijVgGPEagOKWSEV1pBBEvtWEu/6oSA\n3VHBWA1ggJok2lbdUs8RmXWaebKikoioLfhj6Cbbc378vjmeda1mfYsir8dXa+7Z\nBnPjjJzh3s7gBEIETcoBvLIVT/JrDTTnTy1NGlmq2QKBgQDkgfgpWuKupzy3T9PO\nIhF1/C/kbjiFbiFBd0Z1cVlc5aeeBG7LgGYRfjPhoax4Y7/2zIalDld6b2t0Zcoo\noKLzcZtogrdUoKDu0aXbRiDyoCOYXGw8kpxRORgcWbmCCPfKqfFRSz5gS+5Ur96O\nTVRvZeqiipaGalU4pJvfimYHJQKBgQDP0mjxt9K9j2aFaEA2wbaqjfe4rKVYSjzx\nNYXEZmH1T4ml2K824CtQZxk5TXFOZybkQlquTLGkQNaQgaXIBhfKmqp6MyjjXwED\nGL+omLRkhbNpSpd3rBejf3xG+R0OphsAXTnnEKmLJp6vYG3inZjAyxaVE8xS98IA\nlIcUCaq1iwKBgAcwh6xVbbhtDp395v4fWElMC/218hVQp781j4P2cwdXOnTgUtQY\nUB3QyLUaryCCkvGi8cGTt/DkPI9G/JtWooniUy9wnXAONcIN2pgRlsvLehM7JTSq\nsDxl/Xo24H1U5ub7fdo+8dF50h/cALadfECdBkri7WWBRvknRLg91IP5AoGBAMvc\ne1WiHPgWU1tKiLMuEyH7YaWmtguFx4JWHoIqbK1W+I/XnwkVnWehuvybGyrtxRjk\nfk+8rAWUFOZsR1OPpob4cYKt7M4dw8Bl5pxcL5jsDrKamTqrdgTMafy1IevcxV/2\nE3a2wZneqIsg7KoALnfwwJY8dZJtt8EZ8eeWE/9BAoGAYz6ywuupL45ow8HifRhy\nm583Z0+fWejLqxwo0W4f8SkNklfhRYaNpxtNi4x504wMxm6Uv7fetYANg9e5D64T\nOEjOAvzdUxv+Hv15S7ZIgctV9Bq9BMcF6X1h1j1aajJLZfpVoFefxVSuWVLalNn9\nOX+WIQ9M0p7Dg1Nkicp/SrU=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-lcnp1@doctor-dd7e8.iam.gserviceaccount.com",
  client_id: "113298677154530909102",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-lcnp1%40doctor-dd7e8.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};
export const generateBillForDischargedPatient = async (req, res) => {
  console.log("generateBillForDischargedPatient");
  try {
    const {
      patientId,
      bedCharges,
      procedureCharges,
      medicineCharges,
      doctorCharges,
      investigationCharges,
      status,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    // Find the patient record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Fetch the patient's most recent admission history
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory || patientHistory.history.length === 0) {
      return res.status(404).json({ error: "Patient history not found." });
    }

    // Get the last record (most recent admission)
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const {
      name,
      gender,
      contact,
      weight,
      age,
      admissionDate,
      dischargeDate,
      reasonForAdmission,
      conditionAtDischarge,
      doctor,
    } = lastRecord;

    // Start with the pending amount from the patient schema and last admission record

    // Calculate bed charges dynamically (if provided)
    // Calculate bed charges dynamically
    let totalAmountDue = 0;

    // Calculate dynamic charges
    const calculateCharges = (charges, categories, rateKey, quantityKey) => {
      charges.total = 0;
      categories.forEach((type) => {
        const {
          [rateKey]: rate,
          [quantityKey]: quantity,
          date,
        } = charges[type] || {};
        if (rate && quantity > 0 && date) {
          const charge = rate * quantity;
          charges.total += charge;
          charges[type].total = charge;
        }
      });
      return charges.total;
    };

    if (bedCharges) {
      const bedCategories = ["icu", "singleAc", "singleRoom", "generalWard"];
      totalAmountDue += calculateCharges(
        bedCharges,
        bedCategories,
        "ratePerDay",
        "quantity"
      );
    }

    if (doctorCharges) {
      const doctorCategories = [
        "icuVisiting",
        "generalVisiting",
        "externalVisiting",
      ];
      totalAmountDue += calculateCharges(
        doctorCharges,
        doctorCategories,
        "ratePerVisit",
        "visits"
      );
    }

    if (procedureCharges) {
      const procedureCategories = ["oxygen"];
      totalAmountDue += calculateCharges(
        procedureCharges,
        procedureCategories,
        "ratePerUnit",
        "quantity"
      );
    }

    if (investigationCharges) {
      const investigationCategories = ["ecg", "xray", "ctScan", "sonography"];
      totalAmountDue += calculateCharges(
        investigationCharges,
        investigationCategories,
        "ratePerTest",
        "quantity"
      );
    }

    if (medicineCharges) {
      totalAmountDue += medicineCharges.total || 0;
    }

    // Apply ICS and other adjustments to the bill calculation

    // Calculate the remaining balance after payment

    // Update the pending amount in the patient schema
    // lastRecord.dischargedByReception = true;
    await patientHistory.save();
    // Save the updated patient record
    await patient.save();

    // Prepare the final bill details
    const billDetails = {
      patientId: patientId || "N/A",
      name: patient.name,
      gender: patient.gender,
      contact: patient.contact || "N/A",
      weight: weight || "N/A",
      age: patient.age || "N/A",
      admissionDate: admissionDate || "N/A",
      dischargeDate: dischargeDate || "N/A",
      reasonForAdmission: reasonForAdmission || "N/A",
      conditionAtDischarge: conditionAtDischarge || "N/A",
      doctorName: doctor?.name || "N/A",
      bedCharges: bedCharges || {},
      procedureCharges: procedureCharges || {},
      doctorCharges: doctorCharges || {},
      investigationCharges: investigationCharges || {},

      medicineCharges: medicineCharges || { totalCost: 0 },
      totalAmountDue: totalAmountDue || 0,
      amountPaid: status?.amountPaid || 0,
      remainingBalance: status?.remainingBalance || 0,
      dischargeStatus: patient.discharged
        ? "Fully Discharged"
        : "Pending Balance",
      paymentMode: status?.paymentMode || "N/A",
      insuranceCompany: status?.insuranceCompany || "N/A",
      conditionAtDischargePoint: status?.conditionAtDischargePoint || "N/A",
    };

    // HTML template for the bill
    const billHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hospital Bill</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 20px;
        }
        img {
            background-color: transparent;
        }
        .header img {
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            color: #333;
        }
        .header p {
            margin: 5px 0;
            font-size: 12px;
            color: #555;
        }
        .header-details {
            margin: 20px 0;
            font-size: 14px;
            line-height: 1.8;
        }
        .header-details strong {
            color: #000;
        }
        .patient-details {
            margin: 20px 0;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            display: flex;
            flex-wrap: wrap;
        }
        .patient-details div {
            width: 24%;
            margin-bottom: 10px;
        }
        .patient-details div strong {
            color: #000;
        }
        .charges {
            margin-top: 20px;
            width: 100%;
            border-collapse: collapse;
        }
        .charges th, .charges td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        .charges th {
            background-color: #f7f7f7;
            font-size: 14px;
        }
        .charges td {
            font-size: 12px;
        }
        .charges tr:hover {
            background-color: #f0f0f0;
        }
        .charges th[colspan="5"] {
            text-align: left;
            font-size: 14px;
            font-weight: bold;
            background-color: #e0e0e0;
        }
        .summary {
            margin-top: 30px;
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #ddd;
        }
        .summary h2 {
            margin-top: 0;
            font-size: 18px;
            color: #444;
        }
        .summary p {
            margin: 10px 0;
            font-size: 14px;
            color: #333;
        }
        .summary strong {
            color: #000;
        }
        @page {
            size: A4;
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="Hospital Logo" />
        <h1>Hospital Bill</h1>
    </div>
    <div class="patient-details">
        <tr>
            <td class="bold"><strong>Patient ID:</strong> <span id="patientId">${
              billDetails.patientId || "N/A"
            }</span></td>
            <td class="bold"><strong>Patient Name:</strong> <span id="name">${
              billDetails.name || "N/A"
            }</span></td>
        </tr>
        <tr>
            <td class="bold"><strong>Treating Doctor:</strong> <span id="doctorName">${
              billDetails.doctorName || "N/A"
            }</span></td>
            <td class="bold"><strong>Age:</strong> <span id="age">${
              billDetails.age || "N/A"
            }</span></td>
        </tr>
        <tr>
            <td class="bold"><strong>Weight:</strong> <span id="weight">${
              billDetails.weight || "N/A"
            }</span></td>
            <td class="bold"><strong>Status:</strong> <span id="status">${
              billDetails.status || "N/A"
            }</span></td>
        </tr>
        <tr>
            <td class="bold"><strong>Payment Mode:</strong> <span id="paymentMode">${
              billDetails.paymentMode || "N/A"
            }</span></td>
            <td class="bold"><strong>Insurance Company:</strong> <span id="insuranceCompany">${
              billDetails.insuranceCompany || "N/A"
            }</span></td>
        </tr>
        
    </div>
    <table class="charges">
        <tr>
            <th>Description</th>
            <th>Rate per Day</th>
            <th>Quantity</th>
            <th>Date</th>
            <th>Total</th>
        </tr>
        <tr><th colspan="5">Bed Charges Breakdown</th></tr>
        <tr>
            <td>ICU Bed Charges</td>
            <td>${billDetails.bedCharges.icu.ratePerDay || 0}</td>
            <td>${billDetails.bedCharges.icu.quantity || 0}</td>
            <td>${billDetails.bedCharges.icu.date || "N/A"}</td>
            <td>${billDetails.bedCharges.icu.total || 0}</td>
        </tr>
        <tr>
            <td>Single AC Bed Charges</td>
            <td>${billDetails.bedCharges.singleAc.ratePerDay || 0}</td>
            <td>${billDetails.bedCharges.singleAc.quantity || 0}</td>
            <td>${billDetails.bedCharges.singleAc.date || "N/A"}</td>
            <td>${billDetails.bedCharges.singleAc.total || 0}</td>
        </tr>
        <tr>
            <td>General Ward Charges</td>
            <td>${billDetails.bedCharges.generalWard?.ratePerDay || 0}</td>
            <td>${billDetails.bedCharges.generalWard?.quantity || 0}</td>
            <td>${billDetails.bedCharges.generalWard?.date || "N/A"}</td>
            <td>${billDetails.bedCharges.generalWard?.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Bed Charges</strong></td>
            <td><strong>${billDetails.bedCharges.total || 0}</strong></td>
        </tr>
        <tr><th colspan="5">Procedure Charges Breakdown</th></tr>
        <tr>
            <td>Oxygen Procedure Charges</td>
            <td>${billDetails.procedureCharges.oxygen?.ratePerUnit || 0}</td>
            <td>${billDetails.procedureCharges.oxygen?.quantity || 0}</td>
            <td>${billDetails.procedureCharges.oxygen?.date || "N/A"}</td>
            <td>${billDetails.procedureCharges.oxygen?.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Procedure Charges</strong></td>
            <td><strong>${billDetails.procedureCharges.total || 0}</strong></td>
        </tr>
        <tr><th colspan="5">Doctor Charges Breakdown</th></tr>
        <tr>
            <td>ICU Doctor Visits</td>
            <td>${billDetails.doctorCharges.icuVisiting?.ratePerVisit || 0}</td>
            <td>${billDetails.doctorCharges.icuVisiting?.visits || 0}</td>
            <td>${billDetails.doctorCharges.icuVisiting?.date || "N/A"}</td>
            <td>${billDetails.doctorCharges.icuVisiting?.total || 0}</td>
        </tr>
        <tr>
            <td>General Doctor Visits</td>
            <td>${billDetails.doctorCharges.generalVisiting?.rate || 0}</td>
            <td>${billDetails.doctorCharges.generalVisiting?.quantity || 0}</td>
            <td>${billDetails.doctorCharges.generalVisiting?.date || "N/A"}</td>
            <td>${billDetails.doctorCharges.generalVisiting?.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Doctor Charges</strong></td>
            <td><strong>${billDetails.doctorCharges.total || 0}</strong></td>
        </tr>
        <tr><th colspan="5">Investigation Charges Breakdown</th></tr>
        <tr>
            <td>ECG Charges</td>
            <td>${billDetails.investigationCharges.ecg.ratePerTest || 0}</td>
            <td>${billDetails.investigationCharges.ecg.quantity || "N/A"}</td>
            <td>${billDetails.investigationCharges.ecg.date || "N/A"}</td>
            <td>${billDetails.investigationCharges.ecg.total || 0}</td>
        </tr>
        <tr>
            <td>X-ray Charges</td>
            <td>${billDetails.investigationCharges.xray.ratePerTest || 0}</td>
            <td>${billDetails.investigationCharges.xray.quantity || "N/A"}</td>
            <td>${billDetails.investigationCharges.xray.date || "N/A"}</td>
            <td>${billDetails.investigationCharges.xray.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Investigation Charges</strong></td>
            <td><strong>${
              billDetails.investigationCharges.total || 0
            }</strong></td>
        </tr>
        <tr>
            <td><strong>Medicine Charges</strong></td>
            <td colspan="3"></td>
            <td><strong>${billDetails.medicineCharges.total || 0}</strong></td>
        </tr>
        <tr>
            <td colspan="4"><strong>Overall Total Amount</strong></td>
            <td><strong>${billDetails.totalAmountDue || 0}</strong></td>
        </tr>
    </table>
</body>
</html>

  `;
    // pdf.create(billHTML, { format: "A4" }).toBuffer(async (err, pdfBuffer) => {
    //   if (err) {
    //     return res.status(500).json({
    //       message: "Failed to generate PDF",
    //       error: err.message,
    //     });
    //   }
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/google-chrome-stable",
    });
    const page = await browser.newPage();
    await page.setContent(billHTML);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert PDF buffer into a readable stream
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    // Folder ID in Google Drive
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Upload PDF to Google Drive
    const driveFile = await drive.files.create({
      resource: {
        name: `Bill_${patientId}.pdf`,
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: bufferStream,
      },
      fields: "id, webViewLink",
    });

    // Extract file's public link
    const fileLink = driveFile.data.webViewLink;

    return res.status(200).json({
      message: "Bill generated successfully.",
      billDetails: billDetails,
      fileLink: fileLink,
    });
    // });
  } catch (error) {
    console.error("Error generating bill:", error);
    return res.status(500).json({ error: error });
  }
};
export const generateFeeReceipt = (req, res) => {};

export const listAllPatientsWithLastRecord = async (req, res) => {
  console.log("listAllPatientsWithLastRecord");
  try {
    const patientsHistory = await PatientHistory.aggregate([
      // Filter to only include records where dischargedByReception is false
      {
        $addFields: {
          history: {
            $filter: {
              input: "$history",
              as: "record",
              cond: { $eq: ["$$record.dischargedByReception", false] },
            },
          },
        },
      },
      // Sort the history array by admissionDate in descending order
      {
        $addFields: {
          history: {
            $sortArray: {
              input: "$history",
              sortBy: { admissionDate: -1 }, // Sort descending by admissionDate
            },
          },
        },
      },
      // Unwind the history array
      {
        $unwind: "$history",
      },
      // Group by patientId to get the last record after sorting
      {
        $group: {
          _id: "$patientId", // Group by patientId
          name: { $first: "$name" }, // Get the first name value (consistent for each patientId)
          gender: { $first: "$gender" }, // Get the first gender value
          contact: { $first: "$contact" }, // Get the first contact value
          lastRecord: { $first: "$history" }, // First record from the sorted array (latest record)
        },
      },
      // Project the output fields
      {
        $project: {
          _id: 0, // Exclude _id
          patientId: "$_id", // Include patientId
          name: 1,
          gender: 1,
          contact: 1,
          lastRecord: 1,
        },
      },
    ]);

    // Check if any patients are found
    if (patientsHistory.length === 0) {
      return res
        .status(404)
        .json({ error: "No patients found or no history available." });
    }

    // Format the dates in the last record
    patientsHistory.forEach((patient) => {
      const lastRecord = patient.lastRecord;
      if (lastRecord) {
        lastRecord.admissionDate = lastRecord.admissionDate
          ? dayjs(lastRecord.admissionDate)
              .tz("Asia/Kolkata")
              .format("YYYY-MM-DD hh:mm:ss A")
          : null;
        lastRecord.dischargeDate = lastRecord.dischargeDate
          ? dayjs(lastRecord.dischargeDate)
              .tz("Asia/Kolkata")
              .format("YYYY-MM-DD hh:mm:ss A")
          : null;
      }
    });
    console.log(patientsHistory);

    return res.status(200).json(patientsHistory);
  } catch (error) {
    console.error("Error fetching patients' history:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// export const getDoctorAdvice = async (req, res) => {
//   const { patientId } = req.params;

//   try {
//     // Find the patient history by patientId
//     const patientHistory = await PatientHistory.findOne({ patientId });

//     if (!patientHistory) {
//       return res.status(404).json({ message: "Patient history not found." });
//     }

//     // Get the latest record from the history array
//     const latestRecord =
//       patientHistory.history[patientHistory.history.length - 1];

//     if (!latestRecord) {
//       return res
//         .status(404)
//         .json({ message: "No records found for the patient." });
//     }

//     // Find the patient details from the patient schema
//     const patient = await patientSchema.findOne({ patientId });

//     if (!patient) {
//       return res.status(404).json({ message: "Patient not found." });
//     }

//     // Extract the required details
//     const response = {
//       name: patient.name,
//       weight: latestRecord.weight,
//       age: patient.age,
//       symptoms: latestRecord.symptomsByDoctor,
//       vitals: latestRecord.vitals,
//       diagnosis: latestRecord.diagnosisByDoctor,
//       prescriptions: latestRecord.doctorPrescriptions,
//     };

//     res.status(200).json(response);
//   } catch (error) {
//     console.error("Error retrieving doctor advice:", error);
//     res.status(500).json({
//       message: "Failed to retrieve doctor advice.",
//       error: error.message,
//     });
//   }
// };

export const getDoctorAdvice = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Find the patient history by patientId
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient history not found." });
    }

    // Get the latest record from the history array
    const latestRecord =
      patientHistory.history[patientHistory.history.length - 1];

    if (!latestRecord) {
      return res
        .status(404)
        .json({ message: "No records found for the patient." });
    }

    // Find the patient details from the patient schema
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }
    // Extract the required details
    const response = {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      admissionDate: latestRecord.admissionDate,
      doctor: latestRecord.doctor.name,
      weight: latestRecord.weight,
      age: patient.age,
      symptoms: latestRecord.symptomsByDoctor,
      vitals: latestRecord.vitals,
      diagnosis: latestRecord.diagnosisByDoctor,
      prescriptions: latestRecord.doctorPrescriptions,
    };
    response.prescriptions.forEach((prescription) => {
      console.log(prescription.medicine);
    });
    // Generate HTML content for the PDF
    const doctorAdviceHtml = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prescription</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #fff;
            margin: 20px;
        }

        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 20px;
            box-sizing: border-box;
        }

        .header img {
            width: 100%;
            height: auto;
        }

        .details {
            margin-bottom: 20px;
        }

        .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .details-row p {
            flex: 1;
            margin: 5px 0;
            font-size: 14px;
        }

        .details-row p:not(:last-child) {
            margin-right: 20px;
        }

        .section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .left, .right {
            width: 48%;
        }

        h2 {
            font-size: 16px;
            margin: 10px 0;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }

        ul {
            list-style-type: none;
            padding: 0;
        }

        li {
            margin: 5px 0;
            font-size: 14px;
        }

        .prescription-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .prescription-table th, .prescription-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 14px;
        }

        .prescription-table th {
            background-color: #f2f2f2;
        }

        .footer {
            text-align: center;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="header">
        </div>
        <div class="details">
            <div class="details-row">
                <p><strong>Name:</strong> ${response.name}</p>
                <p><strong>Age:</strong> ${response.age}</p>
                <p><strong>Gender:</strong> ${response.gender}</p>
            </div>
            <div class="details-row">
                <p><strong>Contact:</strong> ${response.contact}</p>
                <p><strong>Date:</strong> ${new Date(
                  response.admissionDate
                ).toLocaleDateString()}</p>
                <p><strong>Doctor:</strong> ${response.doctor}</p>
            </div>
            <div class="details-row">
                <p><strong>Weight:</strong> ${response.weight} kg</p>
                <p><strong>Height:</strong> ${response.height} cm</p>
                <p><strong>BMI:</strong> ${response.bmi} kg/m²</p>
            </div>
        </div>
        <div class="section">
            <div class="left">
                <h2>Vitals</h2>
                <ul>
                    ${response.vitals
                      .map(
                        (vital) => `
                        <li>Temperature: ${vital.temperature} °C</li>
                        <li>Pulse: ${vital.pulse} bpm</li>
                        <li>Other: ${vital.other}</li>
                        <li>Recorded At: ${new Date(
                          vital.recordedAt
                        ).toLocaleString()}</li>
                    `
                      )
                      .join("")}
                </ul>
                <h2>Symptoms</h2>
                <ul>
                    ${response.symptoms
                      .map((symptom) => `<li>${symptom}</li>`)
                      .join("")}
                </ul>
                <h2>Diagnosis</h2>
                <ul>
                    ${response.diagnosis
                      .map((diagnosis) => `<li>${diagnosis}</li>`)
                      .join("")}
                </ul>
            </div>
            <div class="right">
                <h2>Prescriptions</h2>
                <table class="prescription-table">
                    <thead>
                        <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Duration</th>
                            <th>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.prescriptions
                          .map(
                            (prescription) => `
                            <tr>
                                <td>${prescription.medicine.name}</td>
                                <td>${prescription.dosage}</td>
                                <td>${prescription.duration}</td>
                                <td>${prescription.frequency}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="footer">
            <p>Dr. Santosh Raste</p>
        </div>
    </div>
</body>
</html>
    `;

    // Generate PDF from HTML
    pdf
      .create(doctorAdviceHtml, { format: "A4" })
      .toBuffer(async (err, pdfBuffer) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to generate PDF",
            error: err.message,
          });
        }
        // Authenticate with Google Drive API
        const auth = new google.auth.GoogleAuth({
          credentials: ServiceAccount,
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });

        // Convert PDF buffer into a readable stream
        const bufferStream = new Readable();
        bufferStream.push(pdfBuffer);
        bufferStream.push(null);

        // Folder ID in Google Drive
        const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

        // Upload PDF to Google Drive
        const driveFile = await drive.files.create({
          resource: {
            name: `DoctorAdvice_${patientId}.pdf`,
            parents: [folderId],
          },
          media: {
            mimeType: "application/pdf",
            body: bufferStream,
          },
          fields: "id, webViewLink",
        });

        // Extract file's public link
        const fileLink = driveFile.data.webViewLink;

        return res.status(200).json({
          message: "Doctor advice generated successfully.",
          fileLink: fileLink,
        });
      });
  } catch (error) {
    console.error("Error retrieving doctor advice:", error);
    res.status(500).json({
      message: "Failed to retrieve doctor advice.",
      error: error.message,
    });
  }
};
export const generateFinalReceipt = async (req, res) => {
  try {
    const { patientId, amountPaid = 0, billingAmount = 0 } = req.params;
    console.log("thi os ", patientId, amountPaid, billingAmount);
    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    // Find the patient record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Fetch the patient's most recent admission history
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory || patientHistory.history.length === 0) {
      return res.status(404).json({ error: "Patient history not found." });
    }

    // Get the last record (most recent admission)
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const { amountToBePayed } = lastRecord;

    // Start with the pending amount from the patient schema and last admission record
    let totalAmountDue =
      (parseFloat(patient.pendingAmount) || 0) +
      (parseFloat(amountToBePayed) || 0) +
      (parseFloat(billingAmount) || 0);

    // Calculate the remaining balance after payment
    const remainingBalance = totalAmountDue - amountPaid;

    // Update the pending amount in the patient schema
    patient.pendingAmount = Math.max(remainingBalance, 0); // Ensure no negative pending balance
    patient.discharged = remainingBalance <= 0; // Mark as fully discharged if no pending amount

    // Save the updated patient record
    await patient.save();
    const now = new Date();

    const data = {
      date: now.toISOString().split("T")[0], // Extracts the date in YYYY-MM-DD format
      time: now.toTimeString().split(" ")[0], // Extracts the time in HH:MM:SS format
    };
    // Prepare the final bill details
    const billDetails = {
      patientId: patientId,
      name: patient.name,
      gender: patient.gender,
      contact: patient.contact,
      weight: lastRecord.weight,
      amountToBePayed: totalAmountDue,
      amountPaid: amountPaid,
      billingAmount: billingAmount,
      date: data.date,
      time: data.time,

      remainingBalance: remainingBalance,
      dischargeStatus: patient.discharged
        ? "Fully Discharged"
        : "Pending Balance",
    };

    const billHTML = `
    
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patient Bill Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f9;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1, h2 {
      text-align: center;
      color: #333;
      margin: 0 0 20px 0;
    }
    .details {
      margin: 20px 0;
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 8px;
      border: none;
    }
    .total {
      margin: 20px 0;
      padding: 15px;
      text-align: center;
      background: #f9f9f9;
      font-size: 18px;
      font-weight: bold;
      border-radius: 4px;
    }
    .discharge-status {
      text-align: center;
      font-size: 16px;
      margin-top: 10px;
      color: #4caf50;
    }
    .discharge-status.pending {
      color: #ff5722;
    }
    footer {
      text-align: center;
      margin-top: 20px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    @media screen and (max-width: 600px) {
      .container {
        padding: 10px;
      }
      table, tr, td {
        display: block;
        width: 100%;
      }
      td {
        padding: 10px 0;
        border-bottom: 1px solid #ddd;
      }
      td:last-child {
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bhosale Hospital</h1>
    <h2>Payment Receipt</h2>
    <div class="details">
      <table>
        <tr>
          <td><strong>Patient ID:</strong> ${billDetails.patientId}</td>
          <td><strong>Name:</strong> ${billDetails.name}</td>
          <td><strong>Gender:</strong> ${billDetails.gender}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong> ${billDetails.contact}</td>
          <td><strong>Weight:</strong> ${billDetails.weight} kg</td>
          <td><strong>Date:</strong> ${billDetails.date}</td>
        </tr>
        <tr>
          <td><strong>Time:</strong> ${billDetails.time}</td>
          <td><strong>Amount Due:</strong> ₹${billDetails.amountToBePayed}</td>
          <td><strong>Remaining Balance:</strong> ₹${
            billDetails.remainingBalance
          }</td>
        </tr>
      </table>
    </div>
    <div class="total">
      Amount Paid: ₹${billDetails.amountPaid}
    </div>
    <div class="discharge-status ${
      billDetails.dischargeStatus === "Pending Balance" ? "pending" : ""
    }">
      ${billDetails.dischargeStatus}
    </div>
    <footer>
      Thank you for choosing our hospital. Please retain this receipt for future reference.
    </footer>
  </div>
</body>
</html>
`;
    // pdf.create(billHTML, { format: "A4" }).toBuffer(async (err, pdfBuffer) => {
    //   if (err) {
    //     return res.status(500).json({
    //       message: "Failed to generate PDF",
    //       error: err.message,
    //     });
    //   }
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/google-chrome-stable",
    });
    console.log("check thei path", process.env.PUPPETEER_EXECUTABLE_PATH);
    const page = await browser.newPage();
    await page.setContent(billHTML);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert PDF buffer into a readable stream
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    // Folder ID in Google Drive
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Upload PDF to Google Drive
    const driveFile = await drive.files.create({
      resource: {
        name: `Bill_${patientId}.pdf`,
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: bufferStream,
      },
      fields: "id, webViewLink",
    });

    // Extract file's public link
    const fileLink = driveFile.data.webViewLink;
    // await browser.close();
    return res.status(200).json({
      message: "Bill generated successfully.",
      billDetails: billDetails,
      fileLink: fileLink,
    });
    // });
  } catch (error) {
    console.error("Error generating bill:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getDoctorAdvic1 = async (req, res) => {
  const { patientId, admissionId } = req.params; // Include admissionId from request params
  console.log(patientId, admissionId);
  try {
    // Find the patient details from the patient schema
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the admission record using the admissionId
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Get only the latest vital signs (last entry in the vitals array)
    const latestVital =
      admissionRecord.vitals && admissionRecord.vitals.length > 0
        ? admissionRecord.vitals[admissionRecord.vitals.length - 1]
        : null;

    // Format the response
    const response = {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      address: patient.address,
      admissionDate: admissionRecord.admissionDate,
      dischargeDate: admissionRecord.dischargeDate || null,
      doctor: admissionRecord.doctor ? admissionRecord.doctor.name : null,
      weight: admissionRecord.weight || null,
      symptoms: admissionRecord.symptomsByDoctor || [],
      latestVital: latestVital, // Changed from vitals array to single latest vital
      diagnosis: admissionRecord.diagnosisByDoctor || [],
      prescriptions: admissionRecord.doctorPrescriptions || [],
    };

    // Generate HTML content for the PDF
    const doctorAdviceHtml = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prescription</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #fff;
            margin: 20px;
        }
        
        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .header img {
            width: 100%;
            height: auto;
        }
        
        .details {
            margin-bottom: 20px;
        }
        
        .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .details-row p {
            flex: 1;
            margin: 5px 0;
            font-size: 14px;
        }
        
        .details-row p:not(:last-child) {
            margin-right: 20px;
        }
        
        .section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .left, .right {
            width: 48%;
        }
        
        h2 {
            font-size: 16px;
            margin: 10px 0;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        
        ul {
            list-style-type: none;
            padding: 0;
        }
        
        li {
            margin: 5px 0;
            font-size: 14px;
        }
        
        .prescription-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .prescription-table th, .prescription-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 14px;
        }
        
        .prescription-table th {
            background-color: #f2f2f2;
        }
        
        .footer {
            text-align: center;
            font-size: 14px;
            margin-top: 20px;
        }
        
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="header">
        </div>
        <div class="details">
            <div class="details-row">
                <p><strong>Name:</strong> ${response.name}</p>
                <p><strong>Age:</strong> ${response.age}</p>
                <p><strong>Gender:</strong> ${response.gender}</p>
            </div>
            <div class="details-row">
             <p><strong>Weight:</strong> ${response.weight} kg</p>
                <p><strong>Date:</strong> ${new Date(
                  response.admissionDate
                ).toLocaleDateString()}</p>
                <p><strong>Doctor:</strong> ${response.doctor}</p>
            </div>
        </div>
        <div class="section">
            <div class="left">
                <h2>Latest Vitals</h2>
                <ul>
                    ${
                      response.latestVital
                        ? `
                        <li>Temperature: ${
                          response.latestVital.temperature || "N/A"
                        } °C</li>
                        <li>Pulse: ${
                          response.latestVital.pulse || "N/A"
                        } bpm</li>
                        <li>BP: ${
                          response.latestVital.bloodPressure || "N/A"
                        }</li>
                        <li>BSL: ${
                          response.latestVital.bloodSugarLevel || "N/A"
                        }</li>
                        <li>Other: ${response.latestVital.other || "N/A"}</li>
                        <li>Recorded At: ${new Date(
                          response.latestVital.recordedAt
                        ).toLocaleString()}</li>
                    `
                        : "<li>No vital signs recorded</li>"
                    }
                </ul>
                <h2>Symptoms</h2>
                <ul>
                    ${
                      response.symptoms.length > 0
                        ? response.symptoms
                            .map((symptom) => `<li>${symptom}</li>`)
                            .join("")
                        : "<li>No symptoms recorded</li>"
                    }
                </ul>
                <h2>Diagnosis</h2>
                <ul>
                    ${
                      response.diagnosis.length > 0
                        ? response.diagnosis
                            .map((diagnosis) => `<li>${diagnosis}</li>`)
                            .join("")
                        : "<li>No diagnosis recorded</li>"
                    }
                </ul>
            </div>
            <div class="right">
                <h2>Prescriptions</h2>
                <table class="prescription-table">
                    <thead>
                        <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${
                          response.prescriptions.length > 0
                            ? response.prescriptions
                                .map(
                                  (prescription) => `
                            <tr>
                                <td>${prescription.medicine.name || "N/A"}</td>
                                <td>M: ${
                                  prescription.medicine.morning || "-"
                                } / A: ${
                                    prescription.medicine.afternoon || "-"
                                  } / N: ${
                                    prescription.medicine.night || "-"
                                  }</td>
                                <td>${
                                  prescription.medicine.comment || "N/A"
                                }</td>
                            </tr>
                            `
                                )
                                .join("")
                            : '<tr><td colspan="3">No prescriptions recorded</td></tr>'
                        }
                    </tbody>
                </table>
            </div>
        </div>
        <div class="footer">
        </div>
    </div>
</body>
</html>
    `;
    const pdfBuffer = await generatePdf(doctorAdviceHtml);
    const driveLink = await uploadToDrive(
      pdfBuffer,
      `DoctorAdvice_${req.params.patientId}.pdf`,
      "1MKYZ4fIUzERPyYzL_8I101agWemxVXts" // Folder ID
    );

    try {
      return res.status(200).json({
        message: "Doctor advice generated successfully.",
        fileLink: driveLink,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to upload PDF to Google Drive",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error generating doctor advice:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
export const getDoctorSheet = async (req, res) => {
  try {
    const { patientId } = req.params; // Extract patientId from the request parameters

    // Find the patient in the PatientHistory collection
    const patientHistory = await PatientHistory.findOne({ patientId });
    if (!patientHistory) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Get the latest admission record from the history array
    const lastAdmission = patientHistory.history.at(-1); // Fetch the last record
    if (!lastAdmission) {
      return res
        .status(404)
        .json({ message: "No admission records found for the patient" });
    }

    // Get the latest consulting record from the doctorConsulting array in the latest admission
    const lastConsulting = lastAdmission.doctorConsulting.at(-1); // Fetch the last consulting record
    if (!lastConsulting) {
      return res.status(404).json({
        message: "No consulting records found for the latest admission",
      });
    }
    // Format the response
    const response = {
      patientId: patientHistory.patientId,
      name: patientHistory.name,
      age: patientHistory.age,
      gender: patientHistory.gender,
      contact: patientHistory.contact || null,
      address: patientHistory.address || null,
      admissionDate: lastAdmission.admissionDate,
      dischargeDate: lastAdmission.dischargeDate || null,
      doctor: lastAdmission.doctor?.name || null,
      allergies: lastConsulting.allergies || null,
      cheifComplaint: lastConsulting.cheifComplaint || null,
      describeAllergies: lastConsulting.describeAllergies || null,
      historyOfPresentIllness: lastConsulting.historyOfPresentIllness || null,
      personalHabits: lastConsulting.personalHabits || null,
      familyHistory: lastConsulting.familyHistory || null,
      menstrualHistory: lastConsulting.menstrualHistory || null,
      wongBaker: lastConsulting.wongBaker || null,
      visualAnalogue: lastConsulting.visualAnalogue || null,
      relevantPreviousInvestigations:
        lastConsulting.relevantPreviousInvestigations || null,
      immunizationHistory: lastConsulting.immunizationHistory || null,
      pastMedicalHistory: lastConsulting.pastMedicalHistory || null,
    };
    const DoctorHTML = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Doctor Initial Assessment Sheet</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin-top: 0;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f4f4f4;
            flex-direction: column;
        }
        .container {
            width: 210mm;
            height: auto;
            padding: 15mm;
            padding-top: 0;
            box-sizing: border-box;
            border: 1px solid #000;
            background-color: #fff;
            margin-bottom: 2mm;
        }
        .header {
            text-align: center;
            margin-bottom: 5px;
        }
        .header h1 {
            margin: 5px 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            font-size: 14px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section h3 {
            font-size: 16px;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        .field-table {
            width: 100%;
            margin-bottom: 20px;
        }
        .field-table td {
            padding: 5px 10px;
            vertical-align: top;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .checkbox-group input {
            margin-right: 10px;
        }
        .textarea {
            width: 100%;
            height: 100px;
            box-sizing: border-box;
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 20px;
        }
        .pain-scale img {
            width: 100%;
            max-width: 600px;
        }
        .header img {
            padding-top: 10px;
        }
        .pain-scale {
            width: 100%;
        }
        .pain-scale .scale {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .pain-scale .scale span {
            font-weight: bold;
            margin-right: 10px;
        }
        .pain-scale .progress-bar {
            flex-grow: 1;
            height: 20px;
            background-color: #ddd;
            border-radius: 5px;
            position: relative;
        }
        .pain-scale .progress-bar::after {
            content: "";
            position: absolute;
            height: 100%;
            background-color: #f00;
            border-radius: 5px;
            transition: width 0.3s ease;
        }
        .pain-scale .wong-baker {
            width: 100%;
        }
        .pain-scale .visual-analogue {
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="container" id="page-1">
        <div class="header">
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png" alt="header">
            <h3>DOCTOR INITIAL ASSESSMENT SHEET</h3>
        </div>
        <div class="section">
            <table class="field-table">
                <tr>
                    <td><strong>Patient id.:</strong> <span id="patientid">${
                      response.patientId
                    }</span></td>
                    <td><strong>Patient Name:</strong> <span id="patientName">${
                      response.name
                    }</span></td>
                </tr>
                <tr>
                    <td><strong>Age:</strong> <span id="age">${
                      response.age
                    }</span></td>
                    <td><strong>Sex:</strong> <span id="sex">${
                      response.gender
                    }</span></td>
                    <td><strong>Date:</strong> <span id="date">${
                      response.admissionDate
                    }</span></td>
                </tr>
                <tr>
                    <td colspan="3"><strong>Name of Consultant:</strong> <span id="consultant">${
                      response.doctor || "N/A"
                    }</span></td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h3>Known Allergies</h3>
            <div class="checkbox-group">
                <strong>Allergies:</strong><span id="allergies">${
                  response.allergies || "N/A"
                }</span>
            </div>
            <div class="field">
                <span>Describe:</span> <div id="describe" class="textarea">${
                  response.describeAllergies || "N/A"
                }</div>
            </div>
        </div>

        <div class="section">
            <h3>Chief Complaint</h3>
            <div id="chiefComplaint" class="textarea">${
              response.cheifComplaint || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>History of Present Illness</h3>
            <div id="historyIllness" class="textarea">${
              response.historyOfPresentIllness || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>Personal Habits:</h3>
            <div class="checkbox-group">
                <span id="personalHabits">${
                  response.personalHabits || "N/A"
                }</span>
            </div>
        </div>

        <div class="section">
            <h3>Immunization History (if relevant):</h3>
            <div id="immunization" class="textarea">${
              response.immunizationHistory || "N/A"
            }</div>
        </div><br><br>
        <div class="section">
            <h3>Past History</h3>
            <div id="pastHistory" class="textarea">${
              response.pastMedicalHistory || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>Family History</h3>
            <div id="familyHistory" class="textarea">${
              response.menstrualHistory || "N/A"
            }</div>
        </div>
        <div class="section">
            <h3>Relevant Previous Investigations Report</h3>
            <div id="previousInvestigations" class="textarea">${
              response.relevantPreviousInvestigations || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>Menstrual History</h3><br>
            <span id="menstrualHistory">${
              response.menstrualHistory || "N/A"
            }</span>
        </div>

        <div class="section pain-scale"> 
            <h3>Pain Scale</h3> 
            <div class="scale wong-baker">  
                <strong>Wong-Baker:</strong><span id="wongBaker" >${
                  response.wongBaker || "N/A"
                }</span> 
            </div> 
        </div> 
        <div class="scale visual-analogue"> 
            <strong>0-10 Visual Analogue:</strong><span id="visualAnalogue">${
              response.visualAnalogue || "N/A"
            }</span>     
                </div> 
            </div> 
        </div> 
    </div>
</div>
</body>
</html>
    `;
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/google-chrome-stable",
    });
    console.log("check thei path", process.env.PUPPETEER_EXECUTABLE_PATH);
    const page = await browser.newPage();
    await page.setContent(DoctorHTML);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert PDF buffer into a readable stream
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    // Folder ID in Google Drive
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Upload PDF to Google Drive
    const driveFile = await drive.files.create({
      resource: {
        name: `Bill_${patientId}.pdf`,
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: bufferStream,
      },
      fields: "id, webViewLink",
    });

    // Extract file's public link
    const fileLink = driveFile.data.webViewLink;
    // await browser.close();

    return res.status(200).json({
      message: "Bill generated successfully.",
      response: response,
      fileLink: fileLink,
    });
  } catch (err) {
    console.error("Error fetching doctor consulting:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const dischargeByReception = async (req, res) => {
  const { patientId, admissionId } = req.params;

  try {
    // Find the patient history document by patientId
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record within the history array
    const admission = patientHistory.history.find(
      (record) => record.admissionId.toString() === admissionId
    );

    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Update dischargedByReception to true
    admission.dischargedByReception = true;

    // Save the updated patient history document
    await patientHistory.save();

    return res.status(200).json({
      message: "Discharged by reception updated successfully",
      patientHistory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const generateDeclaration = async (req, res) => {
  const fileLink = "helllox";
  try {
    return res.status(200).json({
      message: "Bill generated successfully.",
      fileLink: fileLink,
    });
  } catch (error) {
    console.error("Error fetching doctor consulting:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getLastRecordWithFollowUps = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Find the patient history by patientId
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient history not found." });
    }

    // Get the last record from the history array
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];

    if (!lastRecord) {
      return res
        .status(404)
        .json({ message: "No records found for the patient." });
    }

    // Return the last record and its follow-ups
    res.status(200).json({
      message: "Last record with follow-ups fetched successfully",
      lastRecord,
      followUps: lastRecord.followUps,
    });
  } catch (error) {
    console.error("Error fetching last record with follow-ups:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
// Import necessary modules (e.g., your database model if needed)
export const generateOPDBill = async (req, res) => {
  const { patientId } = req.params;
  const userId = req.userId; // Receptionist ID from auth middleware
  const {
    services: {
      ecg = { quantity: 0, rate: 0 },
      xray = { quantity: 0, rate: 0 },
      injection = { quantity: 0, rate: 0 },
      dialysis = { quantity: 0, rate: 0 },
      dressing = { quantity: 0, rate: 0 },
    } = {},
    consultationFee = 0,
    additionalCharges = [],
    discount = 0,
    paymentMode = "Cash",
    notes = "",
    paidAmount = 0,
    transactionId = "",
    chequeNumber = "",
    bankName = "",
    // Options
    uploadToDriveFlag = true,
  } = req.body;

  try {
    // Fix timezone issue by creating IST time
    const getCurrentIST = () => {
      const now = new Date();
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + istOffset);
      return istTime;
    };

    const currentIST = getCurrentIST();

    // Fetch patient history for basic info
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name specialization license")
      .populate("history.section.id", "name type department");

    if (!patientHistory) {
      return res.status(404).json({
        success: false,
        error: "Patient history not found",
        code: "PATIENT_HISTORY_NOT_FOUND",
      });
    }

    // Get latest admission/visit record for doctor info and patient numbers
    let latestRecord = null;
    let opdNumber = null;
    let ipdNumber = null;

    if (patientHistory.history && patientHistory.history.length > 0) {
      latestRecord = patientHistory.history[patientHistory.history.length - 1];
      opdNumber = latestRecord.opdNumber;
      ipdNumber = latestRecord.ipdNumber; // May be null if patient was never admitted to IPD
    }

    // Get doctor charges from latest record
    const doctorCharges = latestRecord?.amountToBePayed || 0;
    console.log("Doctor Charges:", doctorCharges);

    // Calculate service totals
    const serviceCalculations = {
      ecg: {
        quantity: ecg.quantity || 0,
        rate: ecg.rate || 0,
        total: (ecg.quantity || 0) * (ecg.rate || 0),
      },
      xray: {
        quantity: xray.quantity || 0,
        rate: xray.rate || 0,
        total: (xray.quantity || 0) * (xray.rate || 0),
      },
      injection: {
        quantity: injection.quantity || 0,
        rate: injection.rate || 0,
        total: (injection.quantity || 0) * (injection.rate || 0),
      },
      dialysis: {
        quantity: dialysis.quantity || 0,
        rate: dialysis.rate || 0,
        total: (dialysis.quantity || 0) * (dialysis.rate || 0),
      },
      dressing: {
        quantity: dressing.quantity || 0,
        rate: dressing.rate || 0,
        total: (dressing.quantity || 0) * (dressing.rate || 0),
      },
    };

    // Calculate additional charges total
    const additionalChargesTotal = additionalCharges.reduce((sum, charge) => {
      return sum + (charge.quantity || 0) * (charge.rate || 0);
    }, 0);

    // Calculate totals
    const servicesSubTotal = Object.values(serviceCalculations).reduce(
      (sum, service) => sum + service.total,
      0
    );

    const subTotal =
      servicesSubTotal +
      consultationFee +
      additionalChargesTotal +
      doctorCharges;
    const discountAmount = (discount / 100) * subTotal;
    const grandTotal = subTotal - discountAmount;

    // Generate bill numbers
    const billNumber = `OPD${Date.now()}${Math.floor(Math.random() * 100)}`;
    const billNumber1 = await Bill.generateBillNumber("OPD");

    // Create services array for Bill schema
    const servicesArray = [];

    // Add main services
    Object.entries(serviceCalculations).forEach(([serviceName, service]) => {
      if (service.total > 0) {
        servicesArray.push({
          name: serviceName.toUpperCase(),
          description: getServiceDescription(serviceName),
          quantity: service.quantity,
          rate: service.rate,
          total: service.total,
          category: getServiceCategory(serviceName),
        });
      }
    });

    // Add consultation fee as service
    if (consultationFee > 0) {
      servicesArray.push({
        name: "CONSULTATION",
        description: "Doctor Consultation Fee",
        quantity: 1,
        rate: consultationFee,
        total: consultationFee,
        category: "consultation",
      });
    }

    // Add doctor charges as service
    if (doctorCharges > 0) {
      servicesArray.push({
        name: "DOCTOR_CHARGES",
        description: "Doctor Treatment Charges",
        quantity: 1,
        rate: doctorCharges,
        total: doctorCharges,
        category: "treatment",
      });
    }

    // Add additional charges
    additionalCharges.forEach((charge, index) => {
      if (charge.quantity > 0 && charge.rate > 0) {
        servicesArray.push({
          name: charge.name || `ADDITIONAL_${index + 1}`,
          description:
            charge.description ||
            charge.name ||
            `Additional Charge ${index + 1}`,
          quantity: charge.quantity,
          rate: charge.rate,
          total: charge.quantity * charge.rate,
          category: "other",
        });
      }
    });

    // Create bill record
    const billRecord = new Bill({
      billNumber: billNumber1,
      billType: "OPD",

      // Patient information
      patient: {
        patientId: patientHistory.patientId,
        name: patientHistory.name,
        age: patientHistory.age,
        gender: patientHistory.gender,
        contact: patientHistory.contact,
        address: patientHistory.address,
      },

      // Admission details (minimal for OPD)
      admission: latestRecord
        ? {
            admissionId: latestRecord.admissionId,
            attendingDoctor: {
              id: latestRecord.doctor?.id,
              name: latestRecord.doctor?.name || "Not specified",
            },
            department: {
              id: latestRecord.section?.id,
              name: latestRecord.section?.name || "OPD",
              type: latestRecord.section?.type || "OPD",
            },
          }
        : {
            attendingDoctor: { name: "OPD Doctor" },
            department: { name: "OPD", type: "OPD" },
          },

      // Services
      services: servicesArray,

      // Financial calculations
      financials: {
        servicesTotal: servicesSubTotal,
        consultationFee: consultationFee,
        doctorCharges: doctorCharges,
        subTotal: subTotal,
        discountPercent: discount,
        discountAmount: discountAmount,
        grandTotal: grandTotal,
        dueAmount: grandTotal,
        paidAmount: 0,
      },

      // Payment if any
      payments:
        paidAmount > 0
          ? [
              {
                amount: paidAmount,
                paymentMode: paymentMode,
                transactionId: transactionId || undefined,
                chequeNumber: chequeNumber || undefined,
                bankName: bankName || undefined,
                paymentDate: currentIST, // Use IST time
                notes: `OPD payment via ${paymentMode}`,
              },
            ]
          : [],

      // Additional information
      notes: notes,

      // Status
      status: "Generated",
    });

    // Prepare bill data with OPD/IPD numbers - USE IST TIME
    const billData = {
      // Patient info (from patient history)
      patientName: patientHistory.name,
      patientId: patientHistory.patientId,
      age: patientHistory.age || "N/A",
      gender: patientHistory.gender || "N/A",
      address: patientHistory.address || "N/A",
      contact: patientHistory.contact || "N/A",

      // IMPORTANT: Include OPD and IPD numbers
      opdNumber: opdNumber,
      ipdNumber: ipdNumber, // May be null if patient was never admitted to IPD

      // Doctor info (from latest record)
      consultantDoctor: latestRecord?.doctor?.name || "N/A",

      // Bill details - USE IST TIME
      billNumber: billNumber,
      billDate: currentIST.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      billTime: currentIST.toLocaleTimeString("en-IN", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      }),

      // Services
      services: serviceCalculations,
      consultationFee: consultationFee,
      doctorCharges: doctorCharges,
      additionalCharges: additionalCharges,

      // Calculations
      servicesSubTotal: servicesSubTotal,
      subTotal: subTotal,
      discount: discount,
      discountAmount: discountAmount,
      grandTotal: grandTotal,

      // Payment details
      paymentMode: paymentMode,
      notes: notes,

      // Meta info - USE IST TIME
      generatedBy: userId,
      generatedAt: currentIST, // This is now in IST
      isOPDBill: true,
    };

    console.log(
      `Generating OPD bill for patient ${patientId}, Bill No: ${billNumber}, OPD: ${opdNumber}, IPD: ${
        ipdNumber || "N/A"
      }`
    );

    // Generate HTML and PDF with OPD/IPD numbers
    const htmlContent = generateOPDBillHTML(billData);
    const pdfBuffer = await generatePdf(htmlContent);

    // Generate filename with OPD number
    const timestamp = currentIST.toISOString().replace(/[:.]/g, "-");
    const sanitizedName = patientHistory.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `OPD_Bill_${billNumber}_OPD${opdNumber}_${sanitizedName}_${timestamp}.pdf`;

    // Upload to Drive if requested
    let driveLink = null;
    if (uploadToDriveFlag) {
      const folderId =
        process.env.OPD_BILLS_FOLDER_ID || "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
      try {
        driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);
        console.log(`OPD bill uploaded to Drive: ${driveLink}`);
      } catch (uploadError) {
        console.error("Error uploading to Drive:", uploadError);
      }
    }

    // Update bill record with file info
    billRecord.files = {
      pdfFileName: fileName,
      driveLink: driveLink,
      pdfSize: pdfBuffer.length,
      uploadedAt: currentIST, // Use IST time
    };

    // Save bill record
    await billRecord.save();

    res.status(200).json({
      success: true,
      message: "OPD bill generated successfully",
      data: {
        fileName,
        driveLink,
        pdfSize: pdfBuffer.length,
        generatedAt: billData.generatedAt,
        billInfo: {
          billNumber: billData.billNumber,
          patientName: billData.patientName,
          opdNumber: opdNumber,
          ipdNumber: ipdNumber,
          grandTotal: billData.grandTotal,
          paymentMode: billData.paymentMode,
        },
        billBreakdown: {
          servicesTotal: billData.servicesSubTotal,
          consultationFee: billData.consultationFee,
          doctorCharges: billData.doctorCharges,
          additionalCharges: billData.additionalCharges,
          subTotal: billData.subTotal,
          discount: billData.discount,
          discountAmount: billData.discountAmount,
          grandTotal: billData.grandTotal,
        },
      },
    });
  } catch (error) {
    console.error("Error generating OPD bill:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate OPD bill",
      code: "OPD_BILL_GENERATION_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

function getServiceDescription(serviceName) {
  const descriptions = {
    ecg: "Electrocardiogram",
    xray: "X-Ray Examination",
    injection: "Injection Service",
    dialysis: "Dialysis Treatment",
    dressing: "Wound Dressing",
  };
  return descriptions[serviceName] || serviceName;
}

/**
 * Get service category
 */
function getServiceCategory(serviceName) {
  const categories = {
    ecg: "diagnostic",
    xray: "diagnostic",
    injection: "treatment",
    dialysis: "treatment",
    dressing: "treatment",
  };
  return categories[serviceName] || "other";
}
export const generateOpdReceipt = async (req, res) => {
  try {
    const { patientId, billingAmount, amountPaid } = req.body;

    // Ensure required fields are present
    if (!patientId || billingAmount == null || amountPaid == null) {
      return res.status(400).json({
        message: "Patient ID, billing amount, and amount paid are required.",
      });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Fetch the patient's most recent admission history
    const patientHistory = await PatientHistory.findOne({ patientId });
    if (!patientHistory || patientHistory.history.length === 0) {
      return res
        .status(404)
        .json({ message: "No history found for this patient." });
    }

    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];

    // Calculate the remaining amount
    const previousRemaining = lastRecord.previousRemainingAmount || 0;
    const newRemaining = previousRemaining + billingAmount - amountPaid;

    // Update the patient's pending amount in the Patient schema
    patient.pendingAmount = newRemaining < 0 ? 0 : newRemaining;
    await patient.save();

    // Update the last history record
    // lastRecord.amountToBePayed = newRemaining;
    // lastRecord.previousRemainingAmount = previousRemaining;
    // lastRecord.lastBillingAmount = billingAmount;
    // lastRecord.lastPaymentReceived = amountPaid;

    await patientHistory.save();
    const billingRecord = new BillingRecord({
      patientId: patientId,
      patientName: patient.name,
      billingAmount: billingAmount,
      amountPaid: amountPaid,
      remainingAmount: newRemaining < 0 ? 0 : newRemaining,
      previousRemainingAmount: previousRemaining,
      receiptGenerated: true,
    });
    const now = new Date();
    const data = {
      date: now.toISOString().split("T")[0], // Extracts the date in YYYY-MM-DD format
      time: now.toTimeString().split(" ")[0], // Extracts the time in HH:MM:SS format
    };
    const billDetails = {
      patientId: patientId,
      name: patient.name,
      gender: patient.gender,
      contact: patient.contact,
      weight: lastRecord.weight,
      billingAmount: billingAmount,
      amountPaid: amountPaid,
      date: data.date,
      time: data.time,
      remainingAmount: newRemaining,
      dischargeStatus: newRemaining > 0 ? "Pending Balance" : "Clear", // Added discharge status logic
    };

    const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patient Bill Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f9;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1, h2 {
      text-align: center;
      color: #333;
      margin: 0 0 20px 0;
    }
    .details {
      margin: 20px 0;
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 8px;
      border: none;
    }
    .total {
      margin: 20px 0;
      padding: 15px;
      text-align: center;
      background: #f9f9f9;
      font-size: 18px;
      font-weight: bold;
      border-radius: 4px;
    }
    .discharge-status {
      text-align: center;
      font-size: 16px;
      margin-top: 10px;
      color: #4caf50;
    }
    .discharge-status.pending {
      color: #ff5722;
    }
    footer {
      text-align: center;
      margin-top: 20px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    @media screen and (max-width: 600px) {
      .container {
        padding: 10px;
      }
      table, tr, td {
        display: block;
        width: 100%;
      }
      td {
        padding: 10px 0;
        border-bottom: 1px solid #ddd;
      }
      td:last-child {
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bhosale Hospital</h1>
    <h2>Payment Receipt</h2>
    <div class="details">
      <table>
        <tr>
          <td><strong>Patient ID:</strong> ${billDetails.patientId}</td>
          <td><strong>Name:</strong> ${billDetails.name}</td>
          <td><strong>Gender:</strong> ${billDetails.gender}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong> ${billDetails.contact}</td>
          <td><strong>Weight:</strong> ${billDetails.weight} kg</td>
          <td><strong>Billing Amount:</strong> ₹${
            billDetails.billingAmount
          }</td>
        </tr>
        <tr>
          <td><strong>Amount Paid:</strong> ₹${billDetails.amountPaid}</td>
          <td><strong>Remaining Balance:</strong> ₹${
            billDetails.remainingAmount
          }</td>
        </tr>
      </table>
    </div>
    <div class="total">
      Amount Paid: ₹${billDetails.amountPaid}
    </div>
    <div class="discharge-status ${
      billDetails.dischargeStatus === "Pending Balance" ? "pending" : ""
    }">
      ${billDetails.dischargeStatus}
    </div>
    <footer>
      Thank you for choosing our hospital. Please retain this receipt for future reference.
    </footer>
  </div>
</body>
</html>

`;

    // Generate PDF using reusable function
    const pdfBuffer = await generatePdf(receiptHtml);

    // Generate filename
    const fileName = `Bill_${patientId}.pdf`;

    // Upload to Drive using reusable function
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";
    const fileLink = await uploadToDrive(pdfBuffer, fileName, folderId);

    await billingRecord.save();
    return res.status(200).json({
      message: "OPD receipt generated successfully.",
      updatedPatient: {
        patientId: patient.patientId,
        pendingAmount: patient.pendingAmount,
      },
      updatedHistory: {
        lastBillingAmount: billingAmount,
        lastPaymentReceived: amountPaid,
        remainingAmount: newRemaining,
      },
      fileLink: fileLink,
    });
  } catch (error) {
    console.error("Error generating OPD receipt:", error);
    return res.status(500).json({
      message: "An error occurred while generating the OPD receipt.",
      error: error.message,
    });
  }
};
export const generateaIpddReceipt = async (req, res) => {
  try {
    const { patientId, billingAmount, amountPaid } = req.body;

    // Ensure required fields are present
    if (!patientId || billingAmount == null || amountPaid == null) {
      return res.status(400).json({
        message: "Patient ID, billing amount, and amount paid are required.",
      });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Fetch the patient's most recent admission history
    const patientHistory = await PatientHistory.findOne({ patientId });
    if (!patientHistory || patientHistory.history.length === 0) {
      return res
        .status(404)
        .json({ message: "No history found for this patient." });
    }

    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];

    // Calculate the remaining amount
    const previousRemaining = lastRecord.previousRemainingAmount || 0;
    const newRemaining = previousRemaining + billingAmount - amountPaid;

    // Update the patient's pending amount in the Patient schema
    patient.pendingAmount = newRemaining;
    await patient.save();

    // Update the last history record
    // lastRecord.amountToBePayed = newRemaining;
    // lastRecord.previousRemainingAmount = previousRemaining;
    // lastRecord.lastBillingAmount = billingAmount;
    // lastRecord.lastPaymentReceived = amountPaid;

    await patientHistory.save();
    const now = new Date();
    const data = {
      date: now.toISOString().split("T")[0], // Extracts the date in YYYY-MM-DD format
      time: now.toTimeString().split(" ")[0], // Extracts the time in HH:MM:SS format
    };
    const billDetails = {
      patientId: patientId,
      name: patient.name,
      gender: patient.gender,
      contact: patient.contact,
      weight: lastRecord.weight,
      billingAmount: billingAmount,
      amountPaid: amountPaid,
      date: data.date,
      time: data.time,
      remainingAmount: newRemaining,
      dischargeStatus: newRemaining > 0 ? "Pending Balance" : "Clear", // Added discharge status logic
    };

    const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patient Bill Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f9;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1, h2 {
      text-align: center;
      color: #333;
      margin: 0 0 20px 0;
    }
    .details {
      margin: 20px 0;
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 8px;
      border: none;
    }
    .total {
      margin: 20px 0;
      padding: 15px;
      text-align: center;
      background: #f9f9f9;
      font-size: 18px;
      font-weight: bold;
      border-radius: 4px;
    }
    .discharge-status {
      text-align: center;
      font-size: 16px;
      margin-top: 10px;
      color: #4caf50;
    }
    .discharge-status.pending {
      color: #ff5722;
    }
    footer {
      text-align: center;
      margin-top: 20px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    @media screen and (max-width: 600px) {
      .container {
        padding: 10px;
      }
      table, tr, td {
        display: block;
        width: 100%;
      }
      td {
        padding: 10px 0;
        border-bottom: 1px solid #ddd;
      }
      td:last-child {
        border-bottom: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bhosale Hospital</h1>
    <h2>Payment Receipt</h2>
    <div class="details">
      <table>
        <tr>
          <td><strong>Patient ID:</strong> ${billDetails.patientId}</td>
          <td><strong>Name:</strong> ${billDetails.name}</td>
          <td><strong>Gender:</strong> ${billDetails.gender}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong> ${billDetails.contact}</td>
          <td><strong>Weight:</strong> ${billDetails.weight} kg</td>
          <td><strong>Billing Amount:</strong> ₹${
            billDetails.billingAmount
          }</td>
        </tr>
        <tr>
          <td><strong>Amount Paid:</strong> ₹${billDetails.amountPaid}</td>
          <td><strong>Remaining Balance:</strong> ₹${
            billDetails.remainingAmount
          }</td>
        </tr>
      </table>
    </div>
    <div class="total">
      Amount Paid: ₹${billDetails.amountPaid}
    </div>
    <div class="discharge-status ${
      billDetails.dischargeStatus === "Pending Balance" ? "pending" : ""
    }">
      ${billDetails.dischargeStatus}
    </div>
    <footer>
      Thank you for choosing our hospital. Please retain this receipt for future reference.
    </footer>
  </div>
</body>
</html>

`;
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        "/usr/bin/google-chrome-stable",
    });
    // console.log("check thei path", process.env.PUPPETEER_EXECUTABLE_PATH);
    const page = await browser.newPage();
    await page.setContent(receiptHtml);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert PDF buffer into a readable stream
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    // Folder ID in Google Drive
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Upload PDF to Google Drive
    const driveFile = await drive.files.create({
      resource: {
        name: `Bill_${patientId}.pdf`,
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: bufferStream,
      },
      fields: "id, webViewLink",
    });

    // Extract file's public link
    const fileLink = driveFile.data.webViewLink;
    return res.status(200).json({
      message: "OPD receipt generated successfully.",
      updatedPatient: {
        patientId: patient.patientId,
        pendingAmount: patient.pendingAmount,
      },
      updatedHistory: {
        lastBillingAmount: billingAmount,
        lastPaymentReceived: amountPaid,
        remainingAmount: newRemaining,
      },
      fileLink: fileLink,
    });
  } catch (error) {
    console.error("Error generating OPD receipt:", error);
    return res.status(500).json({
      message: "An error occurred while generating the OPD receipt.",
      error: error.message,
    });
  }
};
export const getBasicPatientInfo = async (req, res) => {
  const { name } = req.query;
  console.log("name", name);

  if (!name) {
    return res
      .status(400)
      .json({ message: "Name query parameter is required" });
  }

  try {
    const patient = await patientSchema.findOne({
      name: new RegExp(name, "i"),
    }); // Case-insensitive search

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    return res.status(200).json({
      patientId: patient.patientId,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      dob: patient.dob,
      contact: patient.contact,
      address: patient.address,
      imageUrl: patient.imageUrl,
      discharged: patient.discharged,
      pendingAmount: patient.pendingAmount,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPatientSuggestions = async (req, res) => {
  const name = req.query.name || "";
  const suggestions = await patientSchema
    .find({
      name: { $regex: name, $options: "i" },
    })
    .limit(10);
  res.json(suggestions.map((patient) => patient.name));
};

// Controller to get age, weight, symptoms, and vitals by admissionId and patientId
// router.get('/getPatientDetails', async (req, res) => {
export const getAiSggestions = async (req, res) => {
  try {
    const { admissionId, patientId } = req.body;
    console.log("admissionId", admissionId, " patientId", patientId);
    // Validate query parameters
    if (!admissionId || !patientId) {
      return res
        .status(400)
        .json({ message: "Admission ID and Patient ID are required" });
    }

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId: patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the admission record by admissionId in the patient's admission records
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Format symptoms (remove the date from each entry)
    const formattedSymptoms = admissionRecord.symptomsByDoctor.map(
      (symptom) => {
        const parts = symptom.split(" - ");
        return parts.length > 1 ? parts[0] : parts[0]; // Remove date part
      }
    );

    // Format vitals (remove line breaks and date from the 'other' field)
    const formattedVitals = admissionRecord.vitals.map((vital) => {
      vital.other = vital.other.replace(/\n.*$/, ""); // Remove line breaks and the date part
      return vital;
    });

    // Get the required details
    const patientDetails = {
      age: patient.age,
      weight: admissionRecord.weight,
      symptoms: formattedSymptoms,
      vitals: formattedVitals,
    };

    // Send the formatted details back as response
    return res.status(200).json(patientDetails);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const {
      patientName,
      patientContact,
      doctorId,
      doctorName,
      doctorSpecialization,
      symptoms,
      appointmentType,
      date,
      time,
      paymentStatus,
      isReadmission, // Boolean flag for reappointment
      patientId, // Provided only for readmissions
    } = req.body;

    if (!patientName || !doctorId || !date || !time) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const newAppointment = {
      doctorId,
      doctorName,
      doctorSpecialization,
      symptoms,
      appointmentType,
      date,
      time,
      status: "waiting",
      paymentStatus: paymentStatus || "pending",
    };

    // CASE 1: This is a readmission (patientId should be provided)
    if (isReadmission) {
      if (!patientId) {
        return res.status(400).json({
          message: "Patient ID is required for readmission",
        });
      }

      // Look up patient record by patientId ONLY
      let patientRecord = await PatientAppointment.findOne({ patientId });

      if (!patientRecord) {
        return res.status(404).json({
          message: "Patient record not found. Please verify the Patient ID.",
        });
      }

      // Check patient's discharge status
      const existingPatientInSystem = await patientSchema.findOne({
        patientId,
      });

      // If patient exists in system, check if they are currently admitted (not discharged)
      if (existingPatientInSystem && !existingPatientInSystem.discharged) {
        return res.status(400).json({
          message:
            "Patient is currently admitted and cannot create a new appointment until discharged by a doctor",
          currentStatus: "admitted",
        });
      }

      // Check PatientHistory for reception discharge status
      const patientHistory = await PatientHistory.findOne({ patientId });

      if (patientHistory && patientHistory.history.length > 0) {
        const latestRecord =
          patientHistory.history[patientHistory.history.length - 1];

        // Check if not discharged by reception yet
        if (latestRecord.dischargeDate && !latestRecord.dischargedByReception) {
          return res.status(400).json({
            message:
              "Patient has been discharged by doctor but not yet by reception. Cannot create new appointment until reception discharge is complete.",
            currentStatus: "pendingReceptionDischarge",
          });
        }
      }

      // IMPORTANT NEW CHECK: Verify if there's already a pending appointment for this doctor
      const hasExistingPendingAppointment = patientRecord.appointments.some(
        (appt) =>
          appt.doctorId === doctorId &&
          appt.status === "waiting" &&
          !appt.rescheduledTo
      );

      if (hasExistingPendingAppointment) {
        return res.status(400).json({
          message:
            "Patient already has a pending appointment with this doctor. Please reschedule the existing appointment instead of creating a new one.",
          currentStatus: "pendingAppointmentExists",
        });
      }

      // Check if patient has at least one "completed" or valid "rescheduled" appointment
      const hasValidPreviousAppointment = patientRecord.appointments.some(
        (appt) =>
          appt.doctorId === doctorId &&
          (appt.status === "completed" ||
            (appt.status === "rescheduled" && appt.rescheduledTo))
      );

      if (!hasValidPreviousAppointment) {
        return res.status(400).json({
          message:
            "Reappointment not allowed. No completed or rescheduled appointment found with this doctor.",
        });
      }

      // Get the most recent rescheduled appointment to handle the rescheduling flow
      const rescheduledAppointments = patientRecord.appointments.filter(
        (appt) =>
          appt.doctorId === doctorId &&
          appt.status === "rescheduled" &&
          appt.rescheduledTo
      );

      // If there are rescheduled appointments, we'll mark them as handled
      if (rescheduledAppointments.length > 0) {
        // Sort by updatedAt to get the most recent rescheduled appointment
        rescheduledAppointments.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        // Add a field to indicate this new appointment is based on a rescheduled one
        newAppointment.basedOnRescheduledAppointment =
          rescheduledAppointments[0]._id;
      }

      // Add new appointment
      patientRecord.appointments.push(newAppointment);
      await patientRecord.save();

      return res.status(201).json({
        success: true,
        message: "Reappointment booked successfully",
        patientRecord,
      });
    }

    // CASE 2: This is a new patient registration or an existing patient without patientId provided
    else {
      // If patientId is provided, treat as an existing patient
      if (patientId) {
        // Look up patient by patientId ONLY
        let patientRecord = await PatientAppointment.findOne({ patientId });

        if (!patientRecord) {
          return res.status(404).json({
            message:
              "Patient record not found with the provided Patient ID. Please verify the ID.",
          });
        }

        // Check discharge status (same as readmission)
        const existingPatientInSystem = await patientSchema.findOne({
          patientId,
        });

        if (existingPatientInSystem && !existingPatientInSystem.discharged) {
          return res.status(400).json({
            message:
              "Patient is currently admitted and cannot create a new appointment until discharged by a doctor",
            currentStatus: "admitted",
          });
        }

        // Check PatientHistory for reception discharge
        const patientHistory = await PatientHistory.findOne({ patientId });

        if (patientHistory && patientHistory.history.length > 0) {
          const latestRecord =
            patientHistory.history[patientHistory.history.length - 1];

          if (
            latestRecord.dischargeDate &&
            !latestRecord.dischargedByReception
          ) {
            return res.status(400).json({
              message:
                "Patient has been discharged by doctor but not yet by reception. Cannot create new appointment until reception discharge is complete.",
              currentStatus: "pendingReceptionDischarge",
            });
          }
        }

        // IMPORTANT NEW CHECK: Verify if there's already a pending appointment for this doctor
        const hasExistingPendingAppointment = patientRecord.appointments.some(
          (appt) =>
            appt.doctorId === doctorId &&
            appt.status === "waiting" &&
            !appt.rescheduledTo
        );

        if (hasExistingPendingAppointment) {
          return res.status(400).json({
            message:
              "Patient already has a pending appointment with this doctor. Please reschedule the existing appointment instead of creating a new one.",
            currentStatus: "pendingAppointmentExists",
          });
        }

        // Get the most recent rescheduled appointment to handle the rescheduling flow
        const rescheduledAppointments = patientRecord.appointments.filter(
          (appt) =>
            appt.doctorId === doctorId &&
            appt.status === "rescheduled" &&
            appt.rescheduledTo
        );

        // If there are rescheduled appointments, we'll mark them as handled
        if (rescheduledAppointments.length > 0) {
          // Sort by updatedAt to get the most recent rescheduled appointment
          rescheduledAppointments.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );

          // Add a field to indicate this new appointment is based on a rescheduled one
          newAppointment.basedOnRescheduledAppointment =
            rescheduledAppointments[0]._id;
        }

        // Add appointment
        patientRecord.appointments.push(newAppointment);
        await patientRecord.save();

        return res.status(201).json({
          success: true,
          message: "Appointment added for existing patient",
          patientRecord,
        });
      }
      // Truly new patient - no existing records
      else {
        // Generate new patientId
        const newPatientId = generatePatientId(patientName);

        // Create new patient record
        const patientRecord = new PatientAppointment({
          patientId: newPatientId,
          patientName,
          patientContact,
          appointments: [newAppointment],
        });

        await patientRecord.save();

        return res.status(201).json({
          success: true,
          message: "New patient registered and appointment booked",
          patientRecord,
        });
      }
    }
  } catch (error) {
    console.error("Error creating appointment:", error);

    // Handle Duplicate Key Error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "A patient with this information already exists. Try using patientId instead.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const getAppointmentsForReceptionist = async (req, res) => {
  try {
    const {
      status, // Filter by appointment status
      date, // Filter by specific date
      doctorId, // Filter by specific doctor
      appointmentType, // Filter by appointment type (online/offline)
      searchQuery, // Search by patient name or contact
      page = 1, // Pagination
      limit = 10, // Results per page
      sortBy = "date", // Sort field
      sortOrder = "asc", // Sort direction
    } = req.query;

    // Build the filter object
    const filter = {};
    let patientFilter = {};

    // Search by patient name or contact
    if (searchQuery) {
      patientFilter = {
        $or: [
          { patientName: { $regex: searchQuery, $options: "i" } },
          { patientContact: { $regex: searchQuery, $options: "i" } },
        ],
      };
    }

    // Convert to aggregation pipeline for more complex filtering
    const pipeline = [];

    // Match patients based on search query if provided
    if (Object.keys(patientFilter).length > 0) {
      pipeline.push({ $match: patientFilter });
    }

    // Unwind the appointments array to work with individual appointments
    pipeline.push({ $unwind: "$appointments" });

    // Build appointment filters
    const appointmentFilters = {};

    if (status) {
      appointmentFilters["appointments.status"] = status;
    }

    if (date) {
      appointmentFilters["appointments.date"] = date;
    }

    if (doctorId) {
      appointmentFilters["appointments.doctorId"] = doctorId;
    }

    if (appointmentType) {
      appointmentFilters["appointments.appointmentType"] = appointmentType;
    }

    // Apply appointment filters if any exist
    if (Object.keys(appointmentFilters).length > 0) {
      pipeline.push({ $match: appointmentFilters });
    }

    // Add projection to include both patient and appointment info
    pipeline.push({
      $project: {
        patientId: 1,
        patientName: 1,
        patientContact: 1,
        appointment: "$appointments",
      },
    });

    // Add sorting
    const sortField =
      sortBy === "patientName" ? "patientName" : `appointment.${sortBy}`;
    pipeline.push({
      $sort: {
        [sortField]: sortOrder === "desc" ? -1 : 1,
      },
    });

    // Add count metadata
    const countPipeline = [...pipeline];
    const countResult = await PatientAppointment.aggregate([
      ...countPipeline,
      { $count: "totalAppointments" },
    ]);

    const totalAppointments =
      countResult.length > 0 ? countResult[0].totalAppointments : 0;
    const totalPages = Math.ceil(totalAppointments / limit);

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute the aggregation
    const appointments = await PatientAppointment.aggregate(pipeline);

    // Format the response
    return res.status(200).json({
      success: true,
      data: {
        appointments,
        pagination: {
          totalAppointments,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const rescheduleAppointmentByReceptionist = async (req, res) => {
  try {
    const { patientId, appointmentId } = req.params;
    const { newDate, newTime, notes } = req.body;

    // Validate required fields
    if (!patientId || !appointmentId) {
      return res.status(400).json({
        message: "Patient ID and Appointment ID are required",
      });
    }

    if (!newDate || !newTime) {
      return res.status(400).json({
        message: "New date and time are required for rescheduling",
      });
    }

    // Find the patient record
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

    // Verify this is a valid appointment to reschedule
    // (either in waiting status or was previously rescheduled)
    if (appointment.status !== "waiting" && !appointment.rescheduledTo) {
      return res.status(400).json({
        message:
          "Only waiting appointments or appointments with previous reschedule history can be rescheduled",
        currentStatus: appointment.status,
      });
    }

    // Update the current appointment to "rescheduled" status
    patientRecord.appointments[appointmentIndex].status = "rescheduled";
    patientRecord.appointments[
      appointmentIndex
    ].rescheduledTo = `${newDate} ${newTime}`;

    // Create a new appointment with the new date and time
    const newAppointment = {
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      doctorSpecialization: appointment.doctorSpecialization,
      symptoms: appointment.symptoms,
      appointmentType: appointment.appointmentType,
      date: newDate,
      time: newTime,
      status: "waiting",
      paymentStatus: appointment.paymentStatus,
    };

    // Add notes if provided
    if (notes) {
      newAppointment.receptionistNotes = notes;
    }

    // Add the new appointment to the patient's record
    patientRecord.appointments.push(newAppointment);

    // Save the updated patient record
    await patientRecord.save();

    // Return success response
    return res.status(200).json({
      message: "Appointment successfully rescheduled",
      originalAppointment: patientRecord.appointments[appointmentIndex],
      newAppointment:
        patientRecord.appointments[patientRecord.appointments.length - 1],
    });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllAppointments = async (req, res) => {
  try {
    // Fetch all patient records
    const patients = await PatientAppointment.find();

    if (!patients || patients.length === 0) {
      return res.status(404).json({ message: "No appointments found" });
    }

    // Extract all appointments from all patients
    const allAppointments = patients.flatMap((patient) =>
      patient.appointments.map((appt) => ({
        _id: appt._id, // Unique appointment ID
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
        createdAt: appt.createdAt,
        updatedAt: appt.updatedAt,
      }))
    );

    res.status(200).json({ appointments: allAppointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ message: "Doctor ID is required" });
    }

    // Aggregate appointments by doctorId
    const appointments = await PatientAppointment.aggregate([
      { $unwind: "$appointments" }, // Flatten appointments array
      { $match: { "appointments.doctorId": doctorId } }, // Filter by doctorId
      {
        $group: {
          _id: "$appointments.date", // Group by date
          appointments: { $push: "$appointments" }, // Store appointments for that date
        },
      },
      { $sort: { _id: 1 } }, // Sort by date
    ]);

    res.status(200).json({ doctorId, schedule: appointments });
  } catch (error) {
    console.error("Error fetching doctor schedule:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const searchPatientAppointment = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Search using regex for flexible matching
    const patients = await PatientAppointment.find({
      $or: [
        { patientName: { $regex: query, $options: "i" } },
        { patientContact: { $regex: query, $options: "i" } },
        { patientId: query },
      ],
    }).select("patientId patientName patientContact appointments");

    if (!patients.length) {
      return res.status(404).json({ message: "No patient found" });
    }

    res.status(200).json(patients);
  } catch (error) {
    console.error("Error searching for patients:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const admitPatientWithNotes = async (req, res) => {
  try {
    const { admissionId, admitNotes } = req.body;
    console.log("admitNotes", admitNotes);
    // Validation
    if (!admissionId) {
      return res.status(400).json({ message: "Admission ID is required" });
    }

    // Find the patient with the given admission record
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or admission record not found" });
    }

    // Find the admission record in the patient document
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Check if already admitted
    if (patient.admissionRecords[admissionIndex].status === "admitted") {
      return res.status(400).json({
        message: "Patient is already admitted",
        success: false,
      });
    }

    // Update the admission status and admit notes
    patient.admissionRecords[admissionIndex].status = "admitted";
    patient.admissionRecords[admissionIndex].admitNotes = admitNotes;

    // Save the updated patient document
    await patient.save();

    return res.status(200).json({
      message: "Patient admitted successfully with notes",
      success: true,
      patientId: patient._id,
    });
  } catch (error) {
    console.error("Error admitting patient with notes:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      success: false,
    });
  }
};
export const getAdmittedPatients = async (req, res) => {
  try {
    // Find patients where any admission record has status "Admitted"
    const admittedPatients = await patientSchema.find({
      "admissionRecords.status": "admitted",
    });

    res.status(200).json({
      success: true,
      count: admittedPatients.length,
      data: admittedPatients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
// @desc    Assign a specific bed number to a patient
// @route   POST /api/reception/assignBed
// @access  Private/Receptionist
export const assignBedToPatient = async (req, res) => {
  const { patientId, sectionId, bedNumber, admissionRecordId } = req.body;

  // Validate inputs
  if (!patientId || !sectionId || !bedNumber || !admissionRecordId) {
    return res.status(400).json({
      success: false,
      message:
        "Patient ID, section ID, bed number, and admission record ID are required",
    });
  }

  // Check if bed number is a positive integer
  if (!Number.isInteger(bedNumber) || bedNumber <= 0) {
    return res.status(400).json({
      success: false,
      message: "Bed number must be a positive integer",
    });
  }

  // Find the section
  const section = await Section.findById(sectionId);
  if (!section) {
    return res.status(404).json({
      success: false,
      message: `Section not found with id ${sectionId}`,
    });
  }

  // Check if the bed number is within the section's total beds
  if (bedNumber > section.totalBeds) {
    return res.json({
      success: false,
      message: `Bed number ${bedNumber} exceeds total beds in ${section.name}`,
    });
  }

  // Check if the section has available beds
  if (section.availableBeds <= 0) {
    return next(new ErrorResponse(`No available beds in ${section.name}`, 400));
  }

  // Find the patient
  const patient = await patientSchema.findOne({
    patientId: patientId,
    "admissionRecords._id": admissionRecordId,
  });
  if (!patient) {
    return res.json({
      success: false,
      message: `Patient not found with id ${patientId}`,
    });
  }

  // Find the admission record
  const admissionRecord = patient.admissionRecords.id(admissionRecordId);
  if (!admissionRecord) {
    return next(
      new ErrorResponse(
        `Admission record not found with id ${admissionRecordId}`,
        404
      )
    );
  }

  // Check if the patient already has a bed assigned
  // if (admissionRecord.bedNumber) {
  //   return res.json({
  //     success: false,
  //     message: `Patient ${patient.name} already has a bed assigned`,
  //   });
  // }

  // Check if the requested bed is already occupied by another patient
  const bedOccupied = await patientSchema.findOne({
    "admissionRecords.section.id": sectionId,
    "admissionRecords.bedNumber": bedNumber,
    "admissionRecords.status": "admitted",
    discharged: false,
  });

  if (bedOccupied) {
    return res.json({
      success: false,
      message: `Bed number ${bedNumber} is already occupied by another patient`,
    });
  }

  // Update patient's admission record with bed assignment
  admissionRecord.section = {
    id: section._id,
    name: section.name,
    type: section.type,
  };
  admissionRecord.bedNumber = bedNumber;

  // Decrease available beds count in the section
  section.availableBeds -= 1;

  // Save both documents
  await Promise.all([patient.save(), section.save()]);

  res.status(200).json({
    success: true,
    data: {
      patient: {
        _id: patient._id,
        name: patient.name,
        patientId: patient.patientId,
      },
      section: {
        _id: section._id,
        name: section.name,
        type: section.type,
      },
      bedNumber,
      admissionRecord: admissionRecord._id,
    },
    message: `Patient successfully assigned to bed ${bedNumber} in ${section.name}`,
  });
};

// @desc    Get all occupied beds for a section
// @route   GET /api/reception/occupiedBeds/:sectionId
// @access  Private/Receptionist
export const getOccupiedBeds = async (req, res, next) => {
  const { sectionId } = req.params;

  // Find the section
  const section = await Section.findById(sectionId);
  if (!section) {
    return res.status(404).json({
      success: false,
      message: `Section not found with id ${sectionId}`,
    });
  }

  // Find all patients with beds in this section
  const patients = await patientSchema
    .find({
      "admissionRecords.section.id": sectionId,
      "admissionRecords.status": "admitted",
      discharged: false,
    })
    .select("name patientId admissionRecords.$");

  // Extract bed numbers
  const occupiedBeds = patients.map((patient) => {
    const admissionRecord = patient.admissionRecords[0];
    return {
      bedNumber: admissionRecord.bedNumber,
      patientId: patient.patientId,
      patientName: patient.name,
      admissionDate: admissionRecord.admissionDate,
    };
  });

  // Update the availableBeds field based on actual occupied beds count
  section.availableBeds = section.totalBeds - occupiedBeds.length;
  await section.save();

  res.status(200).json({
    success: true,
    count: occupiedBeds.length,
    data: {
      section: {
        _id: section._id,
        name: section.name,
        type: section.type,
        totalBeds: section.totalBeds,
        availableBeds: section.availableBeds,
      },
      occupiedBeds,
    },
  });
};

// @desc    Get all available bed numbers for a section
// @route   GET /api/reception/availableBeds/:sectionId
// @access  Private/Receptionist
export const getAvailableBeds = async (req, res) => {
  const { sectionId } = req.params;

  // Find the section
  const section = await Section.findById(sectionId);
  if (!section) {
    return res.status(404).json({
      success: false,
      message: `Section not found with id ${sectionId}`,
    });
  }

  // Find all patients with active admissions in this section
  const patients = await patientSchema.find({
    "admissionRecords.section.id": sectionId,
    "admissionRecords.status": "admitted",
    discharged: false,
  });

  // Extract occupied bed numbers more accurately
  const occupiedBedNumbers = new Set();
  patients.forEach((patient) => {
    // Only consider admission records that match our criteria
    const matchingRecords = patient.admissionRecords.filter(
      (record) =>
        record.section?.id?.toString() === sectionId &&
        record.status === "admitted"
    );

    matchingRecords.forEach((record) => {
      if (record.bedNumber) {
        occupiedBedNumbers.add(record.bedNumber);
      }
    });
  });

  // Update the availableBeds field based on actual occupied beds
  section.availableBeds = section.totalBeds - occupiedBedNumbers.size;
  await section.save();

  // Generate available bed numbers
  const availableBedNumbers = [];
  for (let i = 1; i <= section.totalBeds; i++) {
    if (!occupiedBedNumbers.has(i)) {
      availableBedNumbers.push(i);
    }
  }

  res.status(200).json({
    success: true,
    count: availableBedNumbers.length,
    data: {
      section: {
        _id: section._id,
        name: section.name,
        type: section.type,
        totalBeds: section.totalBeds,
        availableBeds: section.availableBeds,
      },
      availableBedNumbers,
    },
  });
};
export const addIpdDetails = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      reasonForAdmission,
      symptoms,
      initialDiagnosis,
    } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);

    if (!admissionRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Admission record not found" });
    }

    // Update the fields
    admissionRecord.reasonForAdmission = reasonForAdmission;
    admissionRecord.symptoms = symptoms;
    admissionRecord.initialDiagnosis = initialDiagnosis;
    admissionRecord.ipdDetailsUpdated = true;

    // Save the updated document
    await patient.save();

    res.status(200).json({
      success: true,
      message: "IPD details added successfully",
      updatedAdmissionRecord: admissionRecord,
    });
  } catch (error) {
    console.error("Error adding IPD details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const getAllPatientHistories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "dischargeDate",
      sortOrder = "desc",
      filterBy,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      conditionAtDischarge,
      doctorId,
      patientType,
    } = req.query;

    // Build aggregation pipeline for comprehensive data retrieval
    const pipeline = [
      {
        $unwind: "$history",
      },
      {
        $match: {
          ...(startDate &&
            endDate && {
              "history.dischargeDate": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            }),
          ...(minAmount && {
            "history.amountToBePayed": { $gte: parseFloat(minAmount) },
          }),
          ...(maxAmount && {
            "history.amountToBePayed": { $lte: parseFloat(maxAmount) },
          }),
          ...(conditionAtDischarge && {
            "history.conditionAtDischarge": conditionAtDischarge,
          }),
          ...(doctorId && {
            "history.doctor.id": new mongoose.Types.ObjectId(doctorId),
          }),
          ...(patientType && { "history.patientType": patientType }),
          "history.dischargeDate": { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          "history.lengthOfStay": {
            $ceil: {
              $divide: [
                {
                  $subtract: [
                    "$history.dischargeDate",
                    "$history.admissionDate",
                  ],
                },
                1000 * 60 * 60 * 24, // Convert milliseconds to days
              ],
            },
          },
          "history.totalRevenue": {
            $add: [
              { $ifNull: ["$history.amountToBePayed", 0] },
              { $ifNull: ["$history.previousRemainingAmount", 0] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "history.doctor.id",
          foreignField: "_id",
          as: "doctorDetails",
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "history.section.id",
          foreignField: "_id",
          as: "sectionDetails",
        },
      },
      {
        $project: {
          patientId: 1,
          name: 1,
          age: 1,
          gender: 1,
          contact: 1,
          address: 1,
          dob: 1,
          imageUrl: 1,
          "history.admissionId": 1,
          "history.admissionDate": 1,
          "history.dischargeDate": 1,
          "history.lengthOfStay": 1,
          "history.status": 1,
          "history.patientType": 1,
          "history.reasonForAdmission": 1,
          "history.conditionAtDischarge": 1,
          "history.amountToBePayed": 1,
          "history.previousRemainingAmount": 1,
          "history.totalRevenue": 1,
          "history.weight": 1,
          "history.initialDiagnosis": 1,
          "history.diagnosisByDoctor": 1,
          "history.doctor": 1,
          "history.section": 1,
          "history.bedNumber": 1,
          "history.followUps": {
            $size: { $ifNull: ["$history.followUps", []] },
          },
          "history.fourHrFollowUps": {
            $size: { $ifNull: ["$history.fourHrFollowUpSchema", []] },
          },
          "history.labReportsCount": {
            $size: { $ifNull: ["$history.labReports", []] },
          },
          "history.medicationsCount": {
            $size: { $ifNull: ["$history.medications", []] },
          },
          "history.proceduresCount": {
            $size: { $ifNull: ["$history.procedures", []] },
          },
          "history.doctorNotesCount": {
            $size: { $ifNull: ["$history.doctorNotes", []] },
          },
          doctorDetails: { $arrayElemAt: ["$doctorDetails", 0] },
          sectionDetails: { $arrayElemAt: ["$sectionDetails", 0] },
        },
      },
      {
        $sort: {
          [`history.${sortBy}`]: sortOrder === "desc" ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    const patientHistories = await PatientHistory.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [
      { $unwind: "$history" },
      {
        $match: {
          ...(startDate &&
            endDate && {
              "history.dischargeDate": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            }),
          ...(minAmount && {
            "history.amountToBePayed": { $gte: parseFloat(minAmount) },
          }),
          ...(maxAmount && {
            "history.amountToBePayed": { $lte: parseFloat(maxAmount) },
          }),
          ...(conditionAtDischarge && {
            "history.conditionAtDischarge": conditionAtDischarge,
          }),
          ...(doctorId && {
            "history.doctor.id": new mongoose.Types.ObjectId(doctorId),
          }),
          ...(patientType && { "history.patientType": patientType }),
          "history.dischargeDate": { $exists: true, $ne: null },
        },
      },
      { $count: "total" },
    ];

    const countResult = await PatientHistory.aggregate(countPipeline);
    const totalRecords = countResult[0]?.total || 0;

    // Calculate financial summary
    const financialSummary = await PatientHistory.aggregate([
      { $unwind: "$history" },
      {
        $match: {
          "history.dischargeDate": { $exists: true, $ne: null },
          ...(startDate &&
            endDate && {
              "history.dischargeDate": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            }),
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $add: [
                { $ifNull: ["$history.amountToBePayed", 0] },
                { $ifNull: ["$history.previousRemainingAmount", 0] },
              ],
            },
          },
          totalDischarges: { $sum: 1 },
          averageAmount: {
            $avg: {
              $add: [
                { $ifNull: ["$history.amountToBePayed", 0] },
                { $ifNull: ["$history.previousRemainingAmount", 0] },
              ],
            },
          },
          averageLengthOfStay: {
            $avg: {
              $ceil: {
                $divide: [
                  {
                    $subtract: [
                      "$history.dischargeDate",
                      "$history.admissionDate",
                    ],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        },
      },
    ]);

    // Get discharge condition breakdown
    const dischargeBreakdown = await PatientHistory.aggregate([
      { $unwind: "$history" },
      {
        $match: {
          "history.dischargeDate": { $exists: true, $ne: null },
          ...(startDate &&
            endDate && {
              "history.dischargeDate": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            }),
        },
      },
      {
        $group: {
          _id: "$history.conditionAtDischarge",
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $add: [
                { $ifNull: ["$history.amountToBePayed", 0] },
                { $ifNull: ["$history.previousRemainingAmount", 0] },
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        patientHistories,
        financialSummary: financialSummary[0] || {
          totalRevenue: 0,
          totalDischarges: 0,
          averageAmount: 0,
          averageLengthOfStay: 0,
        },
        dischargeBreakdown,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          hasNext: parseInt(page) * parseInt(limit) < totalRecords,
          hasPrev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching patient histories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Get detailed patient history by patient ID
 * @route GET /api/patient-history/:patientId
 * @access Private
 */
export const getPatientHistoryById = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name specialization")
      .populate("history.section.id", "name type");

    if (!patientHistory) {
      return res.status(404).json({
        success: false,
        message: "Patient history not found",
      });
    }

    // Calculate financial summary for this patient
    const financialSummary = patientHistory.history.reduce(
      (acc, admission) => {
        const totalAmount =
          (admission.amountToBePayed || 0) +
          (admission.previousRemainingAmount || 0);
        acc.totalRevenue += totalAmount;
        acc.totalAdmissions += 1;
        acc.averageAmount = acc.totalRevenue / acc.totalAdmissions;

        const lengthOfStay = Math.ceil(
          (admission.dischargeDate - admission.admissionDate) /
            (1000 * 60 * 60 * 24)
        );
        acc.totalDays += lengthOfStay;
        acc.averageLengthOfStay = acc.totalDays / acc.totalAdmissions;

        return acc;
      },
      {
        totalRevenue: 0,
        totalAdmissions: 0,
        totalDays: 0,
        averageAmount: 0,
        averageLengthOfStay: 0,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        patientHistory,
        financialSummary,
      },
    });
  } catch (error) {
    console.error("Error fetching patient history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const getAllPatientAmountDetails = async (req, res) => {
  try {
    // Get all patients
    const patients = await patientSchema.find({});

    if (!patients || patients.length === 0) {
      return res.status(200).json({
        message: "No patients found.",
        data: [],
      });
    }

    const allPatientAmountDetails = await Promise.all(
      patients.map(async (patient) => {
        // Get patient history for each patient
        const patientHistory = await PatientHistory.findOne({
          patientId: patient.patientId,
        });

        let previousRemainingAmount = 0;
        let totalHistoricalAmount = 0;
        let admissionCount = 0;

        if (patientHistory && patientHistory.history.length > 0) {
          // Get the most recent discharge record
          const lastRecord =
            patientHistory.history[patientHistory.history.length - 1];
          previousRemainingAmount = lastRecord.previousRemainingAmount || 0;

          // Calculate total historical amounts and count admissions
          admissionCount = patientHistory.history.length;
          totalHistoricalAmount = patientHistory.history.reduce(
            (total, record) => {
              return total + (record.amountToBePayed || 0);
            },
            0
          );
        }

        // Check if patient has current admission
        let currentAdmissionAmount = 0;
        if (!patient.discharged && patient.admissionRecords.length > 0) {
          const currentRecord =
            patient.admissionRecords[patient.admissionRecords.length - 1];
          currentAdmissionAmount = currentRecord.amountToBePayed || 0;
          admissionCount += 1; // Add current admission to count
        }

        return {
          patientId: patient.patientId,
          name: patient.name,
          contact: patient.contact,
          age: patient.age,
          gender: patient.gender,
          currentPendingAmount: patient.pendingAmount,
          previousRemainingAmount: previousRemainingAmount,
          totalOutstanding: patient.pendingAmount,
          isCurrentlyAdmitted: !patient.discharged,
          totalAdmissions: admissionCount,
          totalHistoricalAmount: totalHistoricalAmount,
          currentAdmissionAmount: currentAdmissionAmount,
          hasOutstandingBalance: patient.pendingAmount > 0,
        };
      })
    );

    // Sort by pending amount (highest first) to prioritize patients with outstanding balances
    const sortedPatients = allPatientAmountDetails.sort(
      (a, b) => b.currentPendingAmount - a.currentPendingAmount
    );

    // Calculate summary statistics
    const summary = {
      totalPatients: patients.length,
      patientsWithOutstandingBalance: sortedPatients.filter(
        (p) => p.hasOutstandingBalance
      ).length,
      currentlyAdmittedPatients: sortedPatients.filter(
        (p) => p.isCurrentlyAdmitted
      ).length,
      totalOutstandingAmount: sortedPatients.reduce(
        (total, patient) => total + patient.currentPendingAmount,
        0
      ),
      totalHistoricalAmount: sortedPatients.reduce(
        (total, patient) => total + patient.totalHistoricalAmount,
        0
      ),
    };

    return res.status(200).json({
      message: "All patient amount details retrieved successfully.",
      summary: summary,
      data: sortedPatients,
    });
  } catch (error) {
    console.error("Error getting all patient amount details:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving all patient amount details.",
      error: error.message,
    });
  }
};
export const getPatientAmountDetails = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required.",
      });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Get patient history
    const patientHistory = await PatientHistory.findOne({ patientId });

    let previousRemainingAmount = 0;
    let admissionHistory = [];

    if (patientHistory && patientHistory.history.length > 0) {
      // Get the most recent discharge record
      const lastRecord =
        patientHistory.history[patientHistory.history.length - 1];
      previousRemainingAmount = lastRecord.previousRemainingAmount || 0;

      // Get all admission history with amounts
      admissionHistory = patientHistory.history.map((record) => ({
        admissionId: record.admissionId,
        admissionDate: record.admissionDate,
        dischargeDate: record.dischargeDate,
        amountToBePayed: record.amountToBePayed,
        previousRemainingAmount: record.previousRemainingAmount,
        conditionAtDischarge: record.conditionAtDischarge,
      }));
    }

    return res.status(200).json({
      message: "Patient amount details retrieved successfully.",
      data: {
        patientId: patient.patientId,
        name: patient.name,
        currentPendingAmount: patient.pendingAmount,
        previousRemainingAmount: previousRemainingAmount,
        totalOutstanding: patient.pendingAmount,
        isCurrentlyAdmitted: !patient.discharged,
        admissionHistory: admissionHistory,
      },
    });
  } catch (error) {
    console.error("Error getting patient amount details:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving patient amount details.",
      error: error.message,
    });
  }
};
export const getAllPatientAmountDetailsWithBilling = async (req, res) => {
  try {
    // Get all patients
    const patients = await patientSchema.find({});

    if (!patients || patients.length === 0) {
      return res.status(200).json({
        message: "No patients found.",
        data: [],
      });
    }

    const allPatientAmountDetails = await Promise.all(
      patients.map(async (patient) => {
        // Get patient history for each patient
        const patientHistory = await PatientHistory.findOne({
          patientId: patient.patientId,
        });

        // Get billing records for each patient
        const billingRecords = await BillingRecord.find({
          patientId: patient.patientId,
        }).sort({ billingDate: -1 });

        let previousRemainingAmount = 0;
        let totalHistoricalAmount = 0; // Doctor amounts only
        let totalBillingAmount = 0; // Complete billing amounts (doctor + other charges)
        let admissionCount = 0;

        if (patientHistory && patientHistory.history.length > 0) {
          // Get the most recent discharge record
          const lastRecord =
            patientHistory.history[patientHistory.history.length - 1];
          previousRemainingAmount = lastRecord.previousRemainingAmount || 0;

          // Calculate total historical amounts (doctor only) and count admissions
          admissionCount = patientHistory.history.length;
          totalHistoricalAmount = patientHistory.history.reduce(
            (total, record) => {
              return total + (record.amountToBePayed || 0);
            },
            0
          );
        }

        // Calculate total billing amount from billing records
        totalBillingAmount = billingRecords.reduce((total, record) => {
          return total + (record.billingAmount || 0);
        }, 0);

        // Check if patient has current admission
        let currentAdmissionAmount = 0;
        if (!patient.discharged && patient.admissionRecords.length > 0) {
          const currentRecord =
            patient.admissionRecords[patient.admissionRecords.length - 1];
          currentAdmissionAmount = currentRecord.amountToBePayed || 0;
          admissionCount += 1; // Add current admission to count
        }

        return {
          patientId: patient.patientId,
          name: patient.name,
          contact: patient.contact,
          age: patient.age,
          gender: patient.gender,
          currentPendingAmount: patient.pendingAmount,
          previousRemainingAmount: previousRemainingAmount,
          totalOutstanding: patient.pendingAmount,
          isCurrentlyAdmitted: !patient.discharged,
          totalAdmissions: admissionCount,
          totalHistoricalAmount: totalHistoricalAmount, // Doctor amounts only
          totalBillingAmount: totalBillingAmount, // Complete billing (doctor + other charges)
          currentAdmissionAmount: currentAdmissionAmount,
          hasOutstandingBalance: patient.pendingAmount > 0,
          totalBillingRecords: billingRecords.length,
        };
      })
    );

    // Sort by pending amount (highest first)
    const sortedPatients = allPatientAmountDetails.sort(
      (a, b) => b.currentPendingAmount - a.currentPendingAmount
    );

    // Calculate summary statistics
    const summary = {
      totalPatients: patients.length,
      patientsWithOutstandingBalance: sortedPatients.filter(
        (p) => p.hasOutstandingBalance
      ).length,
      currentlyAdmittedPatients: sortedPatients.filter(
        (p) => p.isCurrentlyAdmitted
      ).length,
      totalOutstandingAmount: sortedPatients.reduce(
        (total, patient) => total + patient.currentPendingAmount,
        0
      ),
      totalHistoricalAmount: sortedPatients.reduce(
        (total, patient) => total + patient.totalHistoricalAmount,
        0
      ),
      totalBillingAmount: sortedPatients.reduce(
        (total, patient) => total + patient.totalBillingAmount,
        0
      ),
    };

    return res.status(200).json({
      message: "All patient amount details retrieved successfully.",
      summary: summary,
      data: sortedPatients,
    });
  } catch (error) {
    console.error("Error getting all patient amount details:", error);
    return res.status(500).json({
      message: "An error occurred while retrieving all patient amount details.",
      error: error.message,
    });
  }
};
export const generateDischargeSummary = async (req, res) => {
  const { patientId } = req.params; // Only patientId needed, no admissionId
  const { includeReports = true, template = "standard" } = req.query;
  const userId = req.userId; // From auth middleware

  try {
    // Fetch patient history with comprehensive population
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name specialization license")
      .populate("history.section.id", "name type department");

    if (!patientHistory) {
      return res.status(404).json({
        success: false,
        error: "Patient history not found",
        code: "PATIENT_HISTORY_NOT_FOUND",
      });
    }

    // Check if patient has any history records
    if (!patientHistory.history || patientHistory.history.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No admission history found for this patient",
        code: "NO_ADMISSION_HISTORY",
      });
    }

    // Get the most recent (last) admission record
    const admissionHistory =
      patientHistory.history[patientHistory.history.length - 1];
    const admissionId = admissionHistory.admissionId.toString();

    // Log summary generation request
    console.log(
      `Generating discharge summary for patient ${patientId}, latest admission ${admissionId}`
    );

    // Generate HTML content for discharge summary
    const htmlContent = generateDischargeSummaryHTML(
      patientHistory,
      admissionHistory,
      { includeReports: includeReports === "true", template }
    );

    // Generate PDF with optimized settings
    const pdfBuffer = await generatePdf(htmlContent);

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = patientHistory.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Discharge_Summary_${sanitizedName}_${timestamp}.pdf`;

    // Upload to Google Drive (optional)
    const folderId = "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
    let driveLink = null;

    if (folderId) {
      try {
        driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);
        console.log(`PDF uploaded to Drive: ${driveLink}`);
      } catch (uploadError) {
        console.error("Error uploading to Drive:", uploadError);
        // Continue without failing the request
      }
    }

    // Calculate admission details for response
    const admissionDate = new Date(admissionHistory.admissionDate);
    const dischargeDate = new Date(admissionHistory.dischargeDate);
    const lengthOfStay = Math.ceil(
      (dischargeDate - admissionDate) / (1000 * 60 * 60 * 24)
    );

    // Return JSON response with PDF link and data
    res.status(200).json({
      success: true,
      message: "Discharge summary generated successfully",
      data: {
        fileName,
        driveLink,
        pdfSize: pdfBuffer.length,
        generatedAt: new Date(),
        patientInfo: {
          patientId: patientHistory.patientId,
          name: patientHistory.name,
          age: patientHistory.age,
          gender: patientHistory.gender,
        },
        admissionDetails: {
          admissionId: admissionId,
          admissionDate: admissionDate,
          dischargeDate: dischargeDate,
          lengthOfStay: lengthOfStay,
          attendingDoctor: admissionHistory.doctor?.name || "Not specified",
          department: admissionHistory.section?.name || "Not specified",
          dischargeCondition: admissionHistory.conditionAtDischarge,
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

/**
 * Generate discharge bill for patient
 * Takes patientId and billing charges, uses most recent admission record
 */

export const generateIpdBill = async (req, res) => {
  const { patientId } = req.params;
  const { charges, discount = 0, advance = 0, customCharges = [] } = req.body;

  try {
    // Fetch patient history
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name specialization")
      .populate("history.section.id", "name type");

    if (!patientHistory) {
      return res.status(404).json({
        success: false,
        error: "Patient history not found",
        code: "PATIENT_HISTORY_NOT_FOUND",
      });
    }

    // Check if patient has any history records
    if (!patientHistory.history || patientHistory.history.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No admission history found for this patient",
        code: "NO_ADMISSION_HISTORY",
      });
    }

    // Get the most recent (last) admission record
    const admissionHistory =
      patientHistory.history[patientHistory.history.length - 1];
    const admissionId = admissionHistory.admissionId.toString();

    // IMPORTANT: Get OPD and IPD numbers from admission history
    const opdNumber = admissionHistory.opdNumber;
    const ipdNumber = admissionHistory.ipdNumber;

    // Calculate length of stay
    const admissionDate = new Date(admissionHistory.admissionDate);
    const dischargeDate = new Date(admissionHistory.dischargeDate);
    const lengthOfStay = Math.ceil(
      (dischargeDate - admissionDate) / (1000 * 60 * 60 * 24)
    );

    // Process charges and calculate totals
    const processedCharges = processCharges(charges, lengthOfStay);

    // Process custom charges
    const processedCustomCharges = processCustomCharges(customCharges);

    // Combine all charges
    const allCharges = { ...processedCharges, ...processedCustomCharges };

    const billCalculations = calculateBillTotals(allCharges, discount, advance);
    const billNumber = await Bill.generateBillNumber("IPD");

    // Generate HTML content for bill with OPD/IPD numbers
    const htmlContent = generateDischargeBillHTML(
      patientHistory,
      admissionHistory,
      allCharges,
      billCalculations,
      lengthOfStay
    );

    // Generate PDF
    const pdfBuffer = await generatePdf(htmlContent);

    // Generate unique filename with OPD/IPD numbers
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedName = patientHistory.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Discharge_Bill_${sanitizedName}_OPD${opdNumber}${
      ipdNumber ? `_IPD${ipdNumber}` : ""
    }_${timestamp}.pdf`;

    // Upload to Google Drive (optional)
    const folderId = "1MKYZ4fIUzERPyYzL_8I101agWemxVXts"; // Replace with your folder ID
    let driveLink = null;

    if (folderId) {
      try {
        driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);
        console.log(`Bill PDF uploaded to Drive: ${driveLink}`);
      } catch (uploadError) {
        console.error("Error uploading bill to Drive:", uploadError);
      }
    }

    // Prepare bill data for potential storage (but don't store yet)
    const billData = {
      billNumber,
      billType: "IPD",

      // Patient information
      patient: {
        patientId: patientHistory.patientId,
        name: patientHistory.name,
        age: patientHistory.age,
        gender: patientHistory.gender,
        contact: patientHistory.contact,
        address: patientHistory.address,
      },

      // Admission details with OPD/IPD numbers
      admission: {
        admissionId: admissionHistory.admissionId,
        admissionDate: admissionDate,
        dischargeDate: dischargeDate,
        lengthOfStay: lengthOfStay,
        attendingDoctor: {
          id: admissionHistory.doctor?.id,
          name: admissionHistory.doctor?.name || "Not specified",
        },
        department: {
          id: admissionHistory.section?.id,
          name: admissionHistory.section?.name || "Not specified",
          type: admissionHistory.section?.type,
        },
        bedNumber: admissionHistory.bedNumber,
        roomType: admissionHistory.section?.type || "General",
        // IMPORTANT: Store OPD/IPD numbers in admission details
        opdNumber: opdNumber,
        ipdNumber: ipdNumber,
      },

      // Charges breakdown including custom charges
      chargesBreakdown: allCharges,

      // Financial calculations
      financials: {
        subTotal: billCalculations.totalCharges,
        discountPercent:
          discount > billCalculations.totalCharges
            ? 0
            : (discount / billCalculations.totalCharges) * 100,
        discountAmount: billCalculations.discount,
        advance: billCalculations.advance,
        grandTotal: billCalculations.finalAmount,
        dueAmount: billCalculations.finalAmount,
        paidAmount: 0,
      },

      // Initial payment if advance was given
      payments:
        advance > 0
          ? [
              {
                amount: advance,
                paymentMode: "Advance",
                paymentDate: admissionDate,
                notes: "Advance payment at admission",
              },
            ]
          : [],

      // File management
      files: {
        pdfFileName: fileName,
        driveLink: driveLink,
        pdfSize: pdfBuffer.length,
        uploadedAt: new Date(),
      },

      // Status
      status: "Generated",
      paymentStatus:
        advance >= billCalculations.finalAmount
          ? "Paid"
          : advance > 0
          ? "Partial"
          : "Pending",
    };

    console.log(
      `IPD Bill generated (not stored): ${billNumber} for patient ${patientId}, OPD: ${opdNumber}, IPD: ${
        ipdNumber || "N/A"
      }`
    );

    // Return JSON response with bill data including OPD/IPD numbers + billData for storage
    res.status(200).json({
      success: true,
      message: "Discharge bill generated successfully",
      data: {
        fileName,
        driveLink,
        pdfSize: pdfBuffer.length,
        generatedAt: new Date(),
        patientInfo: {
          patientId: patientHistory.patientId,
          name: patientHistory.name,
          age: patientHistory.age,
          gender: patientHistory.gender,
        },
        admissionDetails: {
          admissionId: admissionId,
          admissionDate: admissionDate,
          dischargeDate: dischargeDate,
          lengthOfStay: lengthOfStay,
          attendingDoctor: admissionHistory.doctor?.name || "Not specified",
          department: admissionHistory.section?.name || "Not specified",
          // IMPORTANT: Include OPD/IPD numbers in response
          opdNumber: opdNumber,
          ipdNumber: ipdNumber,
        },
        billSummary: {
          totalCharges: billCalculations.totalCharges,
          discount: billCalculations.discount,
          advance: billCalculations.advance,
          finalAmount: billCalculations.finalAmount,
        },
        // Add billData for potential storage
        billData: billData,
      },
    });
  } catch (error) {
    console.error("Error generating discharge bill:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate discharge bill",
      code: "BILL_GENERATION_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Process charges and calculate totals based on length of stay
 */
function processCharges(charges, lengthOfStay) {
  const chargesList = [
    "admissionFees",
    "icuCharges",
    "specialCharges",
    "generalWardCharges",
    "surgeonCharges",
    "assistantSurgeonCharges",
    "operationTheatreCharges",
    "operationTheatreMedicines",
    "anaesthesiaCharges",
    "localAnaesthesiaCharges",
    "o2Charges",
    "monitorCharges",
    "tapping",
    "ventilatorCharges",
    "emergencyCharges",
    "micCharges",
    "ivFluids",
    "bloodTransfusionCharges",
    "physioTherapyCharges",
    "xrayFilmCharges",
    "ecgCharges",
    "specialVisitCharges",
    "doctorCharges",
    "nursingCharges",
    "injMedicines",
    "catheterCharges",
    "rylesTubeCharges",
    "miscellaneousCharges",
    "dressingCharges",
    "professionalCharges",
    "serviceTaxCharges",
    "tractionCharges",
    "gastricLavageCharges",
    "plateletCharges",
    "nebulizerCharges",
    "implantCharges",
    "physicianCharges",
    "slabCastCharges",
    "mrfCharges",
    "procCharges",
    "staplingCharges",
    "enemaCharges",
    "gastroscopyCharges",
    "endoscopicCharges",
    "velixCharges",
    "bslCharges",
    "icdtCharges",
    "ophthalmologistCharges",
    // NEW: Add the new fixed charges
    "pharmacyCharges",
    "pathologyCharges",
    "otherCharges",
  ];

  const processedCharges = {};

  chargesList.forEach((chargeType) => {
    if (charges[chargeType]) {
      const rate = parseFloat(charges[chargeType].rate) || 0;
      const days = parseInt(charges[chargeType].days) || lengthOfStay;
      const total = rate * days;

      processedCharges[chargeType] = {
        rate: rate,
        days: days,
        total: total,
        description: getChargeDescription(chargeType),
      };
    }
  });

  return processedCharges;
}

/**
 * Process custom charges added by user
 */
function processCustomCharges(customCharges) {
  const processedCustomCharges = {};

  if (Array.isArray(customCharges)) {
    customCharges.forEach((charge, index) => {
      if (charge && charge.description && charge.rate) {
        const rate = parseFloat(charge.rate) || 0;
        const days = parseInt(charge.days) || 1;
        const total = rate * days;

        const key = `custom_${index}_${charge.description.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}`;

        processedCustomCharges[key] = {
          rate: rate,
          days: days,
          total: total,
          description: charge.description,
          isCustom: true,
        };
      }
    });
  }

  return processedCustomCharges;
}

/**
 * Calculate bill totals including custom charges
 */
function calculateBillTotals(allCharges, discount, advance) {
  let totalCharges = 0;

  // Sum all charges (including custom charges)
  Object.values(allCharges).forEach((charge) => {
    totalCharges += charge.total;
  });

  const discountAmount = parseFloat(discount) || 0;
  const advanceAmount = parseFloat(advance) || 0;
  const finalAmount = totalCharges - discountAmount - advanceAmount;

  return {
    totalCharges,
    discount: discountAmount,
    advance: advanceAmount,
    finalAmount: Math.max(0, finalAmount), // Ensure non-negative
  };
}

/**
 * Get user-friendly description for charge types
 */
function getChargeDescription(chargeType) {
  const descriptions = {
    admissionFees: "Admission Fees",
    icuCharges: "ICU",
    specialCharges: "Special",
    generalWardCharges: "General ward",
    surgeonCharges: "Surgeon Charges",
    assistantSurgeonCharges: "Assistant Surgeon Charges",
    operationTheatreCharges: "Operation Theatre charges",
    operationTheatreMedicines: "Operation Theatre Medicines",
    anaesthesiaCharges: "Anaesthesia charges",
    localAnaesthesiaCharges: "Local Anaesthesia charges",
    o2Charges: "O2 Charges",
    monitorCharges: "Monitor Charges",
    tapping: "Tapping",
    ventilatorCharges: "Ventilator Charges",
    emergencyCharges: "Emergency charges",
    micCharges: "M.I.C Charges",
    ivFluids: "IV Fluids",
    bloodTransfusionCharges: "Blood Transfusion Service Charges",
    physioTherapyCharges: "Physio/Occupation Therapy Charges",
    xrayFilmCharges: "X-Ray Film Charges",
    ecgCharges: "E.C.G. Charges",
    specialVisitCharges: "Special Visit Charges",
    doctorCharges: "Doctor Charges",
    nursingCharges: "Nursing Charges",
    injMedicines: "Inj & Medicines",
    catheterCharges: "Catheter Charges",
    rylesTubeCharges: "Ryles Tube Charges",
    miscellaneousCharges: "Miscellaneous Charges",
    dressingCharges: "Dressing Charges",
    professionalCharges: "Professional Charges",
    serviceTaxCharges: "Service Tax Charges @ 15%",
    tractionCharges: "Traction/SWD/L.F.T.",
    gastricLavageCharges: "Gastric Lavage Charges",
    plateletCharges: "Platelet Charges",
    nebulizerCharges: "Nebulizer Charges",
    implantCharges: "Implant Charges",
    physicianCharges: "Physician Charges",
    slabCastCharges: "Slab/Cast Charges",
    mrfCharges: "M.R.F./Debridement Proc. Charges",
    procCharges: "Proc. Charges / Hydro Therapy",
    staplingCharges: "Stapling/Thomas Splint",
    enemaCharges: "Enema/Proctoscopy",
    gastroscopyCharges: "Gastroscopy/Colonoscopy",
    endoscopicCharges: "Endoscopic Dilatation",
    velixCharges: "Velix /Solumedrol / A.S.V. drip charges",
    bslCharges: "B.S.L. charges",
    icdtCharges: "I.C.D.T. Proc. Charges",
    ophthalmologistCharges: "Ophthalmologist Charges",
    // NEW: Add the new fixed charges
    pharmacyCharges: "Pharmacy Charges",
    pathologyCharges: "Pathology Charges",
    otherCharges: "Other Charges",
  };

  return descriptions[chargeType] || chargeType;
}
export const storeIpdBill = async (req, res) => {
  try {
    const { billData } = req.body;

    if (!billData) {
      return res.status(400).json({
        success: false,
        error: "Bill data is required",
        code: "MISSING_BILL_DATA",
      });
    }

    // Create bill record
    const billRecord = new Bill(billData);

    // Save bill record
    await billRecord.save();

    console.log(
      `IPD Bill stored successfully: ${billData.billNumber} for patient ${billData.patient.patientId}`
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: "IPD bill stored successfully",
      data: {
        billId: billRecord._id,
        billNumber: billRecord.billNumber,
        billNo: billRecord.billNo,
        patientId: billRecord.patient.patientId,
        totalAmount: billRecord.financials.grandTotal,
        status: billRecord.status,
        paymentStatus: billRecord.paymentStatus,
        storedAt: billRecord.createdAt,
      },
    });
  } catch (error) {
    console.error("Error storing IPD bill:", error);

    // Handle duplicate bill number error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Bill with this number already exists",
        code: "DUPLICATE_BILL_NUMBER",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to store IPD bill",
      code: "BILL_STORAGE_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const getLatestPatientRecord = async (req, res) => {
  const { patientId } = req.params;

  // Validate if the patientId is provided
  if (!patientId) {
    return res.status(400).json({
      success: false,
      error: "Patient ID is required",
    });
  }

  try {
    // Fetch the patient history
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name email specialization")
      .populate("history.section.id", "name type")
      .lean(); // Use lean() for better performance since we're only reading

    // Check if history exists for the patient
    if (
      !patientHistory ||
      !patientHistory.history ||
      patientHistory.history.length === 0
    ) {
      return res.status(404).json({
        success: false,
        error: `No history found for patient ID: ${patientId}`,
      });
    }

    // Get the latest record (most recent discharge)
    // Sort by discharge date (most recent first), then by admission date as fallback
    const latestRecord = patientHistory.history.sort((a, b) => {
      // Primary sort: discharge date (most recent first)
      if (a.dischargeDate && b.dischargeDate) {
        return new Date(b.dischargeDate) - new Date(a.dischargeDate);
      }
      // If one has discharge date and other doesn't, prioritize the one with discharge date
      if (a.dischargeDate && !b.dischargeDate) return -1;
      if (!a.dischargeDate && b.dischargeDate) return 1;

      // Fallback: sort by admission date (most recent first)
      return new Date(b.admissionDate) - new Date(a.admissionDate);
    })[0];

    // Structure the response with patient basic info and latest record
    const response = {
      patientInfo: {
        patientId: patientHistory.patientId,
        name: patientHistory.name,
        age: patientHistory.age,
        gender: patientHistory.gender,
        contact: patientHistory.contact,
        address: patientHistory.address,
        dob: patientHistory.dob,
        imageUrl: patientHistory.imageUrl,
      },
      latestRecord: {
        ...latestRecord,
        // Calculate length of stay if both dates are available
        lengthOfStay:
          latestRecord.dischargeDate && latestRecord.admissionDate
            ? Math.ceil(
                (new Date(latestRecord.dischargeDate) -
                  new Date(latestRecord.admissionDate)) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
        // Add summary counts
        summaryStats: {
          totalFollowUps: latestRecord.followUps?.length || 0,
          totalFourHrFollowUps: latestRecord.fourHrFollowUpSchema?.length || 0,
          totalPrescriptions: latestRecord.doctorPrescriptions?.length || 0,
          totalVitalsRecorded: latestRecord.vitals?.length || 0,
          totalDoctorNotes: latestRecord.doctorNotes?.length || 0,
          totalMedications: latestRecord.medications?.length || 0,
          totalIvFluids: latestRecord.ivFluids?.length || 0,
          totalProcedures: latestRecord.procedures?.length || 0,
          totalLabReports: latestRecord.labReports?.length || 0,
        },
      },
      totalAdmissions: patientHistory.history.length,
    };

    res.status(200).json({
      success: true,
      message: "Latest patient record fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching latest patient record:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Calculate bill totals, discount, and final amount
 */

/**
 * Generate HTML content for discharge bill
 */
export const generateManualDischargeSummary = async (req, res) => {
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
    // Fix timezone issue by creating IST time
    const getCurrentIST = () => {
      const now = new Date();
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + istOffset);
      return istTime;
    };

    const currentIST = getCurrentIST();

    // Helper function to convert any date to IST
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

    // Fetch patient history for basic info
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name specialization license")
      .populate("history.section.id", "name type department");

    if (!patientHistory) {
      return res.status(404).json({
        success: false,
        error: "Patient history not found",
        code: "PATIENT_HISTORY_NOT_FOUND",
      });
    }

    // Get latest admission for default values
    let latestAdmission = null;
    if (patientHistory.history && patientHistory.history.length > 0) {
      latestAdmission =
        patientHistory.history[patientHistory.history.length - 1];
    }

    // Helper function to format arrays into readable text
    const formatArrayToText = (arr) => {
      if (!arr || !Array.isArray(arr)) return "N/A";
      return arr.join("\n");
    };

    // Helper function to format General Exam object
    const formatGeneralExam = (examObj) => {
      if (!examObj || typeof examObj !== "object") return "N/A";
      const examParts = [];
      if (examObj.Temp) examParts.push(`Temp : ${examObj.Temp}`);
      if (examObj.Pulse) examParts.push(`Pulse : ${examObj.Pulse}`);
      if (examObj.BP) examParts.push(`BP : ${examObj.BP}`);
      if (examObj.SPO2) examParts.push(`SPO2 : ${examObj.SPO2}`);
      return examParts.length > 0 ? examParts.join(", ") : "N/A";
    };

    // Helper function to format Operation object
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

    // Convert admission and discharge dates to IST
    const admissionDateIST = latestAdmission?.admissionDate
      ? convertToIST(latestAdmission.admissionDate)
      : null;
    const dischargeDateIST = latestAdmission?.dischargeDate
      ? convertToIST(latestAdmission.dischargeDate)
      : currentIST;

    // Prepare summary data extracting from patient history
    const summaryData = {
      // Extract patient basic info from patient history
      patientName: patientHistory.name,
      age: patientHistory.age || "N/A",
      sex: patientHistory.gender || "N/A",
      address: patientHistory.address || "N/A",

      // Extract admission details from latest admission - USE IST TIME
      ipdNo: latestAdmission?.ipdNumber || "N/A",
      opdNo: latestAdmission?.opdNumber || "N/A",
      consultant: latestAdmission?.doctor?.name || "N/A",
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

      // Format clinical data from manual input
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

      // Meta info - USE IST TIME
      generatedBy: userId,
      generatedAt: currentIST, // This is now in IST
      isManuallyGenerated: true,
    };

    console.log(`Generating manual discharge summary for patient ${patientId}`);
    console.log("Summary data prepared:", JSON.stringify(summaryData, null, 2));

    // Generate HTML and PDF
    const htmlContent = generateManualDischargeSummaryHTML(summaryData);
    const pdfBuffer = await generatePdf(htmlContent);

    // Generate filename - USE IST TIME
    const timestamp = currentIST.toISOString().replace(/[:.]/g, "-");
    const sanitizedName = patientHistory.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Manual_Discharge_Summary_${sanitizedName}_${timestamp}.pdf`;

    // Upload to Drive if requested
    let driveLink = null;
    if (uploadToDriveFlag) {
      const folderId =
        process.env.DISCHARGE_SUMMARY_FOLDER_ID ||
        "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
      try {
        driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);
        await DischargeSummary.create({
          patientId,
          patientName: summaryData.patientName,
          fileName,
          driveLink,
          generatedBy: userId,
          generatedAt: summaryData.generatedAt, // IST time
          isManuallyGenerated: true,
        });
        console.log(`Manual discharge summary uploaded to Drive: ${driveLink}`);
      } catch (uploadError) {
        console.error("Error uploading to Drive:", uploadError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Manual discharge summary generated successfully",
      data: {
        fileName,
        driveLink,
        pdfSize: pdfBuffer.length,
        generatedAt: summaryData.generatedAt,
        isManuallyGenerated: true,
        patientInfo: {
          patientId: patientHistory.patientId,
          name: summaryData.patientName,
          age: summaryData.age,
          gender: summaryData.sex,
          opdNumber: summaryData.opdNo,
          ipdNumber: summaryData.ipdNo,
        },
        summaryData: {
          consultant: summaryData.consultant,
          admissionDate: summaryData.admissionDate,
          dischargeDate: summaryData.dischargeDate,
          finalDiagnosis: summaryData.finalDiagnosis,
          conditionOnDischarge: summaryData.conditionOnDischarge,
        },
        extractedFromHistory: {
          patientName: patientHistory.name,
          age: patientHistory.age,
          gender: patientHistory.gender,
          address: patientHistory.address,
          consultant: latestAdmission?.doctor?.name,
          admissionDate: latestAdmission?.admissionDate,
          dischargeDate: latestAdmission?.dischargeDate,
          opdNumber: latestAdmission?.opdNumber,
          ipdNumber: latestAdmission?.ipdNumber,
        },
      },
    });
  } catch (error) {
    console.error("Error generating manual discharge summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate manual discharge summary",
      code: "MANUAL_SUMMARY_GENERATION_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const getAllBills = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      billType,
      paymentStatus,
      status,
      startDate,
      endDate,
      patientId,
      search,
    } = req.query;

    // Build filter query
    const filter = {};

    if (billType) filter.billType = billType;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (status) filter.status = status;
    if (patientId) filter["patient.patientId"] = patientId;

    // Date range filter
    if (startDate || endDate) {
      filter.generatedAt = {};
      if (startDate) filter.generatedAt.$gte = new Date(startDate);
      if (endDate) filter.generatedAt.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { billNumber: new RegExp(search, "i") },
        { "patient.name": new RegExp(search, "i") },
        { "patient.patientId": new RegExp(search, "i") },
      ];
    }

    // Execute query with pagination
    const bills = await Bill.find(filter)
      .sort({ generatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("admission.attendingDoctor.id", "name specialization")
      .lean();

    const total = await Bill.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        bills,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bills",
      code: "BILLS_FETCH_ERROR",
    });
  }
};
export const createDepositReceipt = async (req, res) => {
  const {
    patientId,
    admissionId,
    depositAmount,
    paymentMethod,
    transactionId,
    chequeNumber,
    bankName,
    remarks,
    hospitalDetails,
  } = req.body;

  // Validation
  if (!patientId || !admissionId || !depositAmount || !paymentMethod) {
    return res.status(400).json({
      error:
        "Missing required fields: patientId, admissionId, depositAmount, paymentMethod",
    });
  }

  if (depositAmount <= 0) {
    return res.status(400).json({
      error: "Deposit amount must be greater than 0",
    });
  }

  try {
    // Fetch patient and admission details
    const patient = await patientSchema.findOne({ patientId }).lean();
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    console.log("Full patient record:", JSON.stringify(patient, null, 2));

    // Find the specific admission record
    const admission = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admission) {
      return res.status(404).json({ error: "Admission record not found" });
    }

    console.log("Admission record found:", JSON.stringify(admission, null, 2));

    // Check existing deposits for this admission
    const existingDeposits = await DepositReceipt.find({
      patientId,
      admissionId,
      "receiptDetails.isActive": true,
    }).sort({ "receiptDetails.generatedAt": -1 });

    // Calculate total deposits made so far
    const totalPreviousDeposits = existingDeposits.reduce(
      (sum, receipt) => sum + receipt.depositDetails.depositAmount,
      0
    );

    console.log(`Previous deposits for admission ${admissionId}:`, {
      count: existingDeposits.length,
      totalAmount: totalPreviousDeposits,
      deposits: existingDeposits.map((d) => ({
        receiptId: d.receiptId,
        amount: d.depositDetails.depositAmount,
        date: d.receiptDetails.generatedAt,
      })),
    });

    // Generate unique receipt ID with sequence number
    const sequenceNumber = existingDeposits.length + 1;
    const receiptId = DepositReceipt.generateReceiptId(sequenceNumber);

    // Get Indian Standard Time (IST)
    const istDate = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    // Prepare deposit receipt data
    const depositReceiptData = {
      receiptId,
      patientId,
      admissionId,
      patientDetails: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        address: patient.address,
        patientType: admission.patientType || "Internal",
      },
      admissionDetails: {
        admissionDate: admission.admissionDate,
        reasonForAdmission: admission.reasonForAdmission,
        doctorName: admission.doctor?.name || "Not Assigned",
        sectionName: admission.section?.name || "General",
        bedNumber: admission.bedNumber,
      },
      depositDetails: {
        depositAmount: parseFloat(depositAmount),
        paymentMethod,
        transactionId: transactionId || null,
        chequeNumber: chequeNumber || null,
        bankName: bankName || null,
        remarks: remarks || "",
        // Add sequence and cumulative tracking
        sequenceNumber,
        cumulativeAmount: totalPreviousDeposits + parseFloat(depositAmount),
      },
      receiptDetails: {
        generatedBy: {
          userName: "Receptionist",
          userType: "Reception",
        },
        generatedAt: istDate,
        isActive: true,
      },
      hospitalDetails: hospitalDetails || {
        hospitalName: "Bhosale Hospital",
        hospitalAddress:
          "1Shete mala, Near Ganesh Temple,Narayanwadi Road,Narayangaon,Tal Junnar,Dist Pune,Pin 410504",
        hospitalContact: "+91-9876543210",
        hospitalEmail: "info@cityhospital.com",
        registrationNumber: "REG/2024/001",
      },
      // Access OPD/IPD numbers directly from the admission record
      patientNumbers: {
        opdNumber: admission.opdNumber ? Number(admission.opdNumber) : null,
        ipdNumber: admission.ipdNumber ? Number(admission.ipdNumber) : null,
      },
    };

    console.log(
      "Patient numbers being set:",
      depositReceiptData.patientNumbers
    );

    // Create deposit receipt in database
    const depositReceipt = new DepositReceipt(depositReceiptData);
    await depositReceipt.save();

    console.log("Saved deposit receipt:", {
      receiptId: depositReceipt.receiptId,
      sequenceNumber: depositReceipt.depositDetails.sequenceNumber,
      amount: depositReceipt.depositDetails.depositAmount,
      cumulativeAmount: depositReceipt.depositDetails.cumulativeAmount,
    });

    // Generate PDF receipt with deposit history context
    const htmlContent = generateDepositReceiptHTML(depositReceipt, {
      previousDeposits: existingDeposits,
      isFirstDeposit: sequenceNumber === 1,
    });
    const pdfBuffer = await generatePdf(htmlContent);

    // Upload PDF to Google Drive (optional)
    let receiptUrl = null;
    try {
      const fileName = `deposit-receipt-${receiptId}.pdf`;
      const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";
      receiptUrl = await uploadToDrive(pdfBuffer, fileName, folderId);

      // Update receipt with URL
      depositReceipt.receiptDetails.receiptUrl = receiptUrl;
      await depositReceipt.save();
    } catch (uploadError) {
      console.warn("Failed to upload receipt to Drive:", uploadError);
    }

    res.status(201).json({
      success: true,
      message: `Deposit receipt generated successfully (${sequenceNumber}${
        sequenceNumber === 1
          ? "st"
          : sequenceNumber === 2
          ? "nd"
          : sequenceNumber === 3
          ? "rd"
          : "th"
      } deposit)`,
      data: {
        receiptId,
        sequenceNumber,
        depositAmount: depositReceipt.getFormattedAmount(),
        cumulativeAmount: new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(depositReceipt.depositDetails.cumulativeAmount),
        receiptUrl,
        generatedAt: depositReceipt.receiptDetails.generatedAt,
        opdNumber: admission.opdNumber || null,
        ipdNumber: admission.ipdNumber || null,
        totalDeposits: sequenceNumber,
        previousDepositsCount: existingDeposits.length,
      },
      receipt: depositReceipt,
    });
  } catch (error) {
    console.error("Error creating deposit receipt:", error);
    res.status(500).json({
      error: "Failed to generate deposit receipt",
      details: error.message,
    });
  }
};

// Additional helper function to get all deposits for a patient/admission
export const getDepositHistory = async (req, res) => {
  const { patientId, admissionId } = req.params;

  try {
    const deposits = await DepositReceipt.find({
      patientId,
      ...(admissionId && { admissionId }),
      "receiptDetails.isActive": true,
    }).sort({ "receiptDetails.generatedAt": -1 });

    const totalAmount = deposits.reduce(
      (sum, deposit) => sum + deposit.depositDetails.depositAmount,
      0
    );

    res.json({
      success: true,
      data: {
        deposits,
        summary: {
          totalDeposits: deposits.length,
          totalAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(totalAmount),
          firstDeposit:
            deposits[deposits.length - 1]?.receiptDetails.generatedAt,
          lastDeposit: deposits[0]?.receiptDetails.generatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching deposit history:", error);
    res.status(500).json({
      error: "Failed to fetch deposit history",
      details: error.message,
    });
  }
};
// Get deposit receipt by ID
export const getDepositReceiptById = async (req, res) => {
  const { receiptId } = req.params;

  try {
    const receipt = await DepositReceipt.findOne({
      receiptId,
      "receiptDetails.isActive": true,
    });

    if (!receipt) {
      return res.status(404).json({ error: "Deposit receipt not found" });
    }

    res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error("Error fetching deposit receipt:", error);
    res.status(500).json({
      error: "Failed to fetch deposit receipt",
      details: error.message,
    });
  }
};
export const checkDepositReceiptExists = async (req, res) => {
  const { patientId, admissionId } = req.params;

  try {
    const depositReceipt = await DepositReceipt.findOne({
      patientId,
      admissionId,
      "receiptDetails.isActive": true,
    }).lean();

    const exists = !!depositReceipt;

    res.status(200).json({
      success: true,
      exists,
      data: exists
        ? {
            receiptId: depositReceipt.receiptId,
            depositAmount: depositReceipt.depositDetails.depositAmount,
            paymentMethod: depositReceipt.depositDetails.paymentMethod,
            generatedAt: depositReceipt.receiptDetails.generatedAt,
            receiptUrl: depositReceipt.receiptDetails.receiptUrl,
          }
        : null,
      message: exists
        ? "Deposit receipt found for this admission"
        : "No deposit receipt found for this admission",
    });
  } catch (error) {
    console.error("Error checking deposit receipt:", error);
    res.status(500).json({
      error: "Failed to check deposit receipt status",
      details: error.message,
    });
  }
};
export const cancelDepositReceipt = async (req, res) => {
  const { receiptId } = req.params;
  const { reason } = req.body;

  try {
    const receipt = await DepositReceipt.findOne({ receiptId });

    if (!receipt) {
      return res.status(404).json({ error: "Deposit receipt not found" });
    }

    if (!receipt.receiptDetails.isActive) {
      return res.status(400).json({ error: "Receipt is already cancelled" });
    }

    // Update receipt status
    receipt.receiptDetails.isActive = false;
    receipt.metadata.updatedAt = new Date();

    // Add cancellation details
    receipt.cancellationDetails = {
      cancelledAt: new Date(),
      reason: reason || "Manual cancellation",
    };

    await receipt.save();

    res.status(200).json({
      success: true,
      message: "Deposit receipt cancelled successfully",
      data: receipt,
    });
  } catch (error) {
    console.error("Error cancelling deposit receipt:", error);
    res.status(500).json({
      error: "Failed to cancel deposit receipt",
      details: error.message,
    });
  }
};
export const getAllDeposits = async (req, res) => {
  try {
    const deposits = await DepositReceipt.find().sort({
      "receiptDetails.generatedAt": -1,
    });
    res.status(200).json({
      success: true,
      count: deposits.length,
      data: deposits,
    });
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deposits",
      error: error.message,
    });
  }
};
export const getDepositSummaryDashboard = async (req, res) => {
  try {
    const { timeRange = "30" } = req.query; // Default last 30 days

    const dateFilter = {
      "receiptDetails.generatedAt": {
        $gte: new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000),
      },
      "receiptDetails.isActive": true,
    };

    // Overall statistics
    const [overallStats, recentDeposits, topDoctors, paymentMethodStats] =
      await Promise.all([
        // Overall statistics
        DepositReceipt.aggregate([
          { $match: { "receiptDetails.isActive": true } },
          {
            $group: {
              _id: null,
              totalReceipts: { $sum: 1 },
              totalAmount: { $sum: "$depositDetails.depositAmount" },
              avgAmount: { $avg: "$depositDetails.depositAmount" },
              minAmount: { $min: "$depositDetails.depositAmount" },
              maxAmount: { $max: "$depositDetails.depositAmount" },
            },
          },
        ]),

        // Recent deposits (last 10)
        DepositReceipt.find({ "receiptDetails.isActive": true })
          .sort({ "receiptDetails.generatedAt": -1 })
          .limit(10)
          .select(
            "receiptId patientId patientDetails.name depositDetails.depositAmount depositDetails.paymentMethod receiptDetails.generatedAt"
          )
          .lean(),

        // Top doctors by deposit count
        DepositReceipt.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$admissionDetails.doctorName",
              count: { $sum: 1 },
              totalAmount: { $sum: "$depositDetails.depositAmount" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        // Payment method statistics
        DepositReceipt.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$depositDetails.paymentMethod",
              count: { $sum: 1 },
              totalAmount: { $sum: "$depositDetails.depositAmount" },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    // Daily deposit trends (last 30 days)
    const dailyTrends = await DepositReceipt.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$receiptDetails.generatedAt" },
            month: { $month: "$receiptDetails.generatedAt" },
            day: { $dayOfMonth: "$receiptDetails.generatedAt" },
          },
          count: { $sum: 1 },
          amount: { $sum: "$depositDetails.depositAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      {
        $project: {
          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
            },
          },
          count: 1,
          amount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Deposit summary dashboard retrieved successfully",
      data: {
        overview: overallStats[0] || {
          totalReceipts: 0,
          totalAmount: 0,
          avgAmount: 0,
          minAmount: 0,
          maxAmount: 0,
        },
        recentDeposits: recentDeposits.map((deposit) => ({
          receiptId: deposit.receiptId,
          patientId: deposit.patientId,
          patientName: deposit.patientDetails.name,
          amount: deposit.depositDetails.depositAmount,
          formattedAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(deposit.depositDetails.depositAmount),
          paymentMethod: deposit.depositDetails.paymentMethod,
          generatedAt: deposit.receiptDetails.generatedAt,
          daysAgo: Math.ceil(
            (new Date() - new Date(deposit.receiptDetails.generatedAt)) /
              (1000 * 60 * 60 * 24)
          ),
        })),
        topDoctors: topDoctors.map((doctor) => ({
          doctorName: doctor._id,
          depositCount: doctor.count,
          totalAmount: doctor.totalAmount,
          formattedAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(doctor.totalAmount),
        })),
        paymentMethodStats: paymentMethodStats.map((method) => ({
          paymentMethod: method._id,
          count: method.count,
          totalAmount: method.totalAmount,
          formattedAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(method.totalAmount),
          percentage: 0, // Will be calculated on frontend
        })),
        dailyTrends: dailyTrends.map((trend) => ({
          date: trend.date,
          count: trend.count,
          amount: trend.amount,
          formattedAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(trend.amount),
        })),
        timeRange: parseInt(timeRange),
      },
    });
  } catch (error) {
    console.error("Error fetching deposit summary dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch deposit summary dashboard",
      details: error.message,
    });
  }
};

// Export deposit receipts to CSV
export const exportDepositReceipts = async (req, res) => {
  try {
    const {
      patientId,
      receiptId,
      paymentMethod,
      doctorName,
      sectionName,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      isActive = true,
    } = req.query;

    // Build filter object (same as getAllDepositReceipts)
    const filter = {};
    filter["receiptDetails.isActive"] = isActive === "true";

    if (patientId) filter.patientId = { $regex: patientId, $options: "i" };
    if (receiptId) filter.receiptId = { $regex: receiptId, $options: "i" };
    if (paymentMethod) filter["depositDetails.paymentMethod"] = paymentMethod;
    if (doctorName)
      filter["admissionDetails.doctorName"] = {
        $regex: doctorName,
        $options: "i",
      };
    if (sectionName)
      filter["admissionDetails.sectionName"] = {
        $regex: sectionName,
        $options: "i",
      };

    if (dateFrom || dateTo) {
      filter["receiptDetails.generatedAt"] = {};
      if (dateFrom)
        filter["receiptDetails.generatedAt"].$gte = new Date(dateFrom);
      if (dateTo) filter["receiptDetails.generatedAt"].$lte = new Date(dateTo);
    }

    if (amountMin || amountMax) {
      filter["depositDetails.depositAmount"] = {};
      if (amountMin)
        filter["depositDetails.depositAmount"].$gte = parseFloat(amountMin);
      if (amountMax)
        filter["depositDetails.depositAmount"].$lte = parseFloat(amountMax);
    }

    // Get all matching deposits
    const deposits = await DepositReceipt.find(filter)
      .sort({ "receiptDetails.generatedAt": -1 })
      .lean();

    // Create CSV headers
    const csvHeaders = [
      "Receipt ID",
      "Patient ID",
      "Patient Name",
      "Patient Contact",
      "Age",
      "Gender",
      "Admission Date",
      "Doctor Name",
      "Section",
      "Bed Number",
      "Deposit Amount",
      "Payment Method",
      "Transaction ID",
      "Cheque Number",
      "Bank Name",
      "Generated At",
      "Generated By",
      "Remarks",
    ];

    // Create CSV rows
    const csvRows = deposits.map((deposit) => [
      deposit.receiptId,
      deposit.patientId,
      deposit.patientDetails.name,
      deposit.patientDetails.contact,
      deposit.patientDetails.age,
      deposit.patientDetails.gender,
      new Date(deposit.admissionDetails.admissionDate).toLocaleDateString(
        "en-IN"
      ),
      deposit.admissionDetails.doctorName,
      deposit.admissionDetails.sectionName || "",
      deposit.admissionDetails.bedNumber || "",
      deposit.depositDetails.depositAmount,
      deposit.depositDetails.paymentMethod,
      deposit.depositDetails.transactionId || "",
      deposit.depositDetails.chequeNumber || "",
      deposit.depositDetails.bankName || "",
      new Date(deposit.receiptDetails.generatedAt).toLocaleString("en-IN"),
      `${deposit.receiptDetails.generatedBy.userName} (${deposit.receiptDetails.generatedBy.userType})`,
      deposit.depositDetails.remarks || "",
    ]);

    // Combine headers and rows
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // Set response headers for CSV download
    const fileName = `deposit-receipts-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.status(200).send(csvContent);
  } catch (error) {
    console.error("Error exporting deposit receipts:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export deposit receipts",
      details: error.message,
    });
  }
};
export const getAdmissionDepositSummary = async (req, res) => {
  const { admissionId } = req.params;

  try {
    const deposits = await DepositReceipt.find({
      admissionId,
      "receiptDetails.isActive": true,
    }).sort({ "receiptDetails.generatedAt": 1 });

    if (deposits.length === 0) {
      return res.json({
        success: true,
        data: {
          hasDeposits: false,
          totalAmount: 0,
          depositsCount: 0,
          deposits: [],
        },
      });
    }

    const totalAmount = deposits.reduce(
      (sum, deposit) => sum + deposit.depositDetails.depositAmount,
      0
    );

    res.json({
      success: true,
      data: {
        hasDeposits: true,
        totalAmount,
        formattedTotalAmount: new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(totalAmount),
        depositsCount: deposits.length,
        deposits: deposits.map((deposit) => ({
          receiptId: deposit.receiptId,
          amount: deposit.depositDetails.depositAmount,
          formattedAmount: deposit.getFormattedAmount(),
          paymentMethod: deposit.depositDetails.paymentMethod,
          generatedAt: deposit.receiptDetails.generatedAt,
          sequenceNumber:
            deposit.depositDetails.sequenceNumber ||
            deposits.indexOf(deposit) + 1,
        })),
        firstDeposit: deposits[0].receiptDetails.generatedAt,
        lastDeposit: deposits[deposits.length - 1].receiptDetails.generatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching admission deposit summary:", error);
    res.status(500).json({
      error: "Failed to fetch admission deposit summary",
      details: error.message,
    });
  }
};
export const getAllPatientsDeposits = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "totalAmount",
      sortOrder = "desc",
      patientName,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      patientType,
    } = req.query;

    // Build match conditions for filtering
    const matchConditions = {
      "receiptDetails.isActive": true,
    };

    // Date range filter
    if (startDate || endDate) {
      matchConditions["receiptDetails.generatedAt"] = {};
      if (startDate) {
        matchConditions["receiptDetails.generatedAt"]["$gte"] = new Date(
          startDate
        );
      }
      if (endDate) {
        matchConditions["receiptDetails.generatedAt"]["$lte"] = new Date(
          endDate
        );
      }
    }

    // Patient type filter
    if (patientType) {
      matchConditions["patientDetails.patientType"] = patientType;
    }

    // Amount range filter (will be applied after aggregation)
    const amountFilter = {};
    if (minAmount) amountFilter["$gte"] = parseFloat(minAmount);
    if (maxAmount) amountFilter["$lte"] = parseFloat(maxAmount);

    // Aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: "$patientId",
          patientName: { $first: "$patientDetails.name" },
          patientAge: { $first: "$patientDetails.age" },
          patientGender: { $first: "$patientDetails.gender" },
          patientContact: { $first: "$patientDetails.contact" },
          patientType: { $first: "$patientDetails.patientType" },
          totalDeposits: { $sum: 1 },
          totalAmount: { $sum: "$depositDetails.depositAmount" },
          firstDepositDate: { $min: "$receiptDetails.generatedAt" },
          lastDepositDate: { $max: "$receiptDetails.generatedAt" },
          admissions: { $addToSet: "$admissionId" },
          paymentMethods: { $addToSet: "$depositDetails.paymentMethod" },
          deposits: {
            $push: {
              receiptId: "$receiptId",
              admissionId: "$admissionId",
              amount: "$depositDetails.depositAmount",
              paymentMethod: "$depositDetails.paymentMethod",
              sequenceNumber: "$depositDetails.sequenceNumber",
              generatedAt: "$receiptDetails.generatedAt",
              receiptUrl: "$receiptDetails.receiptUrl",
            },
          },
        },
      },
      {
        $addFields: {
          totalAdmissions: { $size: "$admissions" },
          formattedTotalAmount: {
            $concat: [
              "₹",
              {
                $toString: {
                  $round: ["$totalAmount", 2],
                },
              },
            ],
          },
          averageDepositAmount: {
            $round: [{ $divide: ["$totalAmount", "$totalDeposits"] }, 2],
          },
        },
      },
    ];

    // Apply patient name filter if provided
    if (patientName) {
      pipeline.push({
        $match: {
          patientName: { $regex: patientName, $options: "i" },
        },
      });
    }

    // Apply amount filter if provided
    if (Object.keys(amountFilter).length > 0) {
      pipeline.push({
        $match: {
          totalAmount: amountFilter,
        },
      });
    }

    // Sort
    const sortField = sortBy === "patientName" ? "patientName" : "totalAmount";
    const sortDirection = sortOrder === "asc" ? 1 : -1;
    pipeline.push({
      $sort: { [sortField]: sortDirection },
    });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await DepositReceipt.aggregate(countPipeline);
    const totalRecords = countResult[0]?.total || 0;

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute aggregation
    const patientsDeposits = await DepositReceipt.aggregate(pipeline);

    // Calculate overall statistics
    const overallStats = await DepositReceipt.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalPatients: { $addToSet: "$patientId" },
          totalDeposits: { $sum: 1 },
          totalAmount: { $sum: "$depositDetails.depositAmount" },
          averageDepositAmount: { $avg: "$depositDetails.depositAmount" },
          minDepositAmount: { $min: "$depositDetails.depositAmount" },
          maxDepositAmount: { $max: "$depositDetails.depositAmount" },
        },
      },
      {
        $addFields: {
          totalPatients: { $size: "$totalPatients" },
        },
      },
    ]);

    const stats = overallStats[0] || {
      totalPatients: 0,
      totalDeposits: 0,
      totalAmount: 0,
      averageDepositAmount: 0,
      minDepositAmount: 0,
      maxDepositAmount: 0,
    };

    res.json({
      success: true,
      data: {
        patients: patientsDeposits,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          recordsPerPage: parseInt(limit),
          hasNextPage:
            parseInt(page) < Math.ceil(totalRecords / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
        summary: {
          totalPatients: stats.totalPatients,
          totalDeposits: stats.totalDeposits,
          totalAmount: stats.totalAmount,
          formattedTotalAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(stats.totalAmount),
          averageDepositAmount: Math.round(stats.averageDepositAmount || 0),
          formattedAverageDepositAmount: new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(stats.averageDepositAmount || 0),
          minDepositAmount: stats.minDepositAmount,
          maxDepositAmount: stats.maxDepositAmount,
          averageDepositsPerPatient:
            stats.totalPatients > 0
              ? Math.round((stats.totalDeposits / stats.totalPatients) * 100) /
                100
              : 0,
        },
        filters: {
          applied: {
            patientName: patientName || null,
            minAmount: minAmount || null,
            maxAmount: maxAmount || null,
            startDate: startDate || null,
            endDate: endDate || null,
            patientType: patientType || null,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching patients deposits:", error);
    res.status(500).json({
      error: "Failed to fetch patients deposits",
      details: error.message,
    });
  }
};
export const generatePatientRecordPDFs = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { reportTypes } = req.body;

    // Validate required fields
    if (
      !reportTypes ||
      !Array.isArray(reportTypes) ||
      reportTypes.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "reportTypes array is required. Available types: symptoms, vitals, diagnosis, prescriptions, consulting, doctorNotes",
      });
    }

    // Validate if the patientId is provided
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    // Fetch the patient history
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name email specialization")
      .populate("history.section.id", "name type")
      .populate("history.followUps.nurseId", "name")
      .lean(); // Use lean() for better performance since we're only reading

    // Check if history exists for the patient
    if (
      !patientHistory ||
      !patientHistory.history ||
      patientHistory.history.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: `No history found for patient ID: ${patientId}`,
      });
    }

    // Get the latest record (most recent discharge)
    // Sort by discharge date (most recent first), then by admission date as fallback
    const latestRecord = patientHistory.history.sort((a, b) => {
      // Primary sort: discharge date (most recent first)
      if (a.dischargeDate && b.dischargeDate) {
        return new Date(b.dischargeDate) - new Date(a.dischargeDate);
      }
      // If one has discharge date and other doesn't, prioritize the one with discharge date
      if (a.dischargeDate && !b.dischargeDate) return -1;
      if (!a.dischargeDate && b.dischargeDate) return 1;

      // Fallback: sort by admission date (most recent first)
      return new Date(b.admissionDate) - new Date(a.admissionDate);
    })[0];

    // Hardcoded hospital information
    const hospital = {
      name: "Bhosale Hospital",
      address:
        "1Shete mala, Near Ganesh Temple,Narayanwadi Road,Narayangaon,Tal Junnar,Dist Pune,Pin 410504",
      phone: "+91 9876543210",
      email: "info@bhosalehospital.com",
      website: "www.bhosalehospital.com",
      bannerImageUrl:
        "https://res.cloudinary.com/dnznafp2a/image/upload/v1752657276/Spandan_Hospital_8_1_qfbqgb.png",
      folderId: "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV", // Your Google Drive folder ID
    };

    const availableReports = {
      symptoms: "Symptoms Report",
      vitals: "Vital Signs Report",
      diagnosis: "Diagnosis Report",
      prescriptions: "Prescriptions Report",
      consulting: "Consulting Report",
      doctorNotes: "Doctor Notes Report",
    };

    // Validate report types
    const invalidTypes = reportTypes.filter((type) => !availableReports[type]);
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid report types: ${invalidTypes.join(
          ", "
        )}. Available types: ${Object.keys(availableReports).join(", ")}`,
      });
    }

    const generatedPDFs = [];
    const errors = [];

    // Generate PDFs for each requested report type
    for (const reportType of reportTypes) {
      try {
        let htmlContent = "";
        let fileName = "";

        switch (reportType) {
          case "symptoms":
            htmlContent = generateSymptomsHTML(
              patientHistory,
              latestRecord,
              hospital
            );
            fileName = `${patientId}_Symptoms_${Date.now()}.pdf`;
            break;

          case "vitals":
            htmlContent = generateVitalsHTML(
              patientHistory,
              latestRecord,
              hospital
            );
            fileName = `${patientId}_Vitals_${Date.now()}.pdf`;
            break;

          case "diagnosis":
            htmlContent = generateDiagnosisHTML(
              patientHistory,
              latestRecord,
              hospital
            );
            fileName = `${patientId}_Diagnosis_${Date.now()}.pdf`;
            break;

          case "prescriptions":
            htmlContent = generatePrescriptionsHTML(
              patientHistory,
              latestRecord,
              hospital
            );
            fileName = `${patientId}_Prescriptions_${Date.now()}.pdf`;
            break;

          case "consulting":
            htmlContent = generateConsultingHTML(
              patientHistory,
              latestRecord,
              hospital
            );
            fileName = `${patientId}_Consulting_${Date.now()}.pdf`;
            break;

          case "doctorNotes":
            htmlContent = generateDoctorNotesHTML(
              patientHistory,
              latestRecord,
              hospital
            );
            fileName = `${patientId}_DoctorNotes_${Date.now()}.pdf`;
            break;
        }

        // Generate PDF
        const pdfBuffer = await generatePdf(htmlContent);

        // Upload to Google Drive
        const driveLink = await uploadToDrive(
          pdfBuffer,
          fileName,
          hospital.folderId
        );

        generatedPDFs.push({
          reportType,
          reportName: availableReports[reportType],
          fileName,
          driveLink,
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error generating ${reportType} PDF:`, error);
        errors.push({
          reportType,
          error: error.message,
        });
      }
    }

    // Calculate length of stay
    const lengthOfStay =
      latestRecord.dischargeDate && latestRecord.admissionDate
        ? Math.ceil(
            (new Date(latestRecord.dischargeDate) -
              new Date(latestRecord.admissionDate)) /
              (1000 * 60 * 60 * 24)
          )
        : null;

    // Response
    const response = {
      success: true,
      message: "PDF generation completed",
      patientInfo: {
        patientId: patientHistory.patientId,
        name: patientHistory.name,
        age: patientHistory.age,
        gender: patientHistory.gender,
        contact: patientHistory.contact,
        address: patientHistory.address,
        dob: patientHistory.dob,
        imageUrl: patientHistory.imageUrl,
      },
      latestAdmission: {
        opdNumber: latestRecord.opdNumber,
        ipdNumber: latestRecord.ipdNumber,
        admissionDate: latestRecord.admissionDate,
        dischargeDate: latestRecord.dischargeDate,
        doctor: latestRecord.doctor?.name,
        status: latestRecord.status,
        conditionAtDischarge: latestRecord.conditionAtDischarge,
        lengthOfStay,
        summaryStats: {
          totalFollowUps: latestRecord.followUps?.length || 0,
          totalFourHrFollowUps: latestRecord.fourHrFollowUpSchema?.length || 0,
          totalPrescriptions: latestRecord.doctorPrescriptions?.length || 0,
          totalVitalsRecorded: latestRecord.vitals?.length || 0,
          totalDoctorNotes: latestRecord.doctorNotes?.length || 0,
          totalMedications: latestRecord.medications?.length || 0,
          totalIvFluids: latestRecord.ivFluids?.length || 0,
          totalProcedures: latestRecord.procedures?.length || 0,
          totalLabReports: latestRecord.labReports?.length || 0,
        },
      },
      totalAdmissions: patientHistory.history.length,
      generatedPDFs,
      totalGenerated: generatedPDFs.length,
      totalRequested: reportTypes.length,
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` with ${errors.length} error(s)`;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in generatePatientRecordPDFs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while generating PDFs",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

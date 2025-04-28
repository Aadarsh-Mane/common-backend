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
    if (file) {
      const auth = new google.auth.GoogleAuth({
        credentials: ServiceAccount,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      const drive = google.drive({ version: "v3", auth });

      // Convert buffer to a readable stream
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      // Upload file to Google Drive
      const fileMetadata = {
        name: file.originalname, // Use the original file name
        parents: ["1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"], // Replace with your shared folder ID
      };
      const media = {
        mimeType: file.mimetype,
        body: bufferStream, // Stream the buffer directly
      };

      const uploadResponse = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });

      const imageUrl = uploadResponse.data.webViewLink; // Link to the uploaded file

      if (isReadmission === "true") {
        // Fetch patient by name and contact (or implement different search criteria)
        // patient = await patientSchema.findOne({ name, contact });
        if (!req.body.patientId) {
          return res
            .status(404)
            .json({ error: "Patient ID is required for readmission." });
        }
        patient = await patientSchema.findOne({
          patientId: req.body.patientId,
        }); // Assuming patientId is provided for readmission
        if (!patient.discharged)
          return res
            .status(400)
            .json({ message: "Patient is not discharged." });
        if (patient) {
          let daysSinceLastAdmission = null;

          // Check if the patient has been discharged
          if (!patient.discharged) {
            // Calculate days since last admission if not discharged
            if (patient.admissionRecords.length > 0) {
              const lastAdmission =
                patient.admissionRecords[patient.admissionRecords.length - 1]
                  .admissionDate;
              daysSinceLastAdmission = dayjs().diff(
                dayjs(lastAdmission),
                "day"
              );
            }
          } else {
            // If discharged, check discharge history
            const patientHistory = await PatientHistory.findOne({
              patientId: patient.patientId,
            });

            if (patientHistory) {
              // Fetch the latest discharge date
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

            // Set discharged status to false for re-admission
            patient.discharged = false;
          }

          // Update all patient details
          patient.name = name;
          patient.age = age;
          patient.gender = gender;
          patient.contact = contact;
          patient.address = address;
          patient.caste = caste;
          patient.imageUrl = imageUrl;

          // Add new admission record for re-admission
          patient.admissionRecords.push({
            admissionDate: new Date(),
            reasonForAdmission,
            weight,
            symptoms,
            initialDiagnosis,
          });

          // Save updated patient record
          await patient.save();
          // const messageBody = `Dear ${name}, welcome to our saideep hospital. Your patient ID is ${req.body.patientId}. Wishing you a speedy recovery!`;

          // await client.messages.create({
          //   from: "+14152149378", // Twilio phone number
          //   to: `+91${contact}`, // Ensure the correct string interpolation
          //   body: messageBody,
          // });
          return res.status(200).json({
            message: `Patient ${name} re-admitted successfully.`,
            patientDetails: patient,
            daysSinceLastAdmission,
            admissionRecords: patient.admissionRecords,
          });
        } else {
          return res
            .status(404)
            .json({ message: "Patient not found for readmission." });
        }
      } else {
        // If not a readmission, create a new patient
        const patientId = name;

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
            },
          ],
        });

        await patient.save();
        // const messageBody = `Dear ${name}, welcome to our saideep hospital. Your patient ID is ${patientId}. Wishing you a speedy recovery!`;

        // await client.messages.create({
        //   from: "+14152149378", // Twilio phone number
        //   to: `+91${contact}`, // Ensure the correct string interpolation
        //   body: messageBody,
        // });
        return res.status(200).json({
          message: `Patient ${name} added successfully with ID ${patientId}.`,
          patientDetails: patient,
        });
      }
    } else {
      if (isReadmission === "true") {
        // Fetch patient by name and contact (or implement different search criteria)
        // patient = await patientSchema.findOne({ name, contact });
        if (!req.body.patientId)
          return res
            .status(404)
            .json({ error: "Patient ID is required for readmission." });
        patient = await patientSchema.findOne({
          patientId: req.body.patientId,
        }); // Assuming patientId is provided for readmission
        if (!patient.discharged) {
          return res
            .status(400)
            .json({ message: "Patient is not discharged." });
        }
        const addy = req.body.patientId;
        const patientHistory = await PatientHistory.findOne({
          patientId: addy,
        });
        const lastRecord =
          patientHistory.history[patientHistory.history.length - 1];

        if (!lastRecord.dischargedByReception) {
          return res.status(400).json({
            message: "Patient has not been discharged by reception.",
          });
        }
        if (patient) {
          let daysSinceLastAdmission = null;

          // Check if the patient has been discharged
          if (!patient.discharged) {
            // Calculate days since last admission if not discharged
            if (patient.admissionRecords.length > 0) {
              const lastAdmission =
                patient.admissionRecords[patient.admissionRecords.length - 1]
                  .admissionDate;
              daysSinceLastAdmission = dayjs().diff(
                dayjs(lastAdmission),
                "day"
              );
            }
          } else {
            // If discharged, check discharge history
            const patientHistory = await PatientHistory.findOne({
              patientId: patient.patientId,
            });

            if (patientHistory) {
              // Fetch the latest discharge date
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

            // Set discharged status to false for re-admission
            patient.discharged = false;
          }

          // Update all patient details
          patient.name = name;
          patient.age = age;
          patient.gender = gender;
          patient.contact = contact;
          patient.address = address;
          patient.caste = caste;

          // Add new admission record for re-admission
          patient.admissionRecords.push({
            admissionDate: new Date(),
            reasonForAdmission,
            weight,
            symptoms,
            initialDiagnosis,
          });

          // Save updated patient record
          await patient.save();
          // const messageBody = `Dear ${name}, welcome to our saideep hospital. Your patient ID is ${req.body.patientId}. Wishing you a speedy recovery!`;

          // await client.messages.create({
          //   from: "+14152149378", // Twilio phone number
          //   to: `+91${contact}`, // Ensure the correct string interpolation
          //   body: messageBody,
          // });
          return res.status(200).json({
            message: `Patient ${name} re-admitted successfully.`,
            patientDetails: patient,
            daysSinceLastAdmission,
            admissionRecords: patient.admissionRecords,
          });
        } else {
          return res
            .status(404)
            .json({ message: "Patient not found for readmission." });
        }
      } else {
        // If not a readmission, create a new patient
        const patientId = generatePatientId(name);

        patient = new patientSchema({
          patientId,
          name,
          age,
          gender,
          contact,
          address,
          caste,
          admissionRecords: [
            {
              admissionDate: new Date(),
              reasonForAdmission,
              symptoms,
              initialDiagnosis,
              weight,
            },
          ],
        });

        await patient.save();
        // const messageBody = `Dear ${name}, welcome to our spandan hospital. Your patient ID is ${patientId}. Wishing you a speedy recovery!`;

        // await client.messages.create({
        //   from: "+14152149378", // Twilio phone number
        //   to: `+91${contact}`, // Ensure the correct string interpolation
        //   body: messageBody,
        // });
        return res.status(200).json({
          message: `Patient ${name} added successfully with ID ${patientId}.`,
          patientDetails: patient,
        });
      }
    }
  } catch (error) {
    console.error("Error adding patient:", error);
    res
      .status(500)
      .json({ message: "Error adding patient", error: error.message });
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
    admissionRecord.doctor = { id: doctorId, name: doctor.doctorName };
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
        <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1737924501/Spandan_Hospital_nriqjl.png" alt="Hospital Logo" />
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
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1737924501/Spandan_Hospital_nriqjl.png" alt="header">
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
    <h1>Saideep Hospital</h1>
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
      vitals: admissionRecord.vitals || [],
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
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1737924501/Spandan_Hospital_nriqjl.png" alt="header">
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
                <h2>Vitals</h2>
                <ul>
                    ${response.vitals
                      .map(
                        (vital) => `
                        <li>Temperature: ${vital.temperature} °C</li>
                        <li>Pulse: ${vital.pulse} bpm</li>
                        <li>BP: ${vital.bloodPressure}</li>
                        <li>BSL: ${vital.bloodSugarLevel}</li>
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
                            <th>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.prescriptions
                          .map(
                            (prescription) => `
                        <tr>
                            <td>${prescription.medicine.name}</td>
                            <td>M: ${prescription.medicine.morning} / A: ${prescription.medicine.afternoon} / N: ${prescription.medicine.night}</td>
                            <td>${prescription.medicine.comment}</td>
                        </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="footer">
            <p>20s Developers</p>
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
    // const cloudinaryLink = await uploadToCloudinary(pdfBuffer);

    // const browser = await puppeteer.launch({
    //   // args: [
    //   //   "--disable-setuid-sandbox",
    //   //   "--no-sandbox",
    //   //   "--single-process",
    //   //   "--no-zygote",
    //   // ],
    //   // executablePath:
    //   //   process.env.PUPPETEER_EXECUTABLE_PATH ||
    //   //   "/usr/bin/google-chrome-stable",
    // });
    // console.log("check thei path", process.env.PUPPETEER_EXECUTABLE_PATH);
    // const page = await browser.newPage();
    // await page.setContent(doctorAdviceHtml);
    // const pdfBuffer = await page.pdf({ format: "A4" });
    // await browser.close();
    // Generate PDF from HTML
    // pdf
    //   .create(doctorAdviceHtml, { format: "A4" })
    //   .toBuffer(async (err, pdfBuffer) => {
    //     if (err) {
    //       return res.status(500).json({
    //         message: "Failed to generate PDF",
    //         error: err.message,
    //       });
    //     }

    // Authenticate with Google Drive API
    // const auth = new google.auth.GoogleAuth({
    //   credentials: ServiceAccount,
    //   // keyFile: "./apikey.json", // Path to your Google service account key file
    //   scopes: ["https://www.googleapis.com/auth/drive"],
    // });
    // const drive = google.drive({ version: "v3", auth });

    // // Convert PDF buffer into a readable stream
    // const bufferStream = new Readable();
    // bufferStream.push(pdfBuffer);
    // bufferStream.push(null);

    // // Folder ID in Google Drive
    // const folderId = "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";

    // Upload PDF to Google Drive
    try {
      // const driveFile = await drive.files.create({
      //   resource: {
      //     name: `DoctorAdvice_${patientId}.pdf`,
      //     parents: [folderId],
      //   },
      //   media: {
      //     mimeType: "application/pdf",
      //     body: bufferStream,
      //   },
      //   fields: "id, webViewLink",
      // Extract file's public link
      // const fileLink = driveFile.data.webViewLink;

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

    // try {
    //   const result = await new Promise((resolve, reject) => {
    //     const uploadStream = cloudinary.v2.uploader.upload_stream(
    //       { resource_type: "auto", folder: "doctor_advices" },
    //       (error, result) => {
    //         if (error) reject(error);
    //         else resolve(result);
    //       }
    //     );
    //     bufferStream.pipe(uploadStream);
    //   });
    //   console.log(result.secure_url);
    //   return res.status(200).json({
    //     message: "Doctor advice generated successfully.",
    //     fileLink: result.secure_url,
    //   });
    // } catch (error) {
    //   return res.status(500).json({
    //     message: "Failed to upload PDF to Cloudinary",
    //     error: error.message,
    //   });
    // }
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
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1737924501/Spandan_Hospital_nriqjl.png" alt="header">
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
export const generateOpdBill = async (req, res) => {
  try {
    // Extract patient history, lab charges, other charges, and dates from the request body
    const { patientId, labCharges, otherCharges, labDate, otherChargesDate } =
      req.body;
    console.log(patientId);
    const patient = await patientSchema.findOne({ patientId });
    console.log("here is patient", patient);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }
    const patientHistory = await PatientHistory.findOne({ patientId });

    // Ensure all required fields are provided
    // if (!labCharges || !otherCharges || !labDate || !otherChargesDate) {
    //   return res.status(400).json({
    //     message:
    //       "All fields (patientHistory, labCharges, otherCharges, labDate, otherChargesDate) are required.",
    //   });
    // }
    function cleanDate(rawDate) {
      // Using moment to parse the date and remove the timezone and GMT
      const cleanedDate = moment(rawDate).format("YYYY-MM-DD HH:mm:ss");
      return cleanedDate;
    }

    // Retrieve the last record from the patient's history
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const { amountToBePayed } = lastRecord;
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
    const cleanedAdmissionDate = cleanDate(admissionDate);
    const cleanedDischargeDate = cleanDate(dischargeDate);
    // Calculate the new total amount by including lab charges and other charges
    // const totalAmount = amountToBePayed + labCharges + otherCharges;
    const totalAmount =
      amountToBePayed + (labCharges?.amount || 0) + (otherCharges?.amount || 0);
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
      weight: weight,
      age: patient.age,
      admissionDate: cleanedAdmissionDate,
      dischargeDate: cleanedDischargeDate,
      reasonForAdmission: reasonForAdmission,
      conditionAtDischarge: conditionAtDischarge,
      doctor: doctor.name,
      labCharges: labCharges,
      otherCharges: otherCharges,
      labDate: labDate,
      date: data.date,
      time: data.time,
      amountToBePayed: amountToBePayed,
      otherChargesDate: otherChargesDate,
      totalAmount: totalAmount,
    };
    const billHTML = ` <!DOCTYPE html>
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
            width: 50%;
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
        <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1737924501/Spandan_Hospital_nriqjl.png" alt="Hospital Logo" />
        <h1>Hospital Bill</h1>
    </div>
    <div class="patient-details">
        <div><strong>Patient ID:</strong> <span id="patientId">${
          billDetails.patientId || "N/A"
        }</span></div>
        <div><strong>Patient Name:</strong> <span id="name">${
          billDetails.name || "N/A"
        }</span></div>
        <div><strong>Gender:</strong> <span id="gender">${
          billDetails.gender || "N/A"
        }</span></div>
        <div><strong>Contact:</strong> <span id="contact">${
          billDetails.contact || "N/A"
        }</span></div>
        <div><strong>Weight:</strong> <span id="weight">${
          billDetails.weight || "N/A"
        }</span></div>
        <div><strong>Age:</strong> <span id="age">${
          billDetails.age || "N/A"
        }</span></div>
        <div><strong>Admission Date:</strong> <span id="admissionDate">${
          billDetails.admissionDate || "N/A"
        }</span></div>
        <div><strong>Discharge Date:</strong> <span id="dischargeDate">${
          billDetails.dischargeDate || "N/A"
        }</span></div>
        <div><strong>Reason for Admission:</strong> <span id="reasonForAdmission">${
          billDetails.reasonForAdmission || "N/A"
        }</span></div>
        <div><strong>Condition at Discharge:</strong> <span id="conditionAtDischarge">${
          billDetails.conditionAtDischarge || "N/A"
        }</span></div>
        <div><strong>Doctor:</strong> <span id="doctor">${
          billDetails.doctor || "N/A"
        }</span></div>
      
        <div>
  <strong>Date & Time:</strong> 
  <span id="dateTime">
    ${billDetails.date ? billDetails.date : "N/A"} ${
      billDetails.time ? billDetails.time : ""
    }
  </span>
</div>

    </div>
    <table class="charges">
        <tr>
            <th>Description</th>
            <th>Charges</th>
            <th>Date</th>
            <th>Total</th>
        </tr>
        <tr>
            <td>Lab Charges</td>
            <td>${billDetails.labCharges.amount || 0}</td>
            <td>${billDetails.labCharges.date || "N/A"}</td>
            <td>${billDetails.labCharges.amount || 0}</td>
        </tr>
        <tr>
            <td>Other Charges</td>
            <td>${billDetails.otherCharges.amount || 0}</td>
            <td>${billDetails.otherCharges.date || "N/A"}</td>
            <td>${billDetails.otherCharges.amount || 0}</td>
        </tr>
        <tr>
            <td><strong>Doctor Charges</strong></td>
            <td colspan="2"></td>
            <td><strong>${billDetails.amountToBePayed || 0}</strong></td>
        </tr>
        <tr>
            <td><strong>Total Amount</strong></td>
            <td colspan="2"></td>
            <td><strong>${billDetails.totalAmount || 0}</strong></td>
        </tr>
    </table>
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
    // Send the generated OPD bill in the response
    return res.status(200).json({
      message: "OPD bill generated successfully",
      fileLink: fileLink,
    });
  } catch (error) {
    // Handle errors
    console.error("Error generating OPD bill:", error);
    return res.status(500).json({
      message: "An error occurred while generating the OPD bill.",
      error: error.message,
    });
  }
};

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
    <h1>Saideep Hospital</h1>
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
    <h1>Saideep Hospital</h1>
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
    if (isReadmission && !patientId) {
      return res
        .status(400)
        .json({ message: "Patient ID is required for readmission" });
    }
    if (isReadmission && patientId) {
      // **1️⃣ Existing Patient (Readmission) → Check past records**
      let patientRecord = await PatientAppointment.findOne({ patientId });

      if (!patientRecord) {
        return res.status(404).json({ message: "Patient record not found" });
      }

      // **Check if patient has at least one "completed" or valid "rescheduled" appointment**
      const hasValidPreviousAppointment = patientRecord.appointments.some(
        (appt) =>
          appt.doctorId === doctorId &&
          (appt.status === "completed" ||
            (appt.status === "rescheduled" && appt.rescheduledTo)) // Must have a valid rescheduled date
      );

      if (!hasValidPreviousAppointment) {
        return res.status(400).json({
          message:
            "Reappointment not allowed. No completed or rescheduled appointment found.",
        });
      }

      // **Check if the new appointment is conflicting with an existing one**
      // const isConflicting = patientRecord.appointments.some(
      //   (appt) =>
      //     appt.doctorId === doctorId && appt.date === date && appt.time === time
      // );

      // if (isConflicting) {
      //   return res.status(400).json({
      //     message: "Appointment slot already booked. Choose a different time.",
      //   });
      // }

      // **Add new appointment**
      patientRecord.appointments.push(newAppointment);
      await patientRecord.save();
      return res
        .status(201)
        .json({ message: "Reappointment booked", patientRecord });
    } else {
      // **2️⃣ New Patient or Existing Patient with Same Contact**
      let patientRecord = await PatientAppointment.findOne({
        patientContact,
      });

      if (patientRecord) {
        // **Patient exists → Just add the new appointment**
        patientRecord.appointments.push(newAppointment);
        await patientRecord.save();
        return res.status(201).json({
          message: "Appointment added for existing patient",
          patientRecord,
        });
      } else {
        // **New Patient → Create a new record**
        const newPatientId = generatePatientId(patientName);

        patientRecord = new PatientAppointment({
          patientId: newPatientId,
          patientName,
          patientContact,
          appointments: [newAppointment],
        });

        await patientRecord.save();
        return res
          .status(201)
          .json({ message: "New appointment booked", patientRecord });
      }
    }
  } catch (error) {
    console.error("Error creating appointment:", error);

    // **Handle Duplicate Key Error**
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A patient with this contact number already exists. Try rebooking as a readmission.",
      });
    }

    res.status(500).json({ message: "Internal Server Error" });
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

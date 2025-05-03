import { fileURLToPath } from "url"; // To handle __dirname in ESM
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import cloudinary from "../helpers/cloudinary.js";
import LabReport from "../models/labreportSchema.js";
import { Readable } from "stream";

// export const getPatientsAssignedToLab = async (req, res) => {
//   try {
//     // Fetch all lab reports and populate patient and doctor details
//     const labReports = await LabReport.find()
//       .populate({
//         path: "patientId",
//         select: "name age gender contact admissionRecords", // Only include the necessary fields
//         match: {
//           // Only include patients with non-empty admissionRecords array
//           admissionRecords: { $not: { $size: 0 } },
//         },
//       })
//       .populate({
//         path: "doctorId",
//         select: "doctorName email",
//       });

//     if (!labReports || labReports.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No patients assigned to the lab." });
//     }

//     // Exclude followUps from the populated patient data
//     labReports.forEach((report) => {
//       report.patientId.admissionRecords.forEach((record) => {
//         delete record.followUps; // Remove the followUps field from each admission record
//       });
//     });

//     res.status(200).json({
//       message: "Patients assigned to the lab retrieved successfully",
//       labReports,
//     });
//   } catch (error) {
//     console.error("Error retrieving patients assigned to the lab:", error);
//     res
//       .status(500)
//       .json({ message: "Error retrieving patients", error: error.message });
//   }
// };
export const getPatientsAssignedToLab = async (req, res) => {
  try {
    // Fetch all lab reports and populate necessary patient and doctor fields
    const labReports = await LabReport.find()
      .populate({
        path: "patientId",
        select: "name age gender contact discharged", // Added 'discharged' field
      })
      .populate({
        path: "doctorId",
        select: "doctorName email", // Only include necessary doctor fields
      })
      .sort({ _id: -1 }); // Sort by _id in descending order (newest documents first)

    if (!labReports || labReports.length === 0) {
      return res
        .status(404)
        .json({ message: "No patients assigned to the lab." });
    }

    res.status(200).json({
      message: "Patients assigned to the lab retrieved successfully",
      labReports,
    });
  } catch (error) {
    console.error("Error retrieving patients assigned to the lab:", error);
    res
      .status(500)
      .json({ message: "Error retrieving patients", error: error.message });
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

export const generateReportPdfForPatient = async (req, res) => {
  // Setup __dirname for ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  try {
    const { admissionId, patientId, labTestName, labType, labReportId } =
      req.body;
    const file = req.file; // Get the uploaded PDF file

    if (!admissionId || !patientId || !labTestName || !labType || !file) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("Uploaded file details:", file);

    // Authenticate with Google Drive
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

    const reportUrl = uploadResponse.data.webViewLink; // Link to the uploaded file

    // Save report to MongoDB
    const labReport = await LabReport.findById(labReportId);
    if (!labReport) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    labReport.reports.push({
      labTestName,
      reportUrl,
      labType,
      uploadedAt: new Date(),
    });

    await labReport.save();

    res.status(200).json({
      message: "Lab report uploaded successfully",
      labReport,
    });
  } catch (error) {
    console.error("Error uploading lab report:", error);
    res.status(500).json({
      message: "Error uploading lab report",
      error: error.message,
    });
  }
};
export const deleteSpecificReport = async (req, res) => {
  const { labReportId, reportId } = req.params;

  try {
    const updatedLabReport = await LabReport.findByIdAndUpdate(
      labReportId,
      {
        $pull: {
          reports: { _id: reportId },
        },
      },
      { new: true }
    );

    if (!updatedLabReport) {
      return res.status(404).json({ message: "LabReport not found" });
    }

    res.status(200).json({
      message: "Report deleted successfully",
      updatedLabReport,
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

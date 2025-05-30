import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Doctor from "../models/doctorSchema.js";
import hospitalDoctors from "../models/hospitalDoctorSchema.js";
import NonPatient from "../models/nonPatientSchema.js";
import Nurse from "../models/nurseSchema.js";
import twilio from "twilio";
import { fileURLToPath } from "url"; // To handle __dirname in ESM
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import cloudinary from "../helpers/cloudinary.js";
import LabReport from "../models/labreportSchema.js";
import { Readable } from "stream";
import externalDoctors from "../models/externalDoctor.js";
const SECRET = "DOCTOR";
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
export const signupDoctor = async (req, res) => {
  try {
    const {
      email,
      password,
      usertype,
      doctorName,
      speciality,
      experience,
      department,
      phoneNumber,
    } = req.body;
    console.log("Signup request body:", req.body); // Log the request body
    const file = req.file; // File is optional now
    console.log("Uploaded file details:", file);

    // Choose the correct model based on type
    const DoctorModel = hospitalDoctors;

    // Check if the user already exists in the selected collection
    const existingUser = await DoctorModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    let imageUrl = null; // Default to null

    if (file) {
      // If file exists, upload to Google Drive
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
        parents: ["1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"], // Google Drive Folder ID
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

      imageUrl = uploadResponse.data.webViewLink; // Set image URL
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to the correct collection
    const result = await DoctorModel.create({
      email,
      password: hashedPassword,
      usertype,
      doctorName,
      speciality,
      experience,
      department,
      phoneNumber,
      imageUrl, // Will be null if no image is uploaded
    });

    // Generate JWT token
    const token = jwt.sign(
      { email: result.email, id: result._id, usertype: result.usertype },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ user: result, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed.", error: error.message });
  }
};

export const signinDoctor = async (req, res) => {
  const { email, password } = req.body;
  console.log("Signin request body:", req.body); // Log the request body
  try {
    // Check if user exists
    const existingUser = await hospitalDoctors.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if password is correct
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        email: existingUser.email,
        id: existingUser._id,
        usertype: existingUser.usertype,
      },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({ user: existingUser, token });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Signin failed", error: error.message });
  }
};
export const externalSigninDoctor = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await externalDoctors.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if password is correct
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        email: existingUser.email,
        id: existingUser._id,
        usertype: existingUser.usertype,
      },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({ user: existingUser, token });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Signin failed", error: error.message });
  }
};
export const deleteDoctor = async (req, res) => {
  console.log("Delete doctor request:", req.params);
  try {
    const { doctorId } = req.params;

    const doctor = await hospitalDoctors.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    await hospitalDoctors.findByIdAndDelete(doctorId);

    res.status(200).json({ message: "Doctor deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Deletion failed.", error: error.message });
  }
};
export const signupNurse = async (req, res) => {
  const { email, password, usertype, nurseName } = req.body;

  try {
    // Check if a user with the provided email already exists
    const existingUser = await Nurse.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await Nurse.create({
      email,
      password: hashedPassword,
      usertype: usertype === "nurseadmin" ? "nurseadmin" : "nurse", // Ensure usertype is valid
      nurseName,
    });

    // Generate JWT token
    const token = jwt.sign(
      { email: result.email, id: result._id, usertype: result.usertype },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ user: result, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed.", error: error.message });
  }
};
export const signinNurse = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const existingUser = await Nurse.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the password is correct
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        email: existingUser.email,
        id: existingUser._id,
        usertype: existingUser.usertype,
      },
      SECRET,
      { expiresIn: "30d" }
    );

    // Send back the user details and token
    res.status(200).json({ user: existingUser, token });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Signin failed", error: error.message });
  }
};

const TWILIO_ACCOUNT_SID = "AC35d86e0d9c60d2eb91c76053c7c863e1";
const TWILIO_AUTH_TOKEN = "ee3d620954c9e24f4388300475d433e7";

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const signupPatient = async (req, res) => {
  const { name, age, gender, address, email, password, phoneNumber } = req.body;

  try {
    const existingUser = await NonPatient.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newPatient = new NonPatient({
      name,
      age,
      gender,
      address,
      email,
      phoneNumber,
      password: hashedPassword,
    });
    await newPatient.save();

    // Send OTP using Twilio SMS API
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    const messageBody = `Your verification code is: ${otp}`;

    const msgOptions = {
      from: +14152149378,
      to: phoneNumber,
      body: messageBody,
    };
    await client.messages.create(msgOptions);

    // Save OTP with expiration
    newPatient.otp = { code: otp, expiresAt };
    await newPatient.save();

    res.status(201).json({
      message: "Patient registration successful. OTP sent for verification.",
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res
      .status(500)
      .json({ message: "Error during registration", error: error.message });
  }
};

export const signinPatient = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const patient = await NonPatient.findOne({ phoneNumber });
    if (!patient) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    // Send OTP using Twilio SMS API
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    const messageBody = `Your verification code is: ${otp}`;

    const msgOptions = {
      from: "+14152149378",
      to: phoneNumber,
      body: messageBody,
    };
    await client.messages.create(msgOptions);

    // Save OTP with expiration
    patient.otp = { code: otp, expiresAt };
    await patient.save();

    res.status(200).json({ message: "OTP sent to phone number" });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res
      .status(500)
      .json({ message: "Error during sign-in", error: error.message });
  }
};
export const verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  console.log("Request Body:", req.body); // Log the entire request body

  try {
    // Retrieve the patient using the phone number
    const patient = await NonPatient.findOne({ phoneNumber });

    // Check if the patient was found
    if (!patient) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    // Log the stored OTP if patient exists
    console.log("Stored OTP:", patient.otp ? patient.otp.code : "No OTP found");

    // Validate OTP
    if (!patient.otp || patient.otp.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP has expired
    if (new Date() > patient.otp.expiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: patient._id, usertype: "patient" }, SECRET, {
      expiresIn: "30d",
    });

    // Clear the OTP after successful verification
    patient.otp = null;
    await patient.save();

    res.status(200).json({ message: "Signin successful", token });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res
      .status(500)
      .json({ message: "Error during OTP verification", error: error.message });
  }
};

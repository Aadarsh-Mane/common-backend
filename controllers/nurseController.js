import Attendance from "../models/attendanceSchema.js";
import Nurse from "../models/nurseSchema.js";
import patientSchema from "../models/patientSchema.js";
import moment from "moment-timezone";
import { generatePdf } from "../services/pdfGenerator.js";
import { uploadToDrive } from "../services/uploader.js";
import { HOSPITAL_CONFIG } from "../utils/constants.js";

export const addFollowUp = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      notes,
      observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
      fourhrpulse,
      fourhrbloodPressure,
      fourhroxygenSaturation,
      fourhrTemperature,
      fourhrbloodSugarLevel,
      fourhrotherVitals,
      fourhrurine,
      fourhrivFluid,
    } = req.body;
    const nurseId = req.userId; // Nurse ID from authenticated user
    console.log(req.body);
    // Validate user type to ensure only nurses can add follow-ups
    if (req.usertype !== "nurse") {
      return res
        .status(403)
        .json({ message: "Access denied. Only nurses can add follow-ups." });
    }

    // Validate nurse ID
    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    const dateInIST = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    // Add follow-up to the admission record
    admissionRecord.fourHrFollowUpSchema.push({
      nurseId: nurseId,
      notes: notes,
      observations: observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
      fourhrpulse,
      fourhrbloodPressure,
      fourhroxygenSaturation,
      fourhrTemperature,
      fourhrbloodSugarLevel,
      fourhrotherVitals,
      fourhrurine,
      fourhrivFluid,
      date: dateInIST, // Sets the date to now
    });

    // Save the updated patient record
    await patient.save();

    return res.status(201).json({
      message: "Follow-up added successfully",
      admissionRecord: admissionRecord,
    });
  } catch (error) {
    console.error("Error adding follow-up:", error);
    return res
      .status(500)
      .json({ message: "Error adding follow-up", error: error.message });
  }
};
export const getLastFollowUpTime = async (req, res) => {
  try {
    const { patientId, admissionId } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Check if there is a previous follow-up
    if (admissionRecord.followUps.length === 0) {
      return res.status(200).json({ message: "No previous follow-ups found" });
    }

    // Get the last follow-up
    const lastFollowUp =
      admissionRecord.followUps[admissionRecord.followUps.length - 1];
    const rawLastFollowUpDate = lastFollowUp.date; // The raw date string
    console.log("Last Follow-Up Date (Raw):", rawLastFollowUpDate);

    // Parse the raw date string into a Date object
    const lastFollowUpDate = new Date(rawLastFollowUpDate);

    // Log the parsed date
    console.log("Parsed Last Follow-Up Date:", lastFollowUpDate);

    // Get the current time in Indian timezone
    const currentTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date(currentTime);

    // Calculate the time difference in milliseconds
    const diffInMillis = Math.abs(currentDate - lastFollowUpDate);
    const diffInMinutes = Math.floor(diffInMillis / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const minutesRemaining = diffInMinutes % 60;

    const timeSinceLastFollowUp = `${diffInHours} hours and ${minutesRemaining} minutes ago`;

    res.status(200).json({
      message: "Last follow-up found",
      lastFollowUpDate: lastFollowUpDate.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "short",
        timeStyle: "long",
      }), // Include formatted date
      timeSinceLastFollowUp,
    });
  } catch (error) {
    console.error("Error retrieving last follow-up:", error);
    res.status(500).json({
      message: "Error retrieving last follow-up",
      error: error.message,
    });
  }
};
export const getFollowups = async (req, res) => {
  console.log("getFollowups", req.params);
  try {
    // Extract patientId and admissionId from the request parameters
    const { admissionId } = req.params;

    // Find the patient by admissionId
    const patient = await patientSchema
      .findOne({
        "admissionRecords._id": admissionId,
      })
      .select("admissionRecords");

    // Check if patient exists
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record using the admissionId
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    // If the admission record does not have follow-ups
    if (!admissionRecord || !admissionRecord.followUps) {
      return res.status(404).json({ message: "No follow-ups found" });
    }
    console.log("admissionRecord", admissionRecord.followUps);
    // Return the follow-ups for the specific admission
    res.status(200).json(admissionRecord.fourHrFollowUpSchema);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getNurseProfile = async (req, res) => {
  const nurseId = req.userId; // Get nurseId from the request

  try {
    // Find the doctor by ID
    const nurseProfile = await Nurse.findById(nurseId).select("-password"); // Exclude password for security

    // Check if doctor profile exists
    if (!nurseProfile) {
      return res.status(404).json({ message: "nurse not found" });
    }

    // Return doctor profile
    return res.status(200).json({ nurseProfile });
  } catch (error) {
    console.error("Error fetching nurse profile:", error);
    return res
      .status(500)
      .json({ message: "Error fetching nurse profile", error: error.message });
  }
};
export const getAdmissionRecordsById = async (req, res) => {
  try {
    const { admissionId } = req.params; // Get admissionId from URL parameters

    // Find the patient by checking all admission records
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    // If the patient is not found
    if (!patient) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);

    // If the admission record is not found
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Respond with the admission record
    res.status(200).json({
      message: "Admission record retrieved successfully.",
      admissionRecord,
    });
  } catch (error) {
    console.error("Error retrieving admission record:", error);
    res.status(500).json({
      message: "Error retrieving admission record.",
      error: error.message,
    });
  }
};

// Predefined building coordinates (latitude, longitude)
const BUILDING_COORDINATES = { latitude: 19.2156919, longitude: 73.0803935 }; // Example (Change as needed)
const ALLOWED_RADIUS = 50; // in meters

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Check-in Controller
export const checkIn = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const nurseId = req.userId; // Assuming nurseId is set in auth middleware

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location data is required" });
    }

    // Check if within allowed range
    const distance = calculateDistance(
      latitude,
      longitude,
      BUILDING_COORDINATES.latitude,
      BUILDING_COORDINATES.longitude
    );

    if (distance > ALLOWED_RADIUS) {
      return res
        .status(403)
        .json({ message: "You are outside the allowed area" });
    }

    const nurse = await Nurse.findById(nurseId);
    if (!nurse) return res.status(404).json({ message: "Nurse not found" });

    // Check if attendance already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      nurseId,
      date: today,
    });

    if (attendance) {
      return res.status(400).json({ message: "Check-in already recorded" });
    }

    // Create new attendance record
    attendance = new Attendance({
      nurseId,
      nurseName: nurse.nurseName,
      date: today,
      checkIn: {
        time: new Date(),
        location: { latitude, longitude },
      },
      status: "Partial",
    });

    await attendance.save();
    res.status(200).json({ message: "Check-in successful", attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Check-out Controller
export const checkOut = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const nurseId = req.userId; // Assuming nurseId is set in auth middleware

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location data is required" });
    }

    // Check if within allowed range
    const distance = calculateDistance(
      latitude,
      longitude,
      BUILDING_COORDINATES.latitude,
      BUILDING_COORDINATES.longitude
    );

    if (distance > ALLOWED_RADIUS) {
      return res
        .status(403)
        .json({ message: "You are outside the allowed area" });
    }

    // Find today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      nurseId,
      date: today,
    });

    if (!attendance) {
      return res
        .status(400)
        .json({ message: "Check-in not found. Please check-in first." });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({ message: "Check-out already recorded" });
    }

    // Update check-out details
    attendance.checkOut = {
      time: new Date(),
      location: { latitude, longitude },
    };
    attendance.status = "Present";

    await attendance.save();
    res.status(200).json({ message: "Check-out successful", attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function to convert date to IST format in 12-hour AM/PM format
const formatISTDate = (date) => {
  if (!date) return null;
  return moment(date).tz("Asia/Kolkata").format("DD-MM-YYYY hh:mm A");
};

// Get attendance records for a specific nurse
export const seeMyAttendance = async (req, res) => {
  try {
    const nurseId = req.userId; // Extract nurseId from request

    if (!nurseId) {
      return res.status(400).json({ message: "Nurse ID is required" });
    }

    // Fetch all attendance records for this nurse
    const attendanceRecords = await Attendance.find({ nurseId }).sort({
      date: -1,
    });

    if (!attendanceRecords.length) {
      return res.status(404).json({ message: "No attendance records found" });
    }

    // Format the date and times in IST
    const formattedRecords = attendanceRecords.map((record) => ({
      _id: record._id,
      nurseId: record.nurseId,
      nurseName: record.nurseName,
      date: formatISTDate(record.date),
      checkIn: {
        time: formatISTDate(record.checkIn?.time),
        location: record.checkIn?.location,
      },
      checkOut: {
        time: formatISTDate(record.checkOut?.time),
        location: record.checkOut?.location,
      },
      status: record.status,
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
export const add2hrFollowUp = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      notes,
      observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
    } = req.body;
    const nurseId = req.userId; // Nurse ID from authenticated user
    console.log(req.body);
    // Validate user type to ensure only nurses can add follow-ups
    if (req.usertype !== "nurse") {
      return res
        .status(403)
        .json({ message: "Access denied. Only nurses can add follow-ups." });
    }

    // Validate nurse ID
    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    const dateInIST = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    // Add follow-up to the admission record
    admissionRecord.followUps.push({
      nurseId: nurseId,
      notes: notes,
      observations: observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,

      date: dateInIST, // Sets the date to now
    });

    // Save the updated patient record
    await patient.save();

    return res.status(201).json({
      message: "Follow-up added successfully",
      admissionRecord: admissionRecord,
    });
  } catch (error) {
    console.error("Error adding follow-up:", error);
    return res
      .status(500)
      .json({ message: "Error adding follow-up", error: error.message });
  }
};

export const get2hrFollowups = async (req, res) => {
  console.log("getFollowups", req.params);
  try {
    // Extract patientId and admissionId from the request parameters
    const { admissionId } = req.params;

    // Find the patient by admissionId
    const patient = await patientSchema
      .findOne({
        "admissionRecords._id": admissionId,
      })
      .select("admissionRecords");

    // Check if patient exists
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record using the admissionId
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    // If the admission record does not have follow-ups
    if (!admissionRecord || !admissionRecord.followUps) {
      return res.status(404).json({ message: "No follow-ups found" });
    }
    console.log("admissionRecord", admissionRecord.followUps);
    // Return the follow-ups for the specific admission
    res.status(200).json(admissionRecord.followUps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
export const addTwoHrFollowUp = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      date,
      notes,
      observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
    } = req.body;

    const nurseId = req.userId;

    // Find patient by patientId
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Find the specific admission record by admission ID
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Create new follow-up entry
    const newFollowUp = {
      nurseId,
      date: date || new Date().toISOString(),
      notes,
      observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
    };

    // Add to followUps array
    admissionRecord.followUps.push(newFollowUp);

    // Save the patient document
    await patient.save();

    res.status(201).json({
      success: true,
      message: "2-hour follow-up added successfully",
      data: {
        followUp: newFollowUp,
        patientId,
        admissionId,
        opdNumber: admissionRecord.opdNumber,
      },
    });
  } catch (error) {
    console.error("Error adding 2hr follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Add 4-hour follow-up
export const addFourHrFollowUp = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      date,
      notes,
      observations,
      fourhrpulse,
      fourhrbloodPressure,
      fourhroxygenSaturation,
      fourhrTemperature,
      fourhrbloodSugarLevel,
      fourhrotherVitals,
      fourhrivFluid,
      fourhrurine,
    } = req.body;

    const nurseId = req.userId;

    // Find patient by patientId
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Find the specific admission record by admission ID
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Create new 4-hour follow-up entry
    const newFourHrFollowUp = {
      nurseId,
      date: date || new Date().toISOString(),
      notes,
      observations,
      fourhrpulse,
      fourhrbloodPressure,
      fourhroxygenSaturation,
      fourhrTemperature,
      fourhrbloodSugarLevel,
      fourhrotherVitals,
      fourhrivFluid,
      fourhrurine,
    };

    // Add to fourHrFollowUpSchema array
    admissionRecord.fourHrFollowUpSchema.push(newFourHrFollowUp);

    // Save the patient document
    await patient.save();

    res.status(201).json({
      success: true,
      message: "4-hour follow-up added successfully",
      data: {
        followUp: newFourHrFollowUp,
        patientId,
        admissionId,
        opdNumber: admissionRecord.opdNumber,
      },
    });
  } catch (error) {
    console.error("Error adding 4hr follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get 2-hour follow-ups
export const getTwoHrFollowUps = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find patient by patientId
    const patient = await patientSchema.findOne({ patientId }).populate({
      path: "admissionRecords.followUps.nurseId",
      select: "name email",
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Find the specific admission record by admission ID
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Get all 2-hour follow-ups for this admission
    const followUps = admissionRecord.followUps || [];

    res.status(200).json({
      success: true,
      message: "2-hour follow-ups retrieved successfully",
      data: {
        patientInfo: {
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
        },
        admissionId,
        opdNumber: admissionRecord.opdNumber,
        followUps,
        totalCount: followUps.length,
      },
    });
  } catch (error) {
    console.error("Error fetching 2hr follow-ups:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get 4-hour follow-ups
export const getFourHrFollowUps = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find patient by patientId
    const patient = await patientSchema.findOne({ patientId }).populate({
      path: "admissionRecords.fourHrFollowUpSchema.nurseId",
      select: "name email",
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Find the specific admission record by admission ID
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Get all 4-hour follow-ups for this admission
    const fourHrFollowUps = admissionRecord.fourHrFollowUpSchema || [];

    res.status(200).json({
      success: true,
      message: "4-hour follow-ups retrieved successfully",
      data: {
        patientInfo: {
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
        },
        admissionId,
        opdNumber: admissionRecord.opdNumber,
        fourHrFollowUps,
        totalCount: fourHrFollowUps.length,
      },
    });
  } catch (error) {
    console.error("Error fetching 4hr follow-ups:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export const generate2HrFollowUpPDF = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const { bannerImageUrl } = req.body; // Banner image URL from request body

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

    // Check if there are follow-ups
    if (!admission.followUps || admission.followUps.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No 2-hour follow-up records found for this admission",
      });
    }

    // Generate HTML content for 2-hour follow-ups
    const htmlContent = generate2HrFollowUpHTML(
      patient,
      admission,
      bannerImageUrl
    );

    // Generate PDF
    const pdfBuffer = await generatePdf(htmlContent);

    // Create filename
    const fileName = `2HR_FollowUp_${patient.name}_${
      admission.opdNumber || admission.ipdNumber
    }_${new Date().toISOString().split("T")[0]}.pdf`;

    // Upload to Google Drive (optional - configure folderId as needed)
    const folderId = "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
    const driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);

    res.status(200).json({
      success: true,
      message: "2-hour follow-up PDF generated successfully",
      data: {
        fileName,
        driveLink,
        patientName: patient.name,
        followUpCount: admission.followUps.length,
      },
    });
  } catch (error) {
    console.error("Error generating 2-hour follow-up PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate 2-hour follow-up PDF",
      error: error.message,
    });
  }
};

// Controller for generating 4-hour follow-up PDF
export const generate4HrFollowUpPDF = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const { bannerImageUrl } = req.body;

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

    // Check if there are 4-hour follow-ups
    if (
      !admission.fourHrFollowUpSchema ||
      admission.fourHrFollowUpSchema.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "No 4-hour follow-up records found for this admission",
      });
    }

    // Generate HTML content for 4-hour follow-ups
    const htmlContent = generate4HrFollowUpHTML(
      patient,
      admission,
      bannerImageUrl
    );

    // Generate PDF
    const pdfBuffer = await generatePdf(htmlContent);

    // Create filename
    const fileName = `4HR_FollowUp_${patient.name}_${
      admission.opdNumber || admission.ipdNumber
    }_${new Date().toISOString().split("T")[0]}.pdf`;

    // Upload to Google Drive
    const folderId = "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
    const driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);

    res.status(200).json({
      success: true,
      message: "4-hour follow-up PDF generated successfully",
      data: {
        fileName,
        driveLink,
        patientName: patient.name,
        followUpCount: admission.fourHrFollowUpSchema.length,
      },
    });
  } catch (error) {
    console.error("Error generating 4-hour follow-up PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate 4-hour follow-up PDF",
      error: error.message,
    });
  }
};

// Controller for generating combined follow-up PDF (both 2-hour and 4-hour)
export const generateCombinedFollowUpPDF = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const { bannerImageUrl } = req.body;

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

    // Check if there are any follow-ups
    const has2HrFollowUps =
      admission.followUps && admission.followUps.length > 0;
    const has4HrFollowUps =
      admission.fourHrFollowUpSchema &&
      admission.fourHrFollowUpSchema.length > 0;

    if (!has2HrFollowUps && !has4HrFollowUps) {
      return res.status(404).json({
        success: false,
        message: "No follow-up records found for this admission",
      });
    }

    // Generate HTML content for combined follow-ups
    const htmlContent = generateCombinedFollowUpHTML(
      patient,
      admission,
      bannerImageUrl
    );

    // Generate PDF
    const pdfBuffer = await generatePdf(htmlContent);

    // Create filename
    const fileName = `Combined_FollowUp_${patient.name}_${
      admission.opdNumber || admission.ipdNumber
    }_${new Date().toISOString().split("T")[0]}.pdf`;

    // Upload to Google Drive
    const folderId = "1MKYZ4fIUzERPyYzL_8I101agWemxVXts";
    const driveLink = await uploadToDrive(pdfBuffer, fileName, folderId);

    res.status(200).json({
      success: true,
      message: "Combined follow-up PDF generated successfully",
      data: {
        fileName,
        driveLink,
        patientName: patient.name,
        twoHrFollowUpCount: admission.followUps?.length || 0,
        fourHrFollowUpCount: admission.fourHrFollowUpSchema?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error generating combined follow-up PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate combined follow-up PDF",
      error: error.message,
    });
  }
};

// HTML template generator for 2-hour follow-ups
// Enhanced HTML template generator for 2-hour follow-ups
// Simplified HTML template generator for 2-hour follow-ups
// Fixed HTML template generator for 2-hour follow-ups
const formatDateToIST = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString || "Not recorded";
  }
};
function generate2HrFollowUpHTML(patient, admission, bannerImageUrl) {
  const patientInfo = generatePatientInfoTable(patient, admission);

  let content = "";

  // Add header and patient info only once
  content += `
    <div class="banner">
      <img src="${HOSPITAL_CONFIG.bannerUrl}" alt="Hospital Banner" />
    </div>
    <h1 class="main-title">2-Hour Follow-Up Report</h1>
    ${patientInfo}
  `;

  // Add each follow-up record
  admission.followUps.forEach((followUp, index) => {
    // Add page break only if not the first record
    const pageBreak = index > 0 ? "page-break-before: always;" : "";

    content += `
      <div class="follow-up-record" style="${pageBreak}">
      <div class="section-header">
        <h2>Follow-Up Record ${index + 1} - 2HR</h2>
        <span class="record-date">${
          followUp.date ? formatDateToIST(followUp.date) : "Not recorded"
        } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
      </div>

      <table class="data-table">
        <thead>
        <tr>
          <th colspan="4" class="section-title">Vital Signs</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><strong>Temperature:</strong></td>
          <td>${followUp.temperature || "N/A"}</td>
          <td><strong>Pulse:</strong></td>
          <td>${followUp.pulse || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Respiration Rate:</strong></td>
          <td>${followUp.respirationRate || "N/A"}</td>
          <td><strong>Blood Pressure:</strong></td>
          <td>${followUp.bloodPressure || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Oxygen Saturation:</strong></td>
          <td>${followUp.oxygenSaturation || "N/A"}</td>
          <td><strong>Blood Sugar Level:</strong></td>
          <td>${followUp.bloodSugarLevel || "N/A"}</td>
        </tr>
        ${
          followUp.otherVitals
            ? `
        <tr>
          <td><strong>Other Vitals:</strong></td>
          <td colspan="3">${followUp.otherVitals}</td>
        </tr>
        `
            : ""
        }
        </tbody>
      </table>

      <table class="data-table">
        <thead>
        <tr>
          <th colspan="4" class="section-title">Intake & Output Data</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><strong>IV Fluid:</strong></td>
          <td>${followUp.ivFluid || "N/A"}</td>
          <td><strong>Urine:</strong></td>
          <td>${followUp.urine || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Nasogastric:</strong></td>
          <td>${followUp.nasogastric || "N/A"}</td>
          <td><strong>Stool:</strong></td>
          <td>${followUp.stool || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>RT Feed/Oral:</strong></td>
          <td>${followUp.rtFeedOral || "N/A"}</td>
          <td><strong>RT Aspirate:</strong></td>
          <td>${followUp.rtAspirate || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Total Intake:</strong></td>
          <td class="highlight">${followUp.totalIntake || "N/A"}</td>
          <td><strong>Other Output:</strong></td>
          <td>${followUp.otherOutput || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>CVP:</strong></td>
          <td colspan="3">${followUp.cvp || "N/A"}</td>
        </tr>
        </tbody>
      </table>

      <table class="data-table">
        <thead>
        <tr>
          <th colspan="4" class="section-title">Ventilator Data</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td><strong>Mode:</strong></td>
          <td>${followUp.ventyMode || "N/A"}</td>
          <td><strong>Set Rate:</strong></td>
          <td>${followUp.setRate || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>FiO2:</strong></td>
          <td>${followUp.fiO2 || "N/A"}</td>
          <td><strong>PIP:</strong></td>
          <td>${followUp.pip || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>PEEP/CPAP:</strong></td>
          <td>${followUp.peepCpap || "N/A"}</td>
          <td><strong>I:E Ratio:</strong></td>
          <td>${followUp.ieRatio || "N/A"}</td>
        </tr>
        ${
          followUp.otherVentilator
            ? `
        <tr>
          <td><strong>Other:</strong></td>
          <td colspan="3">${followUp.otherVentilator}</td>
        </tr>
        `
            : ""
        }
        </tbody>
      </table>

      ${
        followUp.notes || followUp.observations
          ? `
      <table class="data-table">
        <thead>
        <tr>
          <th colspan="2" class="section-title">Clinical Notes & Observations</th>
        </tr>
        </thead>
        <tbody>
        ${
          followUp.notes
            ? `
        <tr>
          <td width="20%"><strong>Notes:</strong></td>
          <td>${followUp.notes}</td>
        </tr>
        `
            : ""
        }
        ${
          followUp.observations
            ? `
        <tr>
          <td width="20%"><strong>Observations:</strong></td>
          <td>${followUp.observations}</td>
        </tr>
        `
            : ""
        }
        </tbody>
      </table>
      `
          : ""
      }
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>2-Hour Follow-Up Report</title>
      <style>
        ${getCompactStyles()}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

// Fixed HTML template generator for 4-hour follow-ups
function generate4HrFollowUpHTML(patient, admission, bannerImageUrl) {
  const patientInfo = generatePatientInfoTable(patient, admission);

  let content = "";

  // Add header and patient info only once
  content += `
    <div class="banner">
      <img src="${HOSPITAL_CONFIG.bannerUrl}" alt="Hospital Banner" />
    </div>
    <h1 class="main-title">4-Hour Follow-Up Report</h1>
    ${patientInfo}
  `;

  // Add each follow-up record
  admission.fourHrFollowUpSchema.forEach((followUp, index) => {
    const pageBreak = index > 0 ? "page-break-before: always;" : "";

    content += `
      <div class="follow-up-record" style="${pageBreak}">
        <div class="section-header">
          <h2>4-Hour Follow-Up Record ${index + 1}</h2>
          <span class="record-date">${
            formatDateToIST(followUp.date) || "Not recorded"
          } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th colspan="4" class="section-title">4-Hour Vital Signs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Pulse:</strong></td>
              <td>${followUp.fourhrpulse || "N/A"}</td>
              <td><strong>Blood Pressure:</strong></td>
              <td>${followUp.fourhrbloodPressure || "N/A"}</td>
            </tr>
            <tr>
              <td><strong>Temperature:</strong></td>
              <td>${followUp.fourhrTemperature || "N/A"}</td>
              <td><strong>Oxygen Saturation:</strong></td>
              <td>${followUp.fourhroxygenSaturation || "N/A"}</td>
            </tr>
            <tr>
              <td><strong>Blood Sugar Level:</strong></td>
              <td>${followUp.fourhrbloodSugarLevel || "N/A"}</td>
              <td><strong>Other Vitals:</strong></td>
              <td>${followUp.fourhrotherVitals || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th colspan="4" class="section-title">Fluid Management</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>IV Fluid (Input):</strong></td>
              <td>${followUp.fourhrivFluid || "N/A"}</td>
              <td><strong>Urine (Output):</strong></td>
              <td>${followUp.fourhrurine || "N/A"}</td>
            </tr>
          </tbody>
        </table>

        ${
          followUp.notes || followUp.observations
            ? `
        <table class="data-table">
          <thead>
            <tr>
              <th colspan="2" class="section-title">Clinical Notes & Observations</th>
            </tr>
          </thead>
          <tbody>
            ${
              followUp.notes
                ? `
            <tr>
              <td width="20%"><strong>Notes:</strong></td>
              <td>${followUp.notes}</td>
            </tr>
            `
                : ""
            }
            ${
              followUp.observations
                ? `
            <tr>
              <td width="20%"><strong>Observations:</strong></td>
              <td>${followUp.observations}</td>
            </tr>
            `
                : ""
            }
          </tbody>
        </table>
        `
            : ""
        }
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>4-Hour Follow-Up Report</title>
      <style>
        ${getCompactStyles()}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

// Fixed combined follow-up generator
function generateCombinedFollowUpHTML(patient, admission, bannerImageUrl) {
  const patientInfo = generatePatientInfoTable(patient, admission);

  let content = `
    <div class="banner">
      <img src="${HOSPITAL_CONFIG.bannerUrl}" alt="Hospital Banner" />
    </div>
    <h1 class="main-title">Complete Follow-Up Report</h1>
    ${patientInfo}
  `;

  let recordCount = 0;

  // Add 2-hour follow-ups
  if (admission.followUps && admission.followUps.length > 0) {
    admission.followUps.forEach((followUp, index) => {
      const pageBreak = recordCount > 0 ? "page-break-before: always;" : "";
      recordCount++;

      content += `
        <div class="follow-up-record" style="${pageBreak}">
          <div class="section-header">
            <h2>2-Hour Follow-Up Record ${index + 1}</h2>
            <span class="record-date">${
              formatDateToIST(followUp.date) || "Not recorded"
            } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">Vital Signs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Temperature:</strong></td>
                <td>${followUp.temperature || "N/A"}</td>
                <td><strong>Pulse:</strong></td>
                <td>${followUp.pulse || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Respiration Rate:</strong></td>
                <td>${followUp.respirationRate || "N/A"}</td>
                <td><strong>Blood Pressure:</strong></td>
                <td>${followUp.bloodPressure || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Oxygen Saturation:</strong></td>
                <td>${followUp.oxygenSaturation || "N/A"}</td>
                <td><strong>Blood Sugar Level:</strong></td>
                <td>${followUp.bloodSugarLevel || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">Intake & Output</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>IV Fluid:</strong></td>
                <td>${followUp.ivFluid || "N/A"}</td>
                <td><strong>Urine:</strong></td>
                <td>${followUp.urine || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Nasogastric:</strong></td>
                <td>${followUp.nasogastric || "N/A"}</td>
                <td><strong>Stool:</strong></td>
                <td>${followUp.stool || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Total Intake:</strong></td>
                <td class="highlight">${followUp.totalIntake || "N/A"}</td>
                <td><strong>RT Aspirate:</strong></td>
                <td>${followUp.rtAspirate || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          ${
            followUp.notes || followUp.observations
              ? `
          <table class="data-table">
            <thead>
              <tr>
                <th colspan="2" class="section-title">Notes & Observations</th>
              </tr>
            </thead>
            <tbody>
              ${
                followUp.notes
                  ? `<tr><td width="20%"><strong>Notes:</strong></td><td>${followUp.notes}</td></tr>`
                  : ""
              }
              ${
                followUp.observations
                  ? `<tr><td width="20%"><strong>Observations:</strong></td><td>${followUp.observations}</td></tr>`
                  : ""
              }
            </tbody>
          </table>
          `
              : ""
          }
        </div>
      `;
    });
  }

  // Add 4-hour follow-ups
  if (
    admission.fourHrFollowUpSchema &&
    admission.fourHrFollowUpSchema.length > 0
  ) {
    admission.fourHrFollowUpSchema.forEach((followUp, index) => {
      const pageBreak = recordCount > 0 ? "page-break-before: always;" : "";
      recordCount++;

      content += `
        <div class="follow-up-record" style="${pageBreak}">
          <div class="section-header">
            <h2>4-Hour Follow-Up Record ${index + 1}</h2>
            <span class="record-date">${
              followUp.date || "Not recorded"
            } | Nurse: ${followUp.nurseName || "Not assigned"}</span>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">4-Hour Vital Signs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Pulse:</strong></td>
                <td>${followUp.fourhrpulse || "N/A"}</td>
                <td><strong>Blood Pressure:</strong></td>
                <td>${followUp.fourhrbloodPressure || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Temperature:</strong></td>
                <td>${followUp.fourhrTemperature || "N/A"}</td>
                <td><strong>Oxygen Saturation:</strong></td>
                <td>${followUp.fourhroxygenSaturation || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th colspan="4" class="section-title">Fluid Management</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>IV Fluid:</strong></td>
                <td>${followUp.fourhrivFluid || "N/A"}</td>
                <td><strong>Urine Output:</strong></td>
                <td>${followUp.fourhrurine || "N/A"}</td>
              </tr>
            </tbody>
          </table>

          ${
            followUp.notes || followUp.observations
              ? `
          <table class="data-table">
            <thead>
              <tr>
                <th colspan="2" class="section-title">Notes & Observations</th>
              </tr>
            </thead>
            <tbody>
              ${
                followUp.notes
                  ? `<tr><td width="20%"><strong>Notes:</strong></td><td>${followUp.notes}</td></tr>`
                  : ""
              }
              ${
                followUp.observations
                  ? `<tr><td width="20%"><strong>Observations:</strong></td><td>${followUp.observations}</td></tr>`
                  : ""
              }
            </tbody>
          </table>
          `
              : ""
          }
        </div>
      `;
    });
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Complete Follow-Up Report</title>
      <style>
        ${getCompactStyles()}
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
}

// Compact patient information table
function generatePatientInfoTable(patient, admission) {
  return `
    <table class="patient-table">
      <thead>
        <tr>
          <th colspan="6" class="patient-header">Patient Information - ${
            patient.patientId
          }</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Name:</strong></td>
          <td>${patient.name}</td>
          <td><strong>Age:</strong></td>
          <td>${patient.age}</td>
          <td><strong>Gender:</strong></td>
          <td>${patient.gender}</td>
        </tr>
        <tr>
          <td><strong>Contact:</strong></td>
          <td>${patient.contact}</td>
          <td><strong>DOB:</strong></td>
          <td>${patient.dob || "N/A"}</td>
          <td><strong>Address:</strong></td>
          <td>${patient.address || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>OPD No:</strong></td>
          <td>${admission.opdNumber || "N/A"}</td>
          <td><strong>IPD No:</strong></td>
          <td>${admission.ipdNumber || "N/A"}</td>
          <td><strong>Status:</strong></td>
          <td>${admission.status}</td>
        </tr>
        <tr>
          <td><strong>Admission:</strong></td>
          <td>${new Date(admission.admissionDate).toLocaleDateString(
            "en-IN"
          )}</td>
          <td><strong>Section:</strong></td>
          <td>${admission.section?.name || "N/A"}</td>
          <td><strong>Bed:</strong></td>
          <td>${admission.bedNumber || "N/A"}</td>
        </tr>
        <tr>
          <td><strong>Doctor:</strong></td>
          <td colspan="5">${admission.doctor?.name || "Not assigned"}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// Updated CSS with fixed page handling
function getCompactStyles() {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 15px;
      line-height: 1.4;
      color: #333;
      font-size: 12px;
    }
    
    .banner {
      text-align: center;
      margin-bottom: 15px;
    }
    
    .banner img {
      max-width: 100%;
      height: auto;
      max-height: 80px;
    }
    
    .main-title {
      text-align: center;
      color: #2c5aa0;
      margin-bottom: 15px;
      font-size: 20px;
      font-weight: bold;
    }
    
    .patient-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .patient-header {
      background-color: #060607ff;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      font-weight: bold;
    }
    
    .patient-table td, .patient-table th {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    
    .follow-up-record {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f8f9fa;
      padding: 10px 15px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    
    .section-header h2 {
      margin: 0;
      font-size: 16px;
      color: #2c5aa0;
    }
    
    .record-date {
      font-size: 11px;
      color: black;
      font-style: italic;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .data-table th, .data-table td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    
    .section-title {
      background-color: #e9ecef;
      font-weight: bold;
      text-align: center;
      color: #495057;
      font-size: 13px;
    }
    
    .data-table td:nth-child(odd) {
      width: 20%;
      background-color: #f8f9fa;
    }
    
    .data-table td:nth-child(even) {
      width: 30%;
    }
    
    .highlight {
      background-color: #fff3cd !important;
      font-weight: bold;
      color: #856404;
    }
    
    @media print {
      body {
        font-size: 11px;
      }
      
      .follow-up-record {
        page-break-inside: avoid;
      }
      
      .data-table {
        page-break-inside: avoid;
      }
      
      .patient-table {
        page-break-inside: avoid;
      }
      
      .section-header {
        page-break-inside: avoid;
        page-break-after: avoid;
      }
    }
    
    @page {
      margin: 0.5in;
      size: A4;
    }
  `;
}
export const getPatientsList1 = async (req, res) => {
  try {
    const {
      status = "all", // all, active, discharged, pending
      patientType = "all", // all, Internal, External
      section = "all", // all, specific section ID
      search = "", // search by name, patientId, opdNumber, ipdNumber
      page = 1,
      limit = 5,
      sortBy = "admissionDate",
      sortOrder = "desc",
    } = req.query;

    // Build aggregation pipeline
    const pipeline = [];

    // Match active patients (not fully discharged)
    let matchStage = {
      discharged: false,
      admissionRecords: { $exists: true, $not: { $size: 0 } },
    };

    // Add search functionality
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { name: searchRegex },
        { patientId: searchRegex },
        { contact: searchRegex },
        { "admissionRecords.opdNumber": parseInt(search) || 0 },
        { "admissionRecords.ipdNumber": parseInt(search) || 0 },
      ];
    }

    pipeline.push({ $match: matchStage });

    // Unwind admission records to work with individual admissions
    pipeline.push({ $unwind: "$admissionRecords" });

    // Filter by admission status
    if (status !== "all") {
      const statusFilter = {};
      switch (status) {
        case "active":
          statusFilter["admissionRecords.status"] = {
            $in: ["Active", "Admitted"],
          };
          break;
        case "pending":
          statusFilter["admissionRecords.status"] = "Pending";
          break;
        case "discharged":
          statusFilter["admissionRecords.status"] = "Discharged";
          break;
      }
      if (Object.keys(statusFilter).length > 0) {
        pipeline.push({ $match: statusFilter });
      }
    }

    // Filter by patient type
    if (patientType !== "all") {
      pipeline.push({
        $match: { "admissionRecords.patientType": patientType },
      });
    }

    // Filter by section
    if (section !== "all" && mongoose.Types.ObjectId.isValid(section)) {
      pipeline.push({
        $match: {
          "admissionRecords.section.id": new mongoose.Types.ObjectId(section),
        },
      });
    }

    // Add calculated fields and format data
    pipeline.push({
      $addFields: {
        // Calculate days since admission
        daysSinceAdmission: {
          $ceil: {
            $divide: [
              { $subtract: [new Date(), "$admissionRecords.admissionDate"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
        // Get latest vitals
        latestVitals: { $arrayElemAt: ["$admissionRecords.vitals", -1] },
        // Get latest follow-up
        latestFollowUp: { $arrayElemAt: ["$admissionRecords.followUps", -1] },
        // Count follow-ups
        followUpCount: {
          $size: { $ifNull: ["$admissionRecords.followUps", []] },
        },
        // Check if patient has critical medications
        hasCriticalMedications: {
          $gt: [
            { $size: { $ifNull: ["$admissionRecords.medications", []] } },
            0,
          ],
        },
        // Check pending tasks
        pendingMedications: {
          $size: {
            $filter: {
              input: { $ifNull: ["$admissionRecords.medications", []] },
              cond: { $eq: ["$$this.administrationStatus", "Pending"] },
            },
          },
        },
        pendingProcedures: {
          $size: {
            $filter: {
              input: { $ifNull: ["$admissionRecords.procedures", []] },
              cond: { $eq: ["$$this.administrationStatus", "Pending"] },
            },
          },
        },
      },
    });

    // Project final structure
    pipeline.push({
      $project: {
        // Patient basic info
        patientId: 1,
        name: 1,
        age: 1,
        gender: 1,
        contact: 1,
        imageUrl: 1,

        // Admission details
        admission: {
          _id: "$admissionRecords._id",
          opdNumber: "$admissionRecords.opdNumber",
          ipdNumber: "$admissionRecords.ipdNumber",
          admissionDate: "$admissionRecords.admissionDate",
          status: "$admissionRecords.status",
          patientType: "$admissionRecords.patientType",
          reasonForAdmission: "$admissionRecords.reasonForAdmission",
          initialDiagnosis: "$admissionRecords.initialDiagnosis",
          section: "$admissionRecords.section",
          bedNumber: "$admissionRecords.bedNumber",
          daysSinceAdmission: 1,
        },

        // Doctor info
        doctor: "$admissionRecords.doctor",

        // Clinical status
        clinicalStatus: {
          // Latest vitals (last recorded)
          latestVitals: {
            temperature: "$latestVitals.temperature",
            pulse: "$latestVitals.pulse",
            bloodPressure: "$latestVitals.bloodPressure",
            bloodSugarLevel: "$latestVitals.bloodSugarLevel",
            recordedAt: "$latestVitals.recordedAt",
          },

          // Latest follow-up info
          latestFollowUp: {
            date: "$latestFollowUp.date",
            nurseId: "$latestFollowUp.nurseId",
            notes: { $substr: ["$latestFollowUp.notes", 0, 100] }, // First 100 chars
            temperature: "$latestFollowUp.temperature",
            pulse: "$latestFollowUp.pulse",
            bloodPressure: "$latestFollowUp.bloodPressure",
          },

          followUpCount: 1,

          // Current symptoms and diagnosis
          currentSymptoms: "$admissionRecords.symptomsByDoctor",
          currentDiagnosis: "$admissionRecords.diagnosisByDoctor",
        },

        // Task summary for nurses
        taskSummary: {
          pendingMedications: 1,
          pendingProcedures: 1,
          hasCriticalMedications: 1,
          totalMedications: {
            $size: { $ifNull: ["$admissionRecords.medications", []] },
          },
          totalProcedures: {
            $size: { $ifNull: ["$admissionRecords.procedures", []] },
          },
          hasSpecialInstructions: {
            $gt: [
              {
                $size: {
                  $ifNull: ["$admissionRecords.specialInstructions", []],
                },
              },
              0,
            ],
          },
        },

        // Priority indicators
        priorityFlags: {
          // No follow-up in last 24 hours
          needsFollowUp: {
            $or: [
              { $eq: ["$latestFollowUp", null] },
              {
                $lt: [
                  "$latestFollowUp.date",
                  {
                    $dateToString: {
                      date: { $subtract: [new Date(), 24 * 60 * 60 * 1000] },
                      format: "%Y-%m-%d",
                    },
                  },
                ],
              },
            ],
          },

          // Has pending critical tasks
          hasPendingTasks: {
            $gt: [{ $add: ["$pendingMedications", "$pendingProcedures"] }, 0],
          },

          // Long stay patient (>7 days)
          longStay: { $gt: ["$daysSinceAdmission", 7] },

          // New admission (within 24 hours)
          newAdmission: { $lte: ["$daysSinceAdmission", 1] },
        },

        // Recent notes summary
        recentNotes: {
          $slice: ["$admissionRecords.doctorNotes", -3], // Last 3 doctor notes
        },
      },
    });

    // Sort
    const sortField =
      sortBy === "admissionDate" ? "admission.admissionDate" : sortBy;
    pipeline.push({
      $sort: { [sortField]: sortOrder === "desc" ? -1 : 1 },
    });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute aggregation
    const patients = await patientSchema.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = [
      { $match: matchStage },
      { $unwind: "$admissionRecords" },
    ];

    if (status !== "all") {
      const statusFilter = {};
      switch (status) {
        case "active":
          statusFilter["admissionRecords.status"] = {
            $in: ["Active", "Admitted"],
          };
          break;
        case "pending":
          statusFilter["admissionRecords.status"] = "Pending";
          break;
        case "discharged":
          statusFilter["admissionRecords.status"] = "Discharged";
          break;
      }
      if (Object.keys(statusFilter).length > 0) {
        totalPipeline.push({ $match: statusFilter });
      }
    }

    if (patientType !== "all") {
      totalPipeline.push({
        $match: { "admissionRecords.patientType": patientType },
      });
    }

    if (section !== "all" && mongoose.Types.ObjectId.isValid(section)) {
      totalPipeline.push({
        $match: {
          "admissionRecords.section.id": new mongoose.Types.ObjectId(section),
        },
      });
    }

    totalPipeline.push({ $count: "total" });
    const totalResult = await patientSchema.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: { discharged: false } },
      { $unwind: "$admissionRecords" },
      {
        $group: {
          _id: null,
          totalActive: { $sum: 1 },
          pendingFollowUps: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $size: "$admissionRecords.followUps" }, 0] },
                    {
                      $lt: [
                        {
                          $arrayElemAt: [
                            "$admissionRecords.followUps.date",
                            -1,
                          ],
                        },
                        {
                          $dateToString: {
                            date: {
                              $subtract: [new Date(), 24 * 60 * 60 * 1000],
                            },
                            format: "%Y-%m-%d",
                          },
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          criticalPatients: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    {
                      $add: [
                        {
                          $size: {
                            $filter: {
                              input: "$admissionRecords.medications",
                              cond: {
                                $eq: ["$$this.administrationStatus", "Pending"],
                              },
                            },
                          },
                        },
                        {
                          $size: {
                            $filter: {
                              input: "$admissionRecords.procedures",
                              cond: {
                                $eq: ["$$this.administrationStatus", "Pending"],
                              },
                            },
                          },
                        },
                      ],
                    },
                    3,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const summaryResult = await patientSchema.aggregate(summaryPipeline);
    const summary = summaryResult[0] || {
      totalActive: 0,
      pendingFollowUps: 0,
      criticalPatients: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: skip + patients.length < total,
          hasPrev: parseInt(page) > 1,
        },
        summary,
        filters: {
          status,
          patientType,
          section,
          search,
        },
      },
      message: `Retrieved ${patients.length} patients successfully`,
    });
  } catch (error) {
    console.error("Error in getPatientsList:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve patients list",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

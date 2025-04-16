import Attendance from "../models/attendanceSchema.js";
import Nurse from "../models/nurseSchema.js";
import patientSchema from "../models/patientSchema.js";
import moment from "moment-timezone";

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

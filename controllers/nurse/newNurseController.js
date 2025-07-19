import Ward from "../../models/nurse/wardSchema.js";
import Nurse from "../../models/nurseSchema.js";
import NurseAttendance from "../../models/nurse/nurseAttendanceSchema.js";
import moment from "moment";
import patientSchema from "../../models/patientSchema.js";
import EmergencyMedication from "../../models/nurse/emergencySchema.js";
import mongoose from "mongoose";
export const getNurseProfile = async (req, res) => {
  try {
    const nurseId = req.userId; // From auth middleware

    const nurse = await Nurse.findById(nurseId).select("-password");
    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    res.status(200).json({ nurse });
  } catch (error) {
    console.error("Error fetching nurse profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Controller function to get all nurses
export const getAllNurses = async (req, res) => {
  try {
    // Verify if admin nurse

    // Get all nurses
    const nurses = await Nurse.find().select("-password");

    // Get today's date (without time)
    const today = moment().startOf("day").toDate();

    // Get attendance records for today
    const attendance = await NurseAttendance.find({
      date: {
        $gte: today,
        $lt: moment(today).add(1, "days").toDate(),
      },
    });

    // Enhance nurse data with availability info
    const enhancedNurses = nurses.map((nurse) => {
      const nurseAttendance = attendance.find(
        (a) => a.nurseId.toString() === nurse._id.toString()
      );

      return {
        _id: nurse._id,
        nurseName: nurse.nurseName,
        email: nurse.email,
        usertype: nurse.usertype,
        status: nurseAttendance ? nurseAttendance.status : "Not Checked In",
        isAvailable:
          nurseAttendance &&
          nurseAttendance.status === "Present" &&
          !nurseAttendance.checkOut.time,
      };
    });

    res.status(200).json({ nurses: enhancedNurses });
  } catch (error) {
    console.error("Error fetching nurses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add this route
// Updated getAllWards function with auto-sync capability
// controllers/nurseManagement.js
export const getAllWards = async (req, res) => {
  try {
    // Get all wards with nurse assignments
    let wards = await Ward.find().populate({
      path: "nurseAssignments.nurseId",
      select: "nurseName email usertype",
    });

    // Get the Section model
    const Section = mongoose.model("Section");

    // Get all sections
    const sections = await Section.find();
    console.log(`Found ${sections.length} sections and ${wards.length} wards`);

    // Auto-sync: Check if any new sections exist that don't have corresponding wards
    let newWardsCreated = false;

    for (const section of sections) {
      // Check if ward already exists for this section
      const existingWard = wards.find((ward) => ward.name === section.name);

      if (!existingWard) {
        console.log(`Creating new ward for section: ${section.name}`);

        // Create new ward based on section
        const newWard = new Ward({
          name: section.name,
          type: section.type,
          floor: 1, // Default floor value
          totalBeds: section.totalBeds, // Use totalBeds from Section schema
          nurseAssignments: [],
        });

        await newWard.save();
        newWardsCreated = true;
      } else {
        // Update totalBeds if different from section
        if (existingWard.totalBeds !== section.totalBeds) {
          existingWard.totalBeds = section.totalBeds;
          await existingWard.save();
          console.log(
            `Updated beds for ward ${existingWard.name} to ${section.totalBeds}`
          );
        }
      }
    }

    // If new wards were created, reload the wards
    if (newWardsCreated) {
      wards = await Ward.find().populate({
        path: "nurseAssignments.nurseId",
        select: "nurseName email usertype",
      });
      console.log(`After auto-sync: ${wards.length} wards`);
    }

    // Get all patients to check bed occupancy
    const patients = await patientSchema.find({
      discharged: false,
      "admissionRecords.section.id": { $exists: true },
      "admissionRecords.bedNumber": { $exists: true },
    });

    console.log("Found patients:", patients.length);

    // Enhance ward data with occupancy info
    const enhancedWards = wards.map((ward) => {
      // Find the matching section for this ward
      const matchingSection = sections.find(
        (section) => section.name === ward.name
      );

      if (!matchingSection) {
        console.log(`Warning: No matching section found for ward ${ward.name}`);
      }

      const sectionId = matchingSection ? matchingSection._id.toString() : null;

      // Find patients in this ward/section
      const wardPatients = patients.filter((patient) => {
        const currentAdmission =
          patient.admissionRecords[patient.admissionRecords.length - 1];

        if (
          !currentAdmission ||
          !currentAdmission.section ||
          !currentAdmission.section.id
        ) {
          return false;
        }

        // Match by section ID (exact match)
        if (sectionId && currentAdmission.section.id.toString() === sectionId) {
          return true;
        }

        // Fallback: match by name if IDs don't match
        return currentAdmission.section.name === ward.name;
      });

      console.log(`Ward ${ward.name} has ${wardPatients.length} patients`);

      // Create bed occupancy map
      const bedOccupancy = [];
      for (let i = 1; i <= ward.totalBeds; i++) {
        const occupyingPatient = wardPatients.find((patient) => {
          const admission =
            patient.admissionRecords[patient.admissionRecords.length - 1];
          return admission.bedNumber === i;
        });

        bedOccupancy.push({
          bedNumber: i,
          isOccupied: !!occupyingPatient,
          patientInfo: occupyingPatient
            ? {
                patientId: occupyingPatient.patientId,
                name: occupyingPatient.name,
                age: occupyingPatient.age,
                gender: occupyingPatient.gender,
                admissionId:
                  occupyingPatient.admissionRecords[
                    occupyingPatient.admissionRecords.length - 1
                  ]._id,
                admissionDate:
                  occupyingPatient.admissionRecords[
                    occupyingPatient.admissionRecords.length - 1
                  ].admissionDate,
                doctor:
                  occupyingPatient.admissionRecords[
                    occupyingPatient.admissionRecords.length - 1
                  ].doctor,
              }
            : null,
        });
      }

      // Get active nurses by shift
      const activeNurses = {
        Morning:
          ward.nurseAssignments?.filter(
            (a) => a.shift === "Morning" && a.isActive
          ) || [],
        Evening:
          ward.nurseAssignments?.filter(
            (a) => a.shift === "Evening" && a.isActive
          ) || [],
        Night:
          ward.nurseAssignments?.filter(
            (a) => a.shift === "Night" && a.isActive
          ) || [],
      };

      // Get corresponding section data
      const sectionData = matchingSection
        ? {
            _id: matchingSection._id,
            totalBeds: matchingSection.totalBeds,
            availableBeds: matchingSection.availableBeds,
            isActive: matchingSection.isActive,
          }
        : null;

      return {
        _id: ward._id,
        name: ward.name,
        type: ward.type,
        floor: ward.floor || 1,
        totalBeds: ward.totalBeds,
        occupiedBeds: bedOccupancy.filter((b) => b.isOccupied).length,
        bedOccupancy,
        nursesByShift: activeNurses,
        sectionId: sectionId,
        sectionInfo: sectionData,
        patientsCount: wardPatients.length,
      };
    });

    res.status(200).json({
      wards: enhancedWards,
      autoSyncPerformed: newWardsCreated,
    });
  } catch (error) {
    console.error("Error fetching wards:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Assign nurse to ward (admin nurse only)
export const assignNurseToWard = async (req, res) => {
  try {
    const { nurseId, wardId, shift } = req.body;

    // Verify if admin nurse
    // if (req.usertype !== "nurseadmin") {
    //   return res
    //     .status(403)
    //     .json({ message: "Unauthorized: Admin nurse access required" });
    // }

    // Validate shift
    if (!["Morning", "Evening", "Night"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "Invalid shift. Must be Morning, Evening, or Night" });
    }

    // Check if nurse exists
    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    // Check if ward exists
    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ message: "Ward not found" });
    }

    // Check if nurse is already assigned to this ward and shift
    const existingAssignment = ward.nurseAssignments.find(
      (a) => a.nurseId.toString() === nurseId && a.shift === shift && a.isActive
    );

    if (existingAssignment) {
      return res
        .status(409)
        .json({ message: "Nurse already assigned to this ward and shift" });
    }

    // Add nurse to ward
    ward.nurseAssignments.push({
      nurseId,
      shift,
      assignedDate: new Date(),
      isActive: true,
    });

    await ward.save();

    res.status(200).json({
      message: "Nurse assigned to ward successfully",
      wardId: ward._id,
      nurseName: nurse.nurseName,
      shift,
    });
  } catch (error) {
    console.error("Error assigning nurse to ward:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Unassign nurse from ward (admin nurse only)
export const unassignNurseFromWard = async (req, res) => {
  try {
    const { nurseId, wardId, shift } = req.body;

    // Verify if admin nurse
    if (req.usertype !== "nurseadmin") {
      return res
        .status(403)
        .json({ message: "Unauthorized: Admin nurse access required" });
    }

    // Check if ward exists
    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ message: "Ward not found" });
    }

    // Find the assignment index
    const assignmentIndex = ward.nurseAssignments.findIndex(
      (a) => a.nurseId.toString() === nurseId && a.shift === shift && a.isActive
    );

    if (assignmentIndex === -1) {
      return res.status(404).json({ message: "Nurse assignment not found" });
    }

    // Mark assignment as inactive
    ward.nurseAssignments[assignmentIndex].isActive = false;

    await ward.save();

    res.status(200).json({
      message: "Nurse unassigned from ward successfully",
      wardId: ward._id,
      nurseId,
      shift,
    });
  } catch (error) {
    console.error("Error unassigning nurse from ward:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Voluntary join ward (normal nurse)
export const voluntaryJoinWard = async (req, res) => {
  try {
    const { wardId, shift } = req.body;
    const nurseId = req.userId; // From auth middleware

    // Validate shift
    if (!["Morning", "Evening", "Night"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "Invalid shift. Must be Morning, Evening, or Night" });
    }

    // Check if ward exists
    const ward = await Ward.findById(wardId);
    if (!ward) {
      return res.status(404).json({ message: "Ward not found" });
    }

    // Check if nurse is already assigned to this ward and shift
    const existingAssignment = ward.nurseAssignments.find(
      (a) => a.nurseId.toString() === nurseId && a.shift === shift && a.isActive
    );

    if (existingAssignment) {
      return res
        .status(409)
        .json({ message: "You are already assigned to this ward and shift" });
    }

    // Add nurse to ward
    ward.nurseAssignments.push({
      nurseId,
      shift,
      assignedDate: new Date(),
      isActive: true,
    });

    await ward.save();

    res.status(200).json({
      message: "You have successfully joined the ward",
      wardId: ward._id,
      shift,
    });
  } catch (error) {
    console.error("Error joining ward:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get wards assigned to nurse
export const getNurseWards = async (req, res) => {
  try {
    const nurseId = req.userId; // From auth middleware

    // Find all wards where the nurse is assigned
    const wards = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          isActive: true,
        },
      },
    }).select("name type floor totalBeds nurseAssignments");

    // Format the response
    const assignedWards = wards.map((ward) => {
      const nurseAssignments = ward.nurseAssignments
        .filter((a) => a.nurseId.toString() === nurseId && a.isActive)
        .map((a) => ({
          shift: a.shift,
          assignedDate: a.assignedDate,
        }));

      return {
        _id: ward._id,
        name: ward.name,
        type: ward.type,
        floor: ward.floor,
        shifts: nurseAssignments.map((a) => a.shift),
      };
    });

    res.status(200).json({ assignedWards });
  } catch (error) {
    console.error("Error fetching nurse wards:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get patients in nurse's assigned ward
export const getWardPatients = async (req, res) => {
  try {
    const nurseId = req.userId;

    // Find wards where the nurse is assigned
    const assignedWards = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          isActive: true,
        },
      },
    }).select("_id");

    if (assignedWards.length === 0) {
      return res.status(404).json({ message: "No assigned wards found" });
    }

    const wardIds = assignedWards.map((ward) => ward._id);

    // Find all patients in these wards
    const patients = await patientSchema.find({
      discharged: false,
      "admissionRecords.section.id": { $in: wardIds },
    });

    // Format patient data for frontend
    const formattedPatients = patients.map((patient) => {
      const currentAdmission =
        patient.admissionRecords[patient.admissionRecords.length - 1];

      return {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        admissionId: currentAdmission._id,
        bedNumber: currentAdmission.bedNumber,
        section: currentAdmission.section,
        latestVitals:
          currentAdmission.vitals.length > 0
            ? currentAdmission.vitals[currentAdmission.vitals.length - 1]
            : null,
        admissionDate: currentAdmission.admissionDate,
        doctor: currentAdmission.doctor,
      };
    });

    res.status(200).json({ patients: formattedPatients });
  } catch (error) {
    console.error("Error fetching ward patients:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get patient treatment details
export const getPatientTreatment = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admission = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Extract treatment details
    const treatmentPlan = {
      patientInfo: {
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        bedNumber: admission.bedNumber,
        section: admission.section,
      },
      medications: admission.medications || [],
      ivFluids: admission.ivFluids || [],
      procedures: admission.procedures || [],
      specialInstructions: admission.specialInstructions || [],
      doctorNotes: admission.doctorNotes || [],
      vitals: admission.vitals || [],
    };

    res.status(200).json({ treatmentPlan });
  } catch (error) {
    console.error("Error fetching patient treatment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// controllers/patientCare.js

// Get patients in nurse's assigned ward with detailed information
export const getWardPatientsDetail = async (req, res) => {
  try {
    const nurseId = req.userId;

    // Find wards where the nurse is assigned
    const assignedWards = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          isActive: true,
        },
      },
    }).select("_id name type");

    if (assignedWards.length === 0) {
      return res.status(200).json({
        message: "No assigned wards found",
        wards: [],
        patients: [],
      });
    }

    // Get the current time to determine the current shift
    const now = new Date();
    const hour = now.getHours();
    let currentShift = "";

    if (hour >= 7 && hour < 15) {
      currentShift = "Morning";
    } else if (hour >= 15 && hour < 23) {
      currentShift = "Evening";
    } else {
      currentShift = "Night";
    }

    // Check if nurse is assigned to any wards for the current shift
    const wardsForCurrentShift = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          shift: currentShift,
          isActive: true,
        },
      },
    }).select("_id name type");

    // Get ward IDs and names
    const wardIds = assignedWards.map((ward) => ward._id);
    const wardNames = assignedWards.map((ward) => ward.name);
    const currentShiftWardNames = wardsForCurrentShift.map((ward) => ward.name);

    // Find all sections matching these ward names
    const Section = mongoose.model("Section");
    const sections = await Section.find({ name: { $in: wardNames } });
    const sectionIds = sections.map((section) => section._id);

    // Find all patients in these wards/sections
    const patients = await patientSchema.find({
      discharged: false,
      "admissionRecords.section.id": {
        $in: sectionIds.map((id) => id.toString()),
      },
    });

    // Group patients by ward
    const wardPatients = {};

    // Initialize empty arrays for each ward
    wardNames.forEach((wardName) => {
      wardPatients[wardName] = [];
    });

    // Organize patients by ward
    patients.forEach((patient) => {
      const currentAdmission =
        patient.admissionRecords[patient.admissionRecords.length - 1];

      if (currentAdmission && currentAdmission.section) {
        const wardName = currentAdmission.section.name;

        if (wardNames.includes(wardName)) {
          // Extract relevant patient information
          const patientData = {
            _id: patient._id,
            patientId: patient.patientId,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            bedNumber: currentAdmission.bedNumber,
            admissionId: currentAdmission._id,
            admissionDate: currentAdmission.admissionDate,
            doctor: currentAdmission.doctor,
            // Vital signs
            latestVitals:
              currentAdmission.vitals.length > 0
                ? currentAdmission.vitals[currentAdmission.vitals.length - 1]
                : null,
            // Medication info
            medications: currentAdmission.medications || [],
            ivFluids: currentAdmission.ivFluids || [],
            // Follow-up status
            lastFollowUp:
              currentAdmission.followUps.length > 0
                ? currentAdmission.followUps[
                    currentAdmission.followUps.length - 1
                  ]
                : null,
            lastFourHourFollowUp:
              currentAdmission.fourHrFollowUpSchema.length > 0
                ? currentAdmission.fourHrFollowUpSchema[
                    currentAdmission.fourHrFollowUpSchema.length - 1
                  ]
                : null,
            // Treatment info
            procedures: currentAdmission.procedures || [],
            specialInstructions: currentAdmission.specialInstructions || [],
            // Diagnosis and notes
            initialDiagnosis: currentAdmission.initialDiagnosis,
            diagnosisByDoctor: currentAdmission.diagnosisByDoctor || [],
            doctorNotes: currentAdmission.doctorNotes || [],
            // Prescriptions
            prescriptions: currentAdmission.doctorPrescriptions || [],
            // Flags for quick reference
            needsFollowUp: determineIfNeedsFollowUp(currentAdmission),
            alertStatus: determineAlertStatus(currentAdmission),
            isInCurrentShift: currentShiftWardNames.includes(wardName),
          };

          wardPatients[wardName].push(patientData);
        }
      }
    });

    // Format response data
    const formattedWards = assignedWards.map((ward) => {
      const wardName = ward.name;
      const patients = wardPatients[wardName] || [];

      // Sort patients by bed number
      patients.sort((a, b) => a.bedNumber - b.bedNumber);

      return {
        _id: ward._id,
        name: wardName,
        type: ward.type,
        isCurrentShift: currentShiftWardNames.includes(wardName),
        totalPatients: patients.length,
        patients: patients,
      };
    });

    // Only send detailed patient info for current shift wards, to reduce payload size
    formattedWards.forEach((ward) => {
      if (!ward.isCurrentShift) {
        ward.patients = ward.patients.map((patient) => ({
          _id: patient._id,
          patientId: patient.patientId,
          name: patient.name,
          bedNumber: patient.bedNumber,
          alertStatus: patient.alertStatus,
        }));
      }
    });

    // Additional stats for the current shift
    const currentShiftStats = {
      shift: currentShift,
      patientCount: formattedWards
        .filter((ward) => ward.isCurrentShift)
        .reduce((sum, ward) => sum + ward.totalPatients, 0),
      needFollowUp: formattedWards
        .filter((ward) => ward.isCurrentShift)
        .flatMap((ward) => ward.patients)
        .filter((patient) => patient.needsFollowUp).length,
      alerts: formattedWards
        .filter((ward) => ward.isCurrentShift)
        .flatMap((ward) => ward.patients)
        .filter((patient) => patient.alertStatus === "urgent").length,
    };

    res.status(200).json({
      currentShift: currentShift,
      currentShiftStats: currentShiftStats,
      wards: formattedWards,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching ward patients:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to determine if patient needs follow-up
function determineIfNeedsFollowUp(admission) {
  // Check when last follow-up was done
  const now = new Date();

  // Check 2-hour follow-up
  if (admission.followUps.length > 0) {
    const lastFollowUp = new Date(
      admission.followUps[admission.followUps.length - 1].date
    );
    const hoursSinceLastFollowUp = (now - lastFollowUp) / (1000 * 60 * 60);

    // If it's been more than 2 hours since last follow-up
    if (hoursSinceLastFollowUp >= 2) {
      return true;
    }
  } else if (admission.admissionDate) {
    // If no follow-ups have been done yet, check time since admission
    const admissionTime = new Date(admission.admissionDate);
    const hoursSinceAdmission = (now - admissionTime) / (1000 * 60 * 60);

    // If it's been more than 2 hours since admission with no follow-up
    if (hoursSinceAdmission >= 2) {
      return true;
    }
  }

  // Check 4-hour follow-up
  if (admission.fourHrFollowUpSchema.length > 0) {
    const lastFourHrFollowUp = new Date(
      admission.fourHrFollowUpSchema[
        admission.fourHrFollowUpSchema.length - 1
      ].date
    );
    const hoursSinceLastFourHrFollowUp =
      (now - lastFourHrFollowUp) / (1000 * 60 * 60);

    // If it's been more than 4 hours since last 4-hour follow-up
    if (hoursSinceLastFourHrFollowUp >= 4) {
      return true;
    }
  } else if (admission.admissionDate) {
    // If no 4-hour follow-ups have been done, check time since admission
    const admissionTime = new Date(admission.admissionDate);
    const hoursSinceAdmission = (now - admissionTime) / (1000 * 60 * 60);

    // If it's been more than 4 hours since admission with no 4-hour follow-up
    if (hoursSinceAdmission >= 4) {
      return true;
    }
  }

  return false;
}

// Helper function to determine alert status
function determineAlertStatus(admission) {
  // Check for abnormal vital signs
  if (admission.vitals.length > 0) {
    const latestVitals = admission.vitals[admission.vitals.length - 1];

    // Convert values to numbers for comparison
    const pulse = parseFloat(latestVitals.pulse);
    const temperature = parseFloat(latestVitals.temperature);
    const bloodPressureParts = latestVitals.bloodPressure
      ? latestVitals.bloodPressure.split("/")
      : [0, 0];
    const systolic = parseFloat(bloodPressureParts[0]);
    const diastolic = parseFloat(bloodPressureParts[1]);
    const bloodSugar = parseFloat(latestVitals.bloodSugarLevel);

    // Check for urgent vital signs
    if (
      (pulse && (pulse < 50 || pulse > 120)) ||
      (temperature && (temperature < 35 || temperature > 39)) ||
      (systolic && (systolic < 90 || systolic > 180)) ||
      (diastolic && (diastolic < 60 || diastolic > 120)) ||
      (bloodSugar && (bloodSugar < 70 || bloodSugar > 300))
    ) {
      return "urgent";
    }

    // Check for warning vital signs
    if (
      (pulse && (pulse < 60 || pulse > 100)) ||
      (temperature && (temperature < 36 || temperature > 38)) ||
      (systolic && (systolic < 100 || systolic > 140)) ||
      (diastolic && (diastolic < 70 || diastolic > 90)) ||
      (bloodSugar && (bloodSugar < 80 || bloodSugar > 200))
    ) {
      return "warning";
    }
  }

  // Check for special instructions that might indicate high priority
  const hasUrgentInstructions =
    admission.specialInstructions &&
    admission.specialInstructions.some(
      (inst) =>
        inst.instruction.toLowerCase().includes("urgent") ||
        inst.instruction.toLowerCase().includes("immediate") ||
        inst.instruction.toLowerCase().includes("critical")
    );

  if (hasUrgentInstructions) {
    return "urgent";
  }

  // Check if there are doctor notes indicating urgency
  const hasUrgentNotes =
    admission.doctorNotes &&
    admission.doctorNotes.some(
      (note) =>
        note.text.toLowerCase().includes("urgent") ||
        note.text.toLowerCase().includes("immediate attention") ||
        note.text.toLowerCase().includes("critical")
    );

  if (hasUrgentNotes) {
    return "warning";
  }

  // Default status
  return "normal";
}

// Get detailed information about a specific patient
export const getPatientDetail = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admission = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find wards where the nurse is assigned
    const assignedWards = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          isActive: true,
        },
      },
    }).select("name");

    const assignedWardNames = assignedWards.map((ward) => ward.name);

    // Check if nurse is assigned to the patient's ward
    if (!assignedWardNames.includes(admission.section.name)) {
      return res.status(403).json({
        message: "You are not assigned to this patient's ward",
      });
    }

    // Prepare detailed patient data
    const detailedPatient = {
      // Basic patient info
      _id: patient._id,
      patientId: patient.patientId,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      address: patient.address,
      imageUrl: patient.imageUrl,

      // Admission details
      admission: {
        _id: admission._id,
        admissionDate: admission.admissionDate,
        status: admission.status,
        patientType: admission.patientType,
        bedNumber: admission.bedNumber,
        section: admission.section,
        doctor: admission.doctor,
        weight: admission.weight,
        symptoms: admission.symptoms,
        initialDiagnosis: admission.initialDiagnosis,
        diagnosisByDoctor: admission.diagnosisByDoctor || [],
        admitNotes: admission.admitNotes,
      },

      // Treatment details
      treatment: {
        medications: admission.medications || [],
        ivFluids: admission.ivFluids || [],
        procedures: admission.procedures || [],
        specialInstructions: admission.specialInstructions || [],
        prescriptions: admission.doctorPrescriptions || [],
      },

      // Vitals and monitoring
      monitoring: {
        vitals: admission.vitals || [],
        followUps: admission.followUps || [],
        fourHourFollowUps: admission.fourHrFollowUpSchema || [],
      },

      // Doctor notes and consultation info
      medicalNotes: {
        doctorNotes: admission.doctorNotes || [],
        doctorConsulting: admission.doctorConsulting || [],
      },

      // Status indicators
      status: {
        needsFollowUp: determineIfNeedsFollowUp(admission),
        alertStatus: determineAlertStatus(admission),
        ipdDetailsUpdated: admission.ipdDetailsUpdated,
        pendingDischarge:
          admission.conditionAtDischarge !== "Discharged"
            ? false
            : !admission.ipdDetailsUpdated,
      },
    };

    res.status(200).json({
      patient: detailedPatient,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Record patient vitals
export const recordVitals = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;
    const { temperature, pulse, bloodPressure, bloodSugarLevel, other } =
      req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add new vitals record
    const newVitals = {
      temperature,
      pulse,
      bloodPressure,
      bloodSugarLevel,
      other,
      recordedAt: new Date(),
    };

    patient.admissionRecords[admissionIndex].vitals.push(newVitals);

    await patient.save();

    res.status(200).json({
      message: "Vitals recorded successfully",
      vitals: newVitals,
    });
  } catch (error) {
    console.error("Error recording vitals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Record 2-hour follow-up
export const recordFollowUp = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;
    const followUpData = {
      ...req.body,
      nurseId,
      date: new Date().toISOString(),
    };

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add follow-up record
    patient.admissionRecords[admissionIndex].followUps.push(followUpData);

    await patient.save();

    res.status(200).json({
      message: "Follow-up recorded successfully",
      followUp: followUpData,
    });
  } catch (error) {
    console.error("Error recording follow-up:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Record 4-hour follow-up
export const recordFourHourFollowUp = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;
    const followUpData = {
      ...req.body,
      nurseId,
      date: new Date().toISOString(),
    };

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add 4-hour follow-up record
    patient.admissionRecords[admissionIndex].fourHrFollowUpSchema.push(
      followUpData
    );

    await patient.save();

    res.status(200).json({
      message: "4-hour follow-up recorded successfully",
      followUp: followUpData,
    });
  } catch (error) {
    console.error("Error recording 4-hour follow-up:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add note to doctor
export const addNoteToDoctor = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;
    const { note, concernType } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Get nurse name
    const nurse = await mongoose.model("Nurse").findById(nurseId);
    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    // Add note to doctor notes with special tag for nurse notes
    const nurseNote = {
      text: `[NURSE CONCERN: ${concernType}] ${note}`,
      doctorName: nurse.nurseName + " (Nurse)",
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
    };

    patient.admissionRecords[admissionIndex].doctorNotes.push(nurseNote);

    await patient.save();

    res.status(200).json({
      message: "Note to doctor added successfully",
      note: nurseNote,
    });
  } catch (error) {
    console.error("Error adding note to doctor:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create nursing checklist
export const createNursingChecklist = async (req, res) => {
  try {
    const { patientId, admissionId, type, items } = req.body;
    const nurseId = req.userId;

    // Validate type
    if (
      !["SurgeryPrep", "DischargeProtocol", "InfectionControl"].includes(type)
    ) {
      return res.status(400).json({ message: "Invalid checklist type" });
    }

    // Create new checklist
    const newChecklist = new NursingChecklist({
      patientId,
      admissionId,
      type,
      items: items.map((item) => ({ task: item })),
      createdBy: nurseId,
      createdAt: new Date(),
    });

    await newChecklist.save();

    res.status(201).json({
      message: "Nursing checklist created successfully",
      checklist: newChecklist,
    });
  } catch (error) {
    console.error("Error creating nursing checklist:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update checklist item
export const updateChecklistItem = async (req, res) => {
  try {
    const { checklistId, itemId } = req.params;
    const nurseId = req.userId;
    const { isCompleted, notes } = req.body;

    // Find the checklist
    const checklist = await NursingChecklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }

    // Find the specific item
    const itemIndex = checklist.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    // Update the item
    checklist.items[itemIndex].isCompleted = isCompleted;
    checklist.items[itemIndex].notes = notes;
    checklist.items[itemIndex].completedBy = nurseId;
    checklist.items[itemIndex].completedAt = new Date();

    // Check if all items are completed
    const allCompleted = checklist.items.every((item) => item.isCompleted);
    if (allCompleted) {
      checklist.isCompleted = true;
    }

    await checklist.save();

    res.status(200).json({
      message: "Checklist item updated successfully",
      item: checklist.items[itemIndex],
    });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Validate checklist (admin nurse only)
// controllers/patientCare.js (continued)

// Validate checklist (admin nurse only)
export const validateChecklist = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const nurseId = req.userId;

    // Verify if admin nurse
    if (req.usertype !== "nurseadmin") {
      return res
        .status(403)
        .json({ message: "Unauthorized: Admin nurse access required" });
    }

    // Find the checklist
    const checklist = await NursingChecklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found" });
    }

    // Validate checklist
    checklist.validatedBy = nurseId;
    checklist.validatedAt = new Date();

    await checklist.save();

    // Generate PDF report of the checklist
    const htmlContent = generateChecklistHtml(checklist);
    const pdfBuffer = await generatePdf(htmlContent);

    // Upload PDF to Google Drive
    const fileName = `Checklist_${checklist.type}_${
      checklist.patientId
    }_${new Date().toISOString()}.pdf`;
    const folderId = process.env.CHECKLIST_FOLDER_ID; // Set this in your environment variables
    const pdfLink = await uploadToDrive(pdfBuffer, fileName, folderId);

    res.status(200).json({
      message: "Checklist validated successfully",
      checklist,
      pdfLink,
    });
  } catch (error) {
    console.error("Error validating checklist:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to generate HTML for checklist PDF
function generateChecklistHtml(checklist) {
  const completedItems = checklist.items.filter(
    (item) => item.isCompleted
  ).length;
  const totalItems = checklist.items.length;

  let html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333366; }
        .header { margin-bottom: 20px; }
        .checklist-info { margin-bottom: 30px; }
        .checklist-item { margin-bottom: 10px; padding: 10px; border: 1px solid #eee; }
        .completed { background-color: #f0fff0; }
        .pending { background-color: #fff0f0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Nursing Checklist: ${checklist.type}</h1>
      </div>
      
      <div class="checklist-info">
        <p><strong>Patient ID:</strong> ${checklist.patientId}</p>
        <p><strong>Created:</strong> ${new Date(
          checklist.createdAt
        ).toLocaleString()}</p>
        <p><strong>Status:</strong> ${
          checklist.isCompleted ? "Completed" : "In Progress"
        } (${completedItems}/${totalItems} items)</p>
        <p><strong>Validated:</strong> ${
          checklist.validatedAt
            ? new Date(checklist.validatedAt).toLocaleString()
            : "Not yet validated"
        }</p>
      </div>
      
      <h2>Checklist Items:</h2>
  `;

  checklist.items.forEach((item, index) => {
    const status = item.isCompleted ? "completed" : "pending";
    html += `
      <div class="checklist-item ${status}">
        <p><strong>Item ${index + 1}:</strong> ${item.task}</p>
        <p><strong>Status:</strong> ${
          item.isCompleted ? "Completed" : "Pending"
        }</p>
        ${
          item.completedAt
            ? `<p><strong>Completed:</strong> ${new Date(
                item.completedAt
              ).toLocaleString()}</p>`
            : ""
        }
        ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ""}
      </div>
    `;
  });

  html += `
      <div class="footer">
        <p>This document was automatically generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

// Get patient checklists
export const getPatientChecklists = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find all checklists for the patient and admission
    const checklists = await NursingChecklist.find({
      patientId,
      admissionId,
    })
      .populate("createdBy", "nurseName")
      .populate("validatedBy", "nurseName");

    res.status(200).json({ checklists });
  } catch (error) {
    console.error("Error fetching patient checklists:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Record emergency medication (normal nurse)
export const recordEmergencyMedication = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;
    const { medicationName, dosage, reason } = req.body;
    const nurse = await mongoose
      .model("Nurse")
      .findById(nurseId)
      .select("nurseName ")
      .lean();

    // Create emergency medication record
    const emergencyMed = new EmergencyMedication({
      patientId,
      admissionId,
      medicationName,
      dosage,
      administeredBy: nurseId,
      nurseName: nurse.nurseName,
      reason,
      status: "Pending",
    });

    await emergencyMed.save();

    res.status(201).json({
      message: "Emergency medication recorded successfully",
      emergencyMedication: emergencyMed,
    });
  } catch (error) {
    console.error("Error recording emergency medication:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getPatientsForEmergencyMedication = async (req, res) => {
  try {
    const nurseId = req.userId;

    // Find wards where the nurse is assigned
    const assignedWards = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          isActive: true,
        },
      },
    }).select("name");

    if (assignedWards.length === 0) {
      return res.status(200).json({
        message: "No assigned wards found",
        patients: [],
      });
    }

    const wardNames = assignedWards.map((ward) => ward.name);

    // Find sections matching these ward names
    const Section = mongoose.model("Section");
    const sections = await Section.find({ name: { $in: wardNames } });
    const sectionIds = sections.map((section) => section._id);

    // Find patients in these wards/sections
    const patients = await patientSchema
      .find({
        discharged: false,
        "admissionRecords.section.id": { $in: sectionIds },
      })
      .select("patientId name age gender admissionRecords");

    // Format patient data with admission information
    const formattedPatients = patients
      .map((patient) => {
        const currentAdmission =
          patient.admissionRecords[patient.admissionRecords.length - 1];

        // Only include patients with valid sections and bed numbers
        if (
          currentAdmission &&
          currentAdmission.section &&
          currentAdmission.section.name &&
          wardNames.includes(currentAdmission.section.name)
        ) {
          return {
            patientId: patient.patientId,
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            admissionId: currentAdmission._id,
            wardName: currentAdmission.section.name,
            bedNumber: currentAdmission.bedNumber,
            admissionDate: currentAdmission.admissionDate,
            doctor: currentAdmission.doctor,
          };
        }

        return null;
      })
      .filter(Boolean); // Remove null values

    // Sort by ward and bed number
    formattedPatients.sort((a, b) => {
      if (a.wardName === b.wardName) {
        return a.bedNumber - b.bedNumber;
      }
      return a.wardName.localeCompare(b.wardName);
    });

    // Group by ward
    const patientsByWard = {};

    formattedPatients.forEach((patient) => {
      if (!patientsByWard[patient.wardName]) {
        patientsByWard[patient.wardName] = [];
      }

      patientsByWard[patient.wardName].push(patient);
    });

    // Format response
    const wardsWithPatients = Object.keys(patientsByWard).map((wardName) => ({
      wardName,
      patients: patientsByWard[wardName],
    }));

    res.status(200).json({
      wards: wardsWithPatients,
      totalPatients: formattedPatients.length,
    });
  } catch (error) {
    console.error("Error fetching patients for emergency medication:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getWardTreatmentTasks = async (req, res) => {
  try {
    const nurseId = req.userId;
    const { wardName } = req.query;

    // Find all wards where the nurse is assigned
    const assignedWards = await Ward.find({
      "nurseAssignments.nurseId": nurseId,
      "nurseAssignments.isActive": true,
    });

    if (assignedWards.length === 0) {
      return res.status(200).json({
        message: "You are not assigned to any wards",
        wards: [],
        patientCount: 0,
        taskCount: 0,
        treatmentTasks: [],
      });
    }

    // If wardName is specified, filter to just that ward
    let wardsToProcess = assignedWards;
    if (wardName) {
      wardsToProcess = assignedWards.filter((ward) => ward.name === wardName);

      if (wardsToProcess.length === 0) {
        return res.status(403).json({
          message: "You are not assigned to this ward",
        });
      }
    }

    // Get current shift based on time
    const now = new Date();
    const hour = now.getHours();
    let currentShift = "";

    if (hour >= 7 && hour < 15) {
      currentShift = "Morning";
    } else if (hour >= 15 && hour < 23) {
      currentShift = "Evening";
    } else {
      currentShift = "Night";
    }

    // Get the ward names
    const wardNames = wardsToProcess.map((ward) => ward.name);

    // Find sections matching these ward names
    const Section = mongoose.model("Section");
    const sections = await Section.find({ name: { $in: wardNames } });

    // Create a mapping from section name to section ID
    const sectionMap = {};
    sections.forEach((section) => {
      sectionMap[section.name] = section._id;
    });

    // Get all patients in these wards
    const sectionIds = sections.map((section) => section._id);

    // Find patients with debugging info
    console.log(
      "Searching for patients in sections:",
      sectionIds.map((id) => id.toString())
    );

    const patients = await patientSchema.find({
      discharged: false,
      "admissionRecords.section.id": { $in: sectionIds },
    });

    console.log(`Found ${patients.length} patients in assigned wards`);

    // Optional: log patient details for debugging
    patients.forEach((patient) => {
      const admission =
        patient.admissionRecords[patient.admissionRecords.length - 1];
      console.log(
        `Patient: ${patient.name}, Section: ${
          admission?.section?.name
        }, Meds: ${admission?.medications?.length || 0}`
      );
    });

    // Collect all treatment tasks
    const treatmentTasks = [];

    for (const patient of patients) {
      const currentAdmission =
        patient.admissionRecords[patient.admissionRecords.length - 1];

      if (
        currentAdmission &&
        currentAdmission.section &&
        currentAdmission.section.id &&
        sectionIds.some(
          (id) => id.toString() === currentAdmission.section.id.toString()
        )
      ) {
        // Get the ward name for this patient
        const patientWardName = currentAdmission.section.name;

        // Process medications - REMOVED STATUS FILTER
        if (
          currentAdmission.medications &&
          currentAdmission.medications.length > 0
        ) {
          console.log(
            `Processing ${currentAdmission.medications.length} medications for ${patient.name}`
          );

          for (const med of currentAdmission.medications) {
            // Show ALL medications regardless of status
            treatmentTasks.push({
              wardName: patientWardName,
              type: "Medication",
              patientId: patient.patientId,
              patientName: patient.name,
              age: patient.age,
              gender: patient.gender,
              bedNumber: currentAdmission.bedNumber,
              admissionId: currentAdmission._id,
              taskId: med._id || med.id,
              name: med.name,
              details: med.dosage || "",
              status: med.administrationStatus || "Pending",
              date: med.date || "",
              time: med.time || "",
              administeredBy: med.administeredBy || null,
              administeredAt: med.administeredAt || null,
              administrationNotes: med.administrationNotes || "",
            });
          }
        }

        // Process IV fluids - REMOVED STATUS FILTER
        if (currentAdmission.ivFluids && currentAdmission.ivFluids.length > 0) {
          console.log(
            `Processing ${currentAdmission.ivFluids.length} IV fluids for ${patient.name}`
          );

          for (const iv of currentAdmission.ivFluids) {
            // Show ALL IV fluids regardless of status
            treatmentTasks.push({
              wardName: patientWardName,
              type: "IV Fluid",
              patientId: patient.patientId,
              patientName: patient.name,
              age: patient.age,
              gender: patient.gender,
              bedNumber: currentAdmission.bedNumber,
              admissionId: currentAdmission._id,
              taskId: iv._id || iv.id,
              name: iv.name,
              details: `${iv.quantity || ""} ${iv.duration || ""}`,
              status: iv.administrationStatus || "Pending",
              date: iv.date || "",
              time: iv.time || "",
              administeredBy: iv.administeredBy || null,
              administeredAt: iv.administeredAt || null,
              administrationNotes: iv.administrationNotes || "",
            });
          }
        }

        // Process procedures - REMOVED STATUS FILTER
        if (
          currentAdmission.procedures &&
          currentAdmission.procedures.length > 0
        ) {
          console.log(
            `Processing ${currentAdmission.procedures.length} procedures for ${patient.name}`
          );

          for (const proc of currentAdmission.procedures) {
            // Show ALL procedures regardless of status
            treatmentTasks.push({
              wardName: patientWardName,
              type: "Procedure",
              patientId: patient.patientId,
              patientName: patient.name,
              age: patient.age,
              gender: patient.gender,
              bedNumber: currentAdmission.bedNumber,
              admissionId: currentAdmission._id,
              taskId: proc._id || proc.id,
              name: proc.name,
              details: proc.frequency || "",
              status: proc.administrationStatus || "Pending",
              date: proc.date || "",
              time: proc.time || "",
              administeredBy: proc.administeredBy || null,
              administeredAt: proc.administeredAt || null,
              administrationNotes: proc.administrationNotes || "",
            });
          }
        }

        // Process special instructions - REMOVED STATUS FILTER
        if (
          currentAdmission.specialInstructions &&
          currentAdmission.specialInstructions.length > 0
        ) {
          console.log(
            `Processing ${currentAdmission.specialInstructions.length} special instructions for ${patient.name}`
          );

          for (const inst of currentAdmission.specialInstructions) {
            // Show ALL special instructions regardless of status
            treatmentTasks.push({
              wardName: patientWardName,
              type: "Special Instruction",
              patientId: patient.patientId,
              patientName: patient.name,
              age: patient.age,
              gender: patient.gender,
              bedNumber: currentAdmission.bedNumber,
              admissionId: currentAdmission._id,
              taskId: inst._id || inst.id,
              name: "Special Instruction",
              details: inst.instruction || "",
              status: inst.status || "Pending",
              date: inst.date || "",
              time: inst.time || "",
              completedBy: inst.completedBy || null,
              completedAt: inst.completedAt || null,
              completionNotes: inst.completionNotes || "",
            });
          }
        }

        // Process prescriptions (if they're not already covered by medications)
        if (
          currentAdmission.doctorPrescriptions &&
          currentAdmission.doctorPrescriptions.length > 0
        ) {
          console.log(
            `Processing ${currentAdmission.doctorPrescriptions.length} prescriptions for ${patient.name}`
          );

          // You might want to add a special case for doctor prescriptions if needed
          // For now, we'll leave this commented out as medications should already handle these

          /*
          for (const prescription of currentAdmission.doctorPrescriptions) {
            if (prescription.medicine) {
              treatmentTasks.push({
                wardName: patientWardName,
                type: "Prescription",
                patientId: patient.patientId,
                patientName: patient.name,
                age: patient.age,
                gender: patient.gender,
                bedNumber: currentAdmission.bedNumber,
                admissionId: currentAdmission._id,
                taskId: prescription._id,
                name: prescription.medicine.name,
                details: `Morning: ${prescription.medicine.morning}, Afternoon: ${prescription.medicine.afternoon}, Night: ${prescription.medicine.night}`,
                status: "Pending",
                date: prescription.medicine.date ? new Date(prescription.medicine.date).toLocaleDateString() : "",
                time: "",
              });
            }
          }
          */
        }
      }
    }

    console.log(`Total treatment tasks found: ${treatmentTasks.length}`);

    // Sort tasks by ward, bed number and then by type
    treatmentTasks.sort((a, b) => {
      // First sort by ward name
      if (a.wardName !== b.wardName) {
        return a.wardName.localeCompare(b.wardName);
      }

      // Then by bed number
      if (a.bedNumber !== b.bedNumber) {
        return a.bedNumber - b.bedNumber;
      }

      // Then by type
      const typeOrder = {
        Medication: 1,
        "IV Fluid": 2,
        Procedure: 3,
        "Special Instruction": 4,
        Prescription: 5,
      };

      return typeOrder[a.type] - typeOrder[b.type];
    });

    // Group tasks by ward
    const tasksByWard = {};
    wardNames.forEach((name) => {
      tasksByWard[name] = [];
    });

    treatmentTasks.forEach((task) => {
      if (tasksByWard[task.wardName]) {
        tasksByWard[task.wardName].push(task);
      }
    });

    // Prepare ward data including patients count and task count
    const wardsData = wardNames.map((name) => {
      const wardTasks = tasksByWard[name] || [];
      const wardPatients = new Set(wardTasks.map((task) => task.patientId));

      return {
        wardName: name,
        patientCount: wardPatients.size,
        taskCount: wardTasks.length,
        treatmentTasks: wardTasks,
      };
    });

    // Prepare response based on whether a specific ward was requested
    if (wardName) {
      // Return data for just the requested ward
      const wardData = wardsData.find((w) => w.wardName === wardName);

      if (wardData) {
        return res.status(200).json(wardData);
      } else {
        return res.status(404).json({ message: "Ward not found" });
      }
    } else {
      // Return data for all wards
      return res.status(200).json({
        currentShift,
        assignedWards: wardNames,
        totalPatients: patients.length,
        totalTasks: treatmentTasks.length,
        wards: wardsData,
      });
    }
  } catch (error) {
    console.error("Error getting ward treatment tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const markMedicationAdministered = async (req, res) => {
  try {
    const { patientId, admissionId, medicationId } = req.params;
    const nurseId = req.userId;
    const { notes } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find the medication
    const medicationIndex = patient.admissionRecords[
      admissionIndex
    ].medications.findIndex(
      (med) =>
        (med._id && med._id.toString() === medicationId) ||
        (med.id && med.id.toString() === medicationId)
    );

    if (medicationIndex === -1) {
      return res.status(404).json({ message: "Medication not found" });
    }

    // Update the medication with administration details
    const medication =
      patient.admissionRecords[admissionIndex].medications[medicationIndex];

    // If medication schema doesn't have these fields, we need to modify it
    // For now, let's add the tracking info to the existing object
    if (!medication.administrationStatus) {
      // Ensure the medication is an object we can modify
      if (typeof medication.toObject === "function") {
        patient.admissionRecords[admissionIndex].medications[medicationIndex] =
          {
            ...medication.toObject(),
            administrationStatus: "Administered",
            administeredBy: nurseId,
            administeredAt: new Date(),
            administrationNotes: notes || "",
          };
      } else {
        // It's already a plain object
        medication.administrationStatus = "Administered";
        medication.administeredBy = nurseId;
        medication.administeredAt = new Date();
        medication.administrationNotes = notes || "";
      }
    } else {
      // Fields already exist, just update them
      medication.administrationStatus = "Administered";
      medication.administeredBy = nurseId;
      medication.administeredAt = new Date();
      medication.administrationNotes = notes || "";
    }

    // Update vital sign markers if medication has specific markers
    if (medication.vitalSignCheck) {
      // This would be a good place to record a vital sign check
      // (implementing this is optional based on your requirements)
    }

    // Save the patient record
    await patient.save();

    // Get nurse info for the response
    const nurse = await mongoose.model("Nurse").findById(nurseId);

    res.status(200).json({
      message: "Medication marked as administered successfully",
      medication: {
        ...(medication.toObject ? medication.toObject() : medication),
        administeredByName: nurse ? nurse.nurseName : "Unknown",
      },
    });
  } catch (error) {
    console.error("Error marking medication as administered:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark IV fluid as administered
export const markIVFluidAdministered = async (req, res) => {
  try {
    const { patientId, admissionId, ivFluidId } = req.params;
    const nurseId = req.userId;
    const { notes } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find the IV fluid
    const ivFluidIndex = patient.admissionRecords[
      admissionIndex
    ].ivFluids.findIndex(
      (iv) =>
        (iv._id && iv._id.toString() === ivFluidId) ||
        (iv.id && iv.id.toString() === ivFluidId)
    );

    if (ivFluidIndex === -1) {
      return res.status(404).json({ message: "IV fluid not found" });
    }

    // Update the IV fluid with administration details
    const ivFluid =
      patient.admissionRecords[admissionIndex].ivFluids[ivFluidIndex];

    // Add administration tracking if not present
    if (!ivFluid.administrationStatus) {
      // Ensure the IV fluid is an object we can modify
      if (typeof ivFluid.toObject === "function") {
        patient.admissionRecords[admissionIndex].ivFluids[ivFluidIndex] = {
          ...ivFluid.toObject(),
          administrationStatus: "Administered",
          administeredBy: nurseId,
          administeredAt: new Date(),
          administrationNotes: notes || "",
        };
      } else {
        // It's already a plain object
        ivFluid.administrationStatus = "Administered";
        ivFluid.administeredBy = nurseId;
        ivFluid.administeredAt = new Date();
        ivFluid.administrationNotes = notes || "";
      }
    } else {
      // Fields already exist, just update them
      ivFluid.administrationStatus = "Administered";
      ivFluid.administeredBy = nurseId;
      ivFluid.administeredAt = new Date();
      ivFluid.administrationNotes = notes || "";
    }

    // Save the patient record
    await patient.save();

    // Get nurse info for the response
    const nurse = await mongoose.model("Nurse").findById(nurseId);

    res.status(200).json({
      message: "IV fluid marked as administered successfully",
      ivFluid: {
        ...(ivFluid.toObject ? ivFluid.toObject() : ivFluid),
        administeredByName: nurse ? nurse.nurseName : "Unknown",
      },
    });
  } catch (error) {
    console.error("Error marking IV fluid as administered:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark procedure as completed
export const markProcedureCompleted = async (req, res) => {
  try {
    const { patientId, admissionId, procedureId } = req.params;
    const nurseId = req.userId;
    const { notes } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find the procedure
    const procedureIndex = patient.admissionRecords[
      admissionIndex
    ].procedures.findIndex(
      (proc) =>
        (proc._id && proc._id.toString() === procedureId) ||
        (proc.id && proc.id.toString() === procedureId)
    );

    if (procedureIndex === -1) {
      return res.status(404).json({ message: "Procedure not found" });
    }

    // Update the procedure with completion details
    const procedure =
      patient.admissionRecords[admissionIndex].procedures[procedureIndex];

    // Add completion tracking if not present
    if (!procedure.administrationStatus) {
      // Ensure the procedure is an object we can modify
      if (typeof procedure.toObject === "function") {
        patient.admissionRecords[admissionIndex].procedures[procedureIndex] = {
          ...procedure.toObject(),
          administrationStatus: "Completed",
          administeredBy: nurseId,
          administeredAt: new Date(),
          administrationNotes: notes || "",
        };
      } else {
        // It's already a plain object
        procedure.administrationStatus = "Completed";
        procedure.administeredBy = nurseId;
        procedure.administeredAt = new Date();
        procedure.administrationNotes = notes || "";
      }
    } else {
      // Fields already exist, just update them
      procedure.administrationStatus = "Completed";
      procedure.administeredBy = nurseId;
      procedure.administeredAt = new Date();
      procedure.administrationNotes = notes || "";
    }

    // Save the patient record
    await patient.save();

    // Get nurse info for the response
    const nurse = await mongoose.model("Nurse").findById(nurseId);

    res.status(200).json({
      message: "Procedure marked as completed successfully",
      procedure: {
        ...(procedure.toObject ? procedure.toObject() : procedure),
        administeredByName: nurse ? nurse.nurseName : "Unknown",
      },
    });
  } catch (error) {
    console.error("Error marking procedure as completed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark special instruction as completed
export const markInstructionCompleted = async (req, res) => {
  try {
    const { patientId, admissionId, instructionId } = req.params;
    const nurseId = req.userId;
    const { notes } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find the special instruction
    const instructionIndex = patient.admissionRecords[
      admissionIndex
    ].specialInstructions.findIndex(
      (inst) =>
        (inst._id && inst._id.toString() === instructionId) ||
        (inst.id && inst.id.toString() === instructionId)
    );

    if (instructionIndex === -1) {
      return res.status(404).json({ message: "Special instruction not found" });
    }

    // Update the instruction with completion details
    const instruction =
      patient.admissionRecords[admissionIndex].specialInstructions[
        instructionIndex
      ];

    // Add completion tracking if not present
    if (!instruction.status) {
      // Ensure the instruction is an object we can modify
      if (typeof instruction.toObject === "function") {
        patient.admissionRecords[admissionIndex].specialInstructions[
          instructionIndex
        ] = {
          ...instruction.toObject(),
          status: "Completed",
          completedBy: nurseId,
          completedAt: new Date(),
          completionNotes: notes || "",
        };
      } else {
        // It's already a plain object
        instruction.status = "Completed";
        instruction.completedBy = nurseId;
        instruction.completedAt = new Date();
        instruction.completionNotes = notes || "";
      }
    } else {
      // Fields already exist, just update them
      instruction.status = "Completed";
      instruction.completedBy = nurseId;
      instruction.completedAt = new Date();
      instruction.completionNotes = notes || "";
    }

    // Save the patient record
    await patient.save();

    // Get nurse info for the response
    const nurse = await mongoose.model("Nurse").findById(nurseId);

    res.status(200).json({
      message: "Special instruction marked as completed successfully",
      instruction: {
        ...(instruction.toObject ? instruction.toObject() : instruction),
        completedByName: nurse ? nurse.nurseName : "Unknown",
      },
    });
  } catch (error) {
    console.error("Error marking special instruction as completed:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllEmergencyMedications = async (req, res) => {
  try {
    // Check if admin nurse
    // if (req.usertype !== "nurseadmin") {
    //   return res.status(403).json({
    //     message: "Unauthorized: Admin nurse access required",
    //   });
    // }

    // Get filter parameters
    const { status, date } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.administeredAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Get emergency medications with nurse info
    const medications = await EmergencyMedication.find(query)
      .populate("administeredBy", "nurseName email")
      .populate("reviewedBy", "nurseName email")
      .sort({ administeredAt: -1 });

    // Fetch patient info for each medication
    const enhancedMedications = [];

    for (const medication of medications) {
      const patient = await patientSchema.findOne({
        patientId: medication.patientId,
      });

      if (patient) {
        const admission = patient.admissionRecords.find(
          (record) =>
            record._id.toString() === medication.admissionId.toString()
        );

        enhancedMedications.push({
          ...medication.toObject(),
          doctorApproved: medication.doctorApproval?.approved || false,
          patient: {
            patientId: patient.patientId,
            name: patient.name,
            gender: patient.gender,
            age: patient.age,
          },
          ward: admission ? admission.section.name : "Unknown",
          bedNumber: admission ? admission.bedNumber : "Unknown",
        });
      } else {
        enhancedMedications.push({
          ...medication.toObject(),
          doctorApproved: medication.doctorApproval?.approved || false,
        });
      }
    }

    res.status(200).json({
      count: enhancedMedications.length,
      medications: enhancedMedications,
    });
  } catch (error) {
    console.error("Error fetching emergency medications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Review emergency medication (admin nurse only)
export const reviewEmergencyMedication = async (req, res) => {
  try {
    const { medicationId } = req.params;
    // const nurseId = req.userId;
    const { status, justification } = req.body;

    // Verify if admin nurse
    // if (req.usertype !== "nurseadmin") {
    //   return res
    //     .status(403)
    //     .json({ message: "Unauthorized: Admin nurse access required" });
    // }

    // Validate status
    if (!["Approved", "Rejected", "PendingDoctorApproval"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find the medication record
    const medication = await EmergencyMedication.findById(medicationId);
    if (!medication) {
      return res
        .status(404)
        .json({ message: "Emergency medication record not found" });
    }

    // Update medication status
    medication.status = status;
    // medication.reviewedBy = nurseId;
    medication.reviewedAt = new Date();

    if (justification) {
      medication.justification = justification;
    }

    await medication.save();

    // If approved, add to patient's medication record
    if (
      status === "Approved" &&
      medication.doctorApproval &&
      medication.doctorApproval.approved === true
    ) {
      const patient = await patientSchema.findOne({
        patientId: medication.patientId,
      });
      if (patient) {
        const admissionIndex = patient.admissionRecords.findIndex(
          (record) =>
            record._id.toString() === medication.admissionId.toString()
        );

        if (admissionIndex !== -1) {
          // Add to medications with emergency flag
          patient.admissionRecords[admissionIndex].medications.push({
            name: medication.medicationName,
            dosage: medication.dosage,
            type: "Emergency",
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
          });

          await patient.save();
        }
      }
    }

    res.status(200).json({
      message: "Emergency medication reviewed successfully",
      medication,
    });
  } catch (error) {
    console.error("Error reviewing emergency medication:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get emergency medications for patient
export const getEmergencyMedications = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find all emergency medications for the patient and admission
    const medications = await EmergencyMedication.find({
      patientId,
      admissionId,
    })
      .populate("administeredBy", "nurseName")
      .populate("reviewedBy", "nurseName");

    // Add doctor approval status to each medication
    const medicationsWithApproval = medications.map((medication) => ({
      ...medication.toObject(),
      doctorApproved: medication.doctorApproval?.approved || false,
    }));

    res.status(200).json({ medications: medicationsWithApproval });
  } catch (error) {
    console.error("Error fetching emergency medications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get patients requiring discharge coordination
export const getPatientsForDischarge = async (req, res) => {
  try {
    const nurseId = req.userId;

    // Find wards where the nurse is assigned
    const assignedWards = await Ward.find({
      nurseAssignments: {
        $elemMatch: {
          nurseId: nurseId,
          isActive: true,
        },
      },
    }).select("_id");

    if (assignedWards.length === 0) {
      return res.status(404).json({ message: "No assigned wards found" });
    }

    const wardIds = assignedWards.map((ward) => ward._id);

    // Find patients marked for discharge by doctors but not yet completed by nurses
    const patients = await patientSchema.find({
      discharged: false,
      "admissionRecords.section.id": { $in: wardIds },
      "admissionRecords.conditionAtDischarge": { $ne: null }, // Doctor has set discharge condition
    });

    // Filter and format patient data for discharge coordination
    const dischargePatients = patients
      .filter((patient) => {
        const currentAdmission =
          patient.admissionRecords[patient.admissionRecords.length - 1];
        // Check if doctor has set discharge condition but nurse hasn't confirmed
        return (
          currentAdmission.conditionAtDischarge &&
          !currentAdmission.ipdDetailsUpdated
        );
      })
      .map((patient) => {
        const currentAdmission =
          patient.admissionRecords[patient.admissionRecords.length - 1];

        return {
          patientId: patient.patientId,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          admissionId: currentAdmission._id,
          bedNumber: currentAdmission.bedNumber,
          section: currentAdmission.section,
          admissionDate: currentAdmission.admissionDate,
          doctor: currentAdmission.doctor,
          conditionAtDischarge: currentAdmission.conditionAtDischarge,
        };
      });

    res.status(200).json({ dischargePatients });
  } catch (error) {
    console.error("Error fetching patients for discharge:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Complete nurse discharge process
export const completeNurseDischarge = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const nurseId = req.userId;
    const { notes } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission
    const admissionIndex = patient.admissionRecords.findIndex(
      (record) => record._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Mark as processed by nurse
    patient.admissionRecords[admissionIndex].ipdDetailsUpdated = true;

    // Add nurse note about discharge
    const nurse = await mongoose.model("Nurse").findById(nurseId);

    if (nurse) {
      patient.admissionRecords[admissionIndex].doctorNotes.push({
        text: `[NURSE DISCHARGE] ${
          notes ||
          "Nursing discharge process completed. Patient is ready for final discharge."
        }`,
        doctorName: nurse.nurseName + " (Nurse)",
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
      });
    }

    await patient.save();

    res.status(200).json({
      message: "Nurse discharge process completed successfully",
      patientId,
      admissionId,
    });
  } catch (error) {
    console.error("Error completing nurse discharge:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// controllers/nurseAttendance.js

// Hospital location and attendance settings
const HOSPITAL_LOCATION = {
  latitude: process.env.HOSPITAL_LATITUDE || 19.076, // Default values (should be set in env)
  longitude: process.env.HOSPITAL_LONGITUDE || 72.8777,
  radius: process.env.ATTENDANCE_RADIUS || 200, // in meters
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check in
export const checkIn = async (req, res) => {
  try {
    const nurseId = req.userId;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location data is required" });
    }

    // Calculate distance from hospital
    const distance = calculateDistance(
      HOSPITAL_LOCATION.latitude,
      HOSPITAL_LOCATION.longitude,
      latitude,
      longitude
    );

    const isWithinRadius = distance <= HOSPITAL_LOCATION.radius;

    // Get today's date (without time)
    const today = moment().startOf("day").toDate();

    // Check if an attendance record for today already exists
    let attendance = await NurseAttendance.findOne({
      nurseId,
      date: {
        $gte: today,
        $lt: moment(today).add(1, "days").toDate(),
      },
    });

    if (attendance && attendance.checkIn.time) {
      return res.status(409).json({
        message: "You have already checked in today",
        attendance,
      });
    }

    const now = new Date();

    // Create or update attendance record
    if (!attendance) {
      attendance = new NurseAttendance({
        nurseId,
        date: now,
        checkIn: {
          time: now,
          latitude,
          longitude,
          isWithinRadius,
        },
        status: isWithinRadius ? "Present" : "Absent",
        notes: isWithinRadius
          ? "Checked in successfully"
          : "Location verification failed",
      });
    } else {
      attendance.checkIn = {
        time: now,
        latitude,
        longitude,
        isWithinRadius,
      };
      attendance.status = isWithinRadius ? "Present" : "Absent";
      attendance.notes = isWithinRadius
        ? "Checked in successfully"
        : "Location verification failed";
    }

    await attendance.save();

    res.status(200).json({
      message: isWithinRadius
        ? "Check-in successful"
        : "Check-in recorded but you are not within hospital premises",
      attendance,
      distance: Math.round(distance),
      isWithinRadius,
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "date" } = req.query;

    // Parse and set default date range (if not provided)
    const start = startDate ? new Date(startDate) : new Date("2000-01-01");
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    if (!["date", "nurse", "status", "day", "month"].includes(groupBy)) {
      return res.status(400).json({
        message:
          "Invalid groupBy parameter. Must be one of: date, nurse, status, day, month",
      });
    }

    const filter = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    let pipeline = [];

    pipeline.push({ $match: filter });

    pipeline.push({
      $lookup: {
        from: "nurses",
        localField: "nurseId",
        foreignField: "_id",
        as: "nurseInfo",
      },
    });

    pipeline.push({ $unwind: "$nurseInfo" });

    if (groupBy === "date") {
      pipeline.push({
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalRecords: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          halfDay: {
            $sum: { $cond: [{ $eq: ["$status", "Half-Day"] }, 1, 0] },
          },
          totalHours: { $sum: { $ifNull: ["$totalHours", 0] } },
          records: { $push: "$$ROOT" },
        },
      });
    } else if (groupBy === "nurse") {
      pipeline.push({
        $group: {
          _id: "$nurseId",
          nurseName: { $first: "$nurseInfo.nurseName" },
          email: { $first: "$nurseInfo.email" },
          usertype: { $first: "$nurseInfo.usertype" },
          totalRecords: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          halfDay: {
            $sum: { $cond: [{ $eq: ["$status", "Half-Day"] }, 1, 0] },
          },
          totalHours: { $sum: { $ifNull: ["$totalHours", 0] } },
          averageHours: { $avg: { $ifNull: ["$totalHours", 0] } },
        },
      });
    } else if (groupBy === "status") {
      pipeline.push({
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          nurses: { $addToSet: "$nurseInfo.nurseName" },
          totalHours: { $sum: { $ifNull: ["$totalHours", 0] } },
          averageHours: { $avg: { $ifNull: ["$totalHours", 0] } },
        },
      });
    } else if (groupBy === "day") {
      pipeline.push({
        $group: {
          _id: { $dayOfWeek: "$date" },
          totalRecords: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          halfDay: {
            $sum: { $cond: [{ $eq: ["$status", "Half-Day"] }, 1, 0] },
          },
          totalHours: { $sum: { $ifNull: ["$totalHours", 0] } },
        },
      });

      pipeline.push({
        $project: {
          _id: 0,
          day: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", 1] }, then: "Sunday" },
                { case: { $eq: ["$_id", 2] }, then: "Monday" },
                { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
                { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
                { case: { $eq: ["$_id", 5] }, then: "Thursday" },
                { case: { $eq: ["$_id", 6] }, then: "Friday" },
                { case: { $eq: ["$_id", 7] }, then: "Saturday" },
              ],
              default: "Unknown",
            },
          },
          dayNumber: "$_id",
          totalRecords: 1,
          present: 1,
          absent: 1,
          late: 1,
          halfDay: 1,
          totalHours: 1,
        },
      });
    } else if (groupBy === "month") {
      pipeline.push({
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalRecords: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
          halfDay: {
            $sum: { $cond: [{ $eq: ["$status", "Half-Day"] }, 1, 0] },
          },
          totalHours: { $sum: { $ifNull: ["$totalHours", 0] } },
        },
      });

      pipeline.push({
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          monthName: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id.month", 1] }, then: "January" },
                { case: { $eq: ["$_id.month", 2] }, then: "February" },
                { case: { $eq: ["$_id.month", 3] }, then: "March" },
                { case: { $eq: ["$_id.month", 4] }, then: "April" },
                { case: { $eq: ["$_id.month", 5] }, then: "May" },
                { case: { $eq: ["$_id.month", 6] }, then: "June" },
                { case: { $eq: ["$_id.month", 7] }, then: "July" },
                { case: { $eq: ["$_id.month", 8] }, then: "August" },
                { case: { $eq: ["$_id.month", 9] }, then: "September" },
                { case: { $eq: ["$_id.month", 10] }, then: "October" },
                { case: { $eq: ["$_id.month", 11] }, then: "November" },
                { case: { $eq: ["$_id.month", 12] }, then: "December" },
              ],
              default: "Unknown",
            },
          },
          yearMonth: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: {
                  if: { $lt: ["$_id.month", 10] },
                  then: { $concat: ["0", { $toString: "$_id.month" }] },
                  else: { $toString: "$_id.month" },
                },
              },
            ],
          },
          totalRecords: 1,
          present: 1,
          absent: 1,
          late: 1,
          halfDay: 1,
          totalHours: 1,
        },
      });
    }

    // Sort
    if (groupBy === "date" || groupBy === "month") {
      pipeline.push({ $sort: { _id: 1 } });
    } else if (groupBy === "nurse") {
      pipeline.push({ $sort: { nurseName: 1 } });
    } else if (groupBy === "status") {
      pipeline.push({ $sort: { _id: 1 } });
    } else if (groupBy === "day") {
      pipeline.push({ $sort: { dayNumber: 1 } });
    }

    const results = await NurseAttendance.aggregate(pipeline);

    const overallStats = {
      totalRecords: await NurseAttendance.countDocuments(filter),
      present: await NurseAttendance.countDocuments({
        ...filter,
        status: "Present",
      }),
      absent: await NurseAttendance.countDocuments({
        ...filter,
        status: "Absent",
      }),
      late: await NurseAttendance.countDocuments({
        ...filter,
        status: "Late",
      }),
      halfDay: await NurseAttendance.countDocuments({
        ...filter,
        status: "Half-Day",
      }),
    };

    return res.status(200).json({
      message: "Attendance summary fetched successfully",
      overallStats,
      data: results,
    });
  } catch (error) {
    console.error("Error in getAttendanceSummary:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Check out
export const checkOut = async (req, res) => {
  console.log("Check out request received");
  try {
    const nurseId = req.userId;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Location data is required" });
    }

    // Calculate distance from hospital
    const distance = calculateDistance(
      HOSPITAL_LOCATION.latitude,
      HOSPITAL_LOCATION.longitude,
      latitude,
      longitude
    );

    const isWithinRadius = distance <= HOSPITAL_LOCATION.radius;

    // Get today's date (without time)
    const today = moment().startOf("day").toDate();

    // Find today's attendance record
    const attendance = await NurseAttendance.findOne({
      nurseId,
      date: {
        $gte: today,
        $lt: moment(today).add(1, "days").toDate(),
      },
    });

    if (!attendance || !attendance.checkIn.time) {
      return res
        .status(404)
        .json({ message: "No check-in record found for today" });
    }

    const now = new Date();

    // Calculate hours worked
    const checkInTime = new Date(attendance.checkIn.time);
    const hoursWorked = (now - checkInTime) / (1000 * 60 * 60);

    // Update attendance record with check-out info
    attendance.checkOut = {
      time: now,
      latitude,
      longitude,
      isWithinRadius,
    };

    attendance.totalHours = parseFloat(hoursWorked.toFixed(2));

    // Determine status based on hours worked
    if (attendance.status === "Present") {
      if (hoursWorked < 4) {
        attendance.status = "Absent";
      } else if (hoursWorked < 6) {
        attendance.status = "Half-Day";
      }
    }

    attendance.notes += isWithinRadius
      ? " | Checked out successfully"
      : " | Checked out but not within hospital premises";

    await attendance.save();

    res.status(200).json({
      message: "Check-out successful",
      attendance,
      hoursWorked: attendance.totalHours,
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get attendance history (for self)
export const getMyAttendance = async (req, res) => {
  try {
    const nurseId = req.userId;
    const { month, year } = req.query;

    let startDate, endDate;

    if (month && year) {
      // If month and year provided, get attendance for that month
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const attendance = await NurseAttendance.find({
      nurseId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ date: -1 });

    // Calculate summary
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter((a) => a.status === "Present").length,
      halfDay: attendance.filter((a) => a.status === "Half-Day").length,
      absent: attendance.filter((a) => a.status === "Absent").length,
      late: attendance.filter((a) => a.status === "Late").length,
      totalHours: attendance.reduce((sum, a) => sum + (a.totalHours || 0), 0),
    };

    res.status(200).json({
      attendance,
      summary,
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get staff attendance (admin nurse only)
export const getStaffAttendance = async (req, res) => {
  try {
    // Verify if admin nurse
    // if (req.usertype !== "nurseadmin") {
    //   return res
    //     .status(403)
    //     .json({ message: "Unauthorized: Admin nurse access required" });
    // }

    const { date, nurseId } = req.query;

    let query = {};

    if (nurseId) {
      query.nurseId = nurseId;
    }

    if (date) {
      const selectedDate = new Date(date);
      query.date = {
        $gte: moment(selectedDate).startOf("day").toDate(),
        $lt: moment(selectedDate).add(1, "days").toDate(),
      };
    } else {
      // Default to today
      const today = moment().startOf("day").toDate();
      query.date = {
        $gte: today,
        $lt: moment(today).add(1, "days").toDate(),
      };
    }

    const attendance = await NurseAttendance.find(query)
      .populate("nurseId", "nurseName email usertype")
      .sort({ date: -1 });

    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching staff attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark attendance manually (admin nurse only)

export const markAttendanceManually = async (req, res) => {
  try {
    // Verify if admin nurse
    // if (req.usertype !== "nurseadmin") {
    //   return res
    //     .status(403)
    //     .json({ message: "Unauthorized: Admin nurse access required" });
    // }

    const { nurseId, date, status, notes, checkInTime } = req.body;

    if (!nurseId || !date || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate status
    if (!["Present", "Absent", "Half-Day", "Late"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const attendanceDate = new Date(date);

    // Check if an attendance record already exists
    let attendance = await NurseAttendance.findOne({
      nurseId,
      date: {
        $gte: moment(attendanceDate).startOf("day").toDate(),
        $lt: moment(attendanceDate).add(1, "days").toDate(),
      },
    });

    // Determine check-in time based on status
    let checkInDateTime = null;
    if (status !== "Absent") {
      if (checkInTime) {
        // Use provided check-in time
        checkInDateTime = new Date(checkInTime);
      } else {
        // Auto-generate check-in time based on status
        checkInDateTime = new Date(attendanceDate);

        switch (status) {
          case "Present":
            checkInDateTime.setHours(9, 0, 0, 0); // 9:00 AM
            break;
          case "Late":
            checkInDateTime.setHours(9, 30, 0, 0); // 9:30 AM (30 minutes late)
            break;
          case "Half-Day":
            checkInDateTime.setHours(13, 0, 0, 0); // 1:00 PM (afternoon shift)
            break;
          default:
            checkInDateTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
        }
      }
    }

    if (attendance) {
      // Update existing record
      attendance.status = status;
      if (notes) attendance.notes = notes;

      // Add or update check-in time for non-absent status
      if (status !== "Absent" && checkInDateTime) {
        attendance.checkIn = {
          time: checkInDateTime,
          latitude: null, // Admin entry doesn't require location
          longitude: null,
          isWithinRadius: true, // Assume valid for admin entries
        };
      } else if (status === "Absent") {
        // Remove check-in for absent status
        attendance.checkIn = undefined;
      }
    } else {
      // Create new record
      const newAttendanceData = {
        nurseId,
        date: attendanceDate,
        status,
        notes: notes || `Attendance marked manually by admin as ${status}`,
      };

      // Add check-in time for non-absent status
      if (status !== "Absent" && checkInDateTime) {
        newAttendanceData.checkIn = {
          time: checkInDateTime,
          latitude: null,
          longitude: null,
          isWithinRadius: true,
        };
      }

      attendance = new NurseAttendance(newAttendanceData);
    }

    // Add admin tracking to notes
    const adminNote = `Attendance marked manually by admin at ${new Date().toISOString()}`;
    if (checkInDateTime && status !== "Absent") {
      const timeNote = checkInTime
        ? `Check-in time set by admin: ${checkInDateTime.toISOString()}`
        : `Check-in time auto-generated based on status (${status}): ${checkInDateTime.toISOString()}`;

      attendance.notes = attendance.notes
        ? `${attendance.notes} | ${adminNote} | ${timeNote}`
        : `${adminNote} | ${timeNote}`;
    } else {
      attendance.notes = attendance.notes
        ? `${attendance.notes} | ${adminNote}`
        : adminNote;
    }

    await attendance.save();

    // Prepare response data
    const responseData = {
      attendanceId: attendance._id,
      nurseId: attendance.nurseId,
      date: attendance.date,
      status: attendance.status,
      checkIn: attendance.checkIn,
      notes: attendance.notes,
      wasCheckInAutoGenerated: !checkInTime && status !== "Absent",
      checkInTimeGenerated: checkInDateTime,
    };

    res.status(200).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error marking attendance manually:", error);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid ID format provided",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};
const calculateTotalHours = (checkInTime, checkOutTime) => {
  const diffMs = checkOutTime.getTime() - checkInTime.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
};

const determineAttendanceStatus = (totalHours, currentStatus) => {
  if (totalHours >= 8) {
    return "Present";
  } else if (totalHours >= 4) {
    return "Half-Day";
  } else if (currentStatus === "Late" && totalHours >= 6) {
    return "Late"; // Maintain late status but acknowledge partial completion
  }
  return currentStatus; // Keep existing status if conditions aren't met
};
export const markCheckOutManually = async (req, res) => {
  try {
    const { nurseId, date, checkOutTime, checkInTime, notes } = req.body;

    // Input validation
    if (!nurseId || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        errors: {
          nurseId: !nurseId ? "Nurse ID is required" : null,
          date: !date ? "Date is required" : null,
        },
      });
    }

    // Verify nurse exists
    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: "Nurse not found",
      });
    }

    const attendanceDate = new Date(date);
    const checkOutDateTime = checkOutTime ? new Date(checkOutTime) : new Date();

    // Find attendance record for the specified date
    let attendance = await NurseAttendance.findOne({
      nurseId,
      date: {
        $gte: moment(attendanceDate).startOf("day").toDate(),
        $lt: moment(attendanceDate).add(1, "days").toDate(),
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message:
          "No attendance record found for this date. Please ensure check-in exists first.",
      });
    }

    // Handle missing check-in time
    if (!attendance.checkIn || !attendance.checkIn.time) {
      let checkInDateTime;

      if (checkInTime) {
        // Use provided check-in time
        checkInDateTime = new Date(checkInTime);
      } else {
        // Use default check-in time (9:00 AM)
        checkInDateTime = new Date(attendanceDate);
        checkInDateTime.setHours(9, 0, 0, 0);
      }

      // Validate check-in time is before check-out time
      if (checkInDateTime >= checkOutDateTime) {
        return res.status(400).json({
          success: false,
          message: "Check-in time must be before check-out time",
        });
      }

      // Create check-in record
      attendance.checkIn = {
        time: checkInDateTime,
        latitude: null,
        longitude: null,
        isWithinRadius: true,
      };

      // Add note about check-in creation
      const checkInNote = checkInTime
        ? `Check-in time set by admin during check-out process`
        : `Check-in time auto-generated (9:00 AM) for manually marked attendance`;

      attendance.notes = attendance.notes
        ? `${attendance.notes} | ${checkInNote}`
        : checkInNote;
    }

    // Check if already checked out
    if (attendance.checkOut && attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: "Nurse has already checked out for this date",
        data: {
          existingCheckOut: attendance.checkOut.time,
          totalHours: attendance.totalHours,
        },
      });
    }

    // Validate check-out time is after check-in time
    if (checkOutDateTime <= attendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: "Check-out time must be after check-in time",
      });
    }

    // Calculate total working hours
    const totalHours = calculateTotalHours(
      attendance.checkIn.time,
      checkOutDateTime
    );

    // Determine final attendance status based on hours worked
    const finalStatus = determineAttendanceStatus(
      totalHours,
      attendance.status
    );

    // Update attendance record with check-out information
    attendance.checkOut = {
      time: checkOutDateTime,
      latitude: null,
      longitude: null,
      isWithinRadius: true,
    };
    attendance.totalHours = totalHours;
    attendance.status = finalStatus;

    // Update notes
    const adminNote = `Check-out marked manually by admin at ${new Date().toISOString()}`;
    if (notes) {
      attendance.notes = attendance.notes
        ? `${attendance.notes} | ${adminNote} | Admin note: ${notes}`
        : `${adminNote} | Admin note: ${notes}`;
    } else {
      attendance.notes = attendance.notes
        ? `${attendance.notes} | ${adminNote}`
        : adminNote;
    }

    await attendance.save();

    // Prepare response data
    const responseData = {
      attendanceId: attendance._id,
      nurse: {
        id: nurse._id,
        name: nurse.name,
        employeeId: nurse.employeeId || nurse._id,
      },
      date: attendanceDate,
      checkIn: {
        time: attendance.checkIn.time,
        wasAutoGenerated:
          !checkInTime &&
          (!attendance.checkIn.time ||
            attendance.checkIn.time.getHours() === 9),
      },
      checkOut: {
        time: checkOutDateTime,
        markedBy: "admin",
      },
      shift: {
        totalHours,
        status: finalStatus,
        previousStatus:
          attendance.status !== finalStatus ? attendance.status : null,
      },
      notes: attendance.notes,
    };

    res.status(200).json({
      success: true,
      message: `Check-out marked successfully for ${nurse.name}. Total hours: ${totalHours}`,
      data: responseData,
    });
  } catch (error) {
    console.error("Error marking check-out manually:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {}),
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format provided",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while marking check-out",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const getAllActivePatients = async (req, res) => {
  try {
    // const nurseId = req.userId; // From auth middleware

    // Simple query - just get all active patients
    const matchQuery = {
      discharged: false,
      "admissionRecords.0": { $exists: true }, // Has at least one active admission
      "admissionRecords.status": "admitted", // Only patients with admitted status
    };

    const patients = await patientSchema.aggregate([
      { $match: matchQuery },
      {
        $project: {
          patientId: 1,
          name: 1,
          age: 1,
          gender: 1,
          contact: 1,
          imageUrl: 1,
          pendingAmount: 1,
          currentAdmission: { $arrayElemAt: ["$admissionRecords", -1] }, // Get latest admission
          totalAdmissions: { $size: "$admissionRecords" },
        },
      },
      {
        $project: {
          patientId: 1,
          name: 1,
          age: 1,
          gender: 1,
          contact: 1,
          imageUrl: 1,
          pendingAmount: 1,
          totalAdmissions: 1,
          currentAdmission: {
            _id: "$currentAdmission._id",
            admissionDate: "$currentAdmission.admissionDate",
            reasonForAdmission: "$currentAdmission.reasonForAdmission",
            doctor: "$currentAdmission.doctor",
            section: "$currentAdmission.section",
            bedNumber: "$currentAdmission.bedNumber",
            status: "$currentAdmission.status",
            // Medication summary
            pendingMedications: {
              $size: {
                $filter: {
                  input: "$currentAdmission.medications",
                  cond: { $eq: ["$$this.administrationStatus", "Pending"] },
                },
              },
            },
            // IV Fluids summary
            pendingIVFluids: {
              $size: {
                $filter: {
                  input: "$currentAdmission.ivFluids",
                  cond: { $eq: ["$$this.administrationStatus", "Pending"] },
                },
              },
            },
            // Procedures summary
            pendingProcedures: {
              $size: {
                $filter: {
                  input: "$currentAdmission.procedures",
                  cond: { $eq: ["$$this.administrationStatus", "Pending"] },
                },
              },
            },
            // Recent vitals
            lastVitals: { $arrayElemAt: ["$currentAdmission.vitals", -1] },
            // Recent follow-up
            lastFollowUp: { $arrayElemAt: ["$currentAdmission.followUps", -1] },
          },
        },
      },
      { $sort: { "currentAdmission.admissionDate": -1 } },
    ]);

    res.status(200).json({
      success: true,
      message: "Active patients retrieved successfully",
      data: {
        patients,
        totalCount: patients.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching active patients:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve patients",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
export const getMyEmergencyMedications = async (req, res) => {
  try {
    const nurseId = req.userId; // From auth middleware
    const {
      status,
      patientId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "administeredAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter query
    const filter = { administeredBy: nurseId };

    // Add optional filters
    if (status) {
      filter.status = status;
    }
    if (patientId) {
      filter.patientId = patientId;
    }
    if (startDate || endDate) {
      filter.administeredAt = {};
      if (startDate) {
        filter.administeredAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.administeredAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get medications with patient details and counts
    const [medications, totalCount] = await Promise.all([
      EmergencyMedication.find(filter)
        .populate({
          path: "reviewedBy",
          select: "name employeeId",
        })
        .populate({
          path: "doctorApproval.doctorId",
          select: "doctorName",
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EmergencyMedication.countDocuments(filter),
    ]);

    // Get patient details for each medication and format doctor approval status
    const medicationsWithPatients = await Promise.all(
      medications.map(async (medication) => {
        const patient = await patientSchema
          .findOne(
            { patientId: medication.patientId },
            { name: 1, age: 1, gender: 1, contact: 1 }
          )
          .lean();

        // Format doctor approval status clearly
        let doctorApprovalStatus = "Pending Review";
        let approvalDetails = null;

        if (
          medication.doctorApproval &&
          medication.doctorApproval.approved !== null
        ) {
          if (medication.doctorApproval.approved === true) {
            doctorApprovalStatus = "Approved by Doctor";
            approvalDetails = {
              status: "APPROVED",
              doctorName:
                medication.doctorApproval.doctorName || "Unknown Doctor",
              approvedAt: medication.doctorApproval.timestamp,
              notes: medication.doctorApproval.notes || "",
              priority: medication.doctorApproval.priority || "Medium",
              daysSinceApproval: medication.doctorApproval.timestamp
                ? Math.floor(
                    (new Date() -
                      new Date(medication.doctorApproval.timestamp)) /
                      (1000 * 60 * 60 * 24)
                  )
                : null,
            };
          } else if (medication.doctorApproval.approved === false) {
            doctorApprovalStatus = "Rejected by Doctor";
            approvalDetails = {
              status: "REJECTED",
              doctorName:
                medication.doctorApproval.doctorName || "Unknown Doctor",
              rejectedAt: medication.doctorApproval.timestamp,
              rejectionReason:
                medication.doctorApproval.notes || "No reason provided",
              daysSinceRejection: medication.doctorApproval.timestamp
                ? Math.floor(
                    (new Date() -
                      new Date(medication.doctorApproval.timestamp)) /
                      (1000 * 60 * 60 * 24)
                  )
                : null,
            };
          }
        }

        return {
          ...medication,
          // Clear approval status
          doctorApprovalStatus,
          approvalDetails,
          // Nurse information
          nurseInfo: {
            name: medication.nurseName || "Unknown Nurse",
            employeeId: medication.nurseEmployeeId || "N/A",
            administeredAt: medication.administeredAt,
          },
          // Patient details
          patientDetails: patient || {
            name: "Unknown Patient",
            age: null,
            gender: null,
            contact: null,
          },
          // Time calculations
          timeInfo: {
            administeredAt: medication.administeredAt,
            daysSinceAdministration: Math.floor(
              (new Date() - new Date(medication.administeredAt)) /
                (1000 * 60 * 60 * 24)
            ),
            hoursSinceAdministration: Math.floor(
              (new Date() - new Date(medication.administeredAt)) /
                (1000 * 60 * 60)
            ),
            isRecent:
              new Date() - new Date(medication.administeredAt) <
              24 * 60 * 60 * 1000, // Last 24 hours
          },
        };
      })
    );

    // Calculate summary statistics with doctor approval breakdown
    const [statusCounts, approvalCounts] = await Promise.all([
      EmergencyMedication.aggregate([
        { $match: { administeredBy: nurseId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      EmergencyMedication.aggregate([
        { $match: { administeredBy: nurseId } },
        {
          $group: {
            _id: "$doctorApproval.approved",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = {
      total: totalCount,
      byStatus: {
        pending: statusCounts.find((s) => s._id === "Pending")?.count || 0,
        approved: statusCounts.find((s) => s._id === "Approved")?.count || 0,
        rejected: statusCounts.find((s) => s._id === "Rejected")?.count || 0,
        pendingDoctorApproval:
          statusCounts.find((s) => s._id === "PendingDoctorApproval")?.count ||
          0,
      },
      byDoctorApproval: {
        approved: approvalCounts.find((a) => a._id === true)?.count || 0,
        rejected: approvalCounts.find((a) => a._id === false)?.count || 0,
        pending: approvalCounts.find((a) => a._id === null)?.count || 0,
        awaitingReview: approvalCounts.find((a) => a._id === null)?.count || 0,
      },
    };

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await EmergencyMedication.countDocuments({
      administeredBy: nurseId,
      administeredAt: { $gte: sevenDaysAgo },
    });

    // Group by medication name for insights
    const medicationFrequency = await EmergencyMedication.aggregate([
      { $match: { administeredBy: nurseId } },
      {
        $group: {
          _id: "$medicationName",
          count: { $sum: 1 },
          lastUsed: { $max: "$administeredAt" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const response = {
      success: true,
      message: "Emergency medications retrieved successfully",
      data: {
        medications: medicationsWithPatients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1,
        },
        summary,
        insights: {
          recentActivity: recentCount,
          topMedications: medicationFrequency,
          averagePerDay: totalCount > 0 ? (totalCount / 30).toFixed(1) : 0, // Last 30 days average
        },
        filters: {
          appliedFilters: {
            status: status || "all",
            patientId: patientId || "all",
            dateRange: {
              startDate: startDate || null,
              endDate: endDate || null,
            },
          },
          availableStatuses: [
            "Pending",
            "Approved",
            "Rejected",
            "PendingDoctorApproval",
          ],
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching nurse emergency medications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve emergency medications",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};
export const getMedicationTasks = async (req, res) => {
  try {
    const {
      status = "Pending",
      date,
      patientId,
      nurseId,
      section,
      limit = 50,
      page = 1,
      sortBy = "time",
      sortOrder = "asc",
    } = req.query;

    // Build filter query
    const matchQuery = {
      discharged: false, // Only active patients
      "admissionRecords.medications": { $exists: true, $ne: [] },
    };

    // Add patient filter if specified
    if (patientId) {
      matchQuery.patientId = patientId;
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      { $unwind: "$admissionRecords" },
      { $unwind: "$admissionRecords.medications" },
      {
        $match: {
          "admissionRecords.medications.name": { $exists: true, $ne: "" },
        },
      },
    ];

    // Add status filter
    if (status !== "All") {
      pipeline.push({
        $match: {
          "admissionRecords.medications.administrationStatus": status,
        },
      });
    }

    // Add date filter
    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      pipeline.push({
        $match: {
          $or: [
            { "admissionRecords.medications.date": date },
            {
              "admissionRecords.medications.administeredAt": {
                $gte: targetDate,
                $lt: nextDate,
              },
            },
          ],
        },
      });
    } else {
      // Default to today's tasks
      const today = new Date().toISOString().split("T")[0];
      pipeline.push({
        $match: {
          $or: [
            { "admissionRecords.medications.date": today },
            { "admissionRecords.medications.date": { $exists: false } },
            { "admissionRecords.medications.date": "" },
            { "admissionRecords.medications.date": null },
          ],
        },
      });
    }

    // Add nurse filter if specified
    if (nurseId) {
      pipeline.push({
        $match: {
          "admissionRecords.medications.administeredBy": nurseId,
        },
      });
    }

    // Add section filter if specified
    if (section) {
      pipeline.push({
        $match: {
          "admissionRecords.section.name": section,
        },
      });
    }

    // Project the required fields
    pipeline.push({
      $project: {
        _id: 1,
        patientId: 1,
        name: 1,
        age: 1,
        gender: 1,
        contact: 1,
        admissionId: "$admissionRecords._id",
        bedNumber: "$admissionRecords.bedNumber",
        section: "$admissionRecords.section",
        doctor: "$admissionRecords.doctor",
        medication: {
          _id: "$admissionRecords.medications._id",
          name: "$admissionRecords.medications.name",
          dosage: "$admissionRecords.medications.dosage",
          type: "$admissionRecords.medications.type",
          date: "$admissionRecords.medications.date",
          time: "$admissionRecords.medications.time",
          administrationStatus:
            "$admissionRecords.medications.administrationStatus",
          administeredBy: "$admissionRecords.medications.administeredBy",
          administeredAt: "$admissionRecords.medications.administeredAt",
          administrationNotes:
            "$admissionRecords.medications.administrationNotes",
        },
      },
    });

    // Add sorting
    const sortField =
      sortBy === "time"
        ? "medication.time"
        : sortBy === "patient"
        ? "name"
        : sortBy === "status"
        ? "medication.administrationStatus"
        : "medication.time";

    pipeline.push({
      $sort: { [sortField]: sortOrder === "desc" ? -1 : 1 },
    });

    // Execute aggregation with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tasks, totalCount] = await Promise.all([
      patientSchema.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]),
      patientSchema.aggregate([...pipeline, { $count: "total" }]),
    ]);

    // Populate nurse information if needed
    const populatedTasks = await patientSchema.populate(tasks, {
      path: "medication.administeredBy",
      select: "name employeeId",
      model: "Nurse",
    });

    const total = totalCount.length > 0 ? totalCount[0].total : 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Group tasks by priority/urgency
    const groupedTasks = {
      urgent: populatedTasks.filter((task) => {
        const medicationType = task.medication.type?.toLowerCase();
        return (
          medicationType?.includes("stat") ||
          medicationType?.includes("urgent") ||
          medicationType?.includes("emergency")
        );
      }),
      regular: populatedTasks.filter((task) => {
        const medicationType = task.medication.type?.toLowerCase();
        return (
          !medicationType?.includes("stat") &&
          !medicationType?.includes("urgent") &&
          !medicationType?.includes("emergency")
        );
      }),
    };

    // Calculate statistics
    const stats = {
      total,
      pending: populatedTasks.filter(
        (t) => t.medication.administrationStatus === "Pending"
      ).length,
      administered: populatedTasks.filter(
        (t) => t.medication.administrationStatus === "Administered"
      ).length,
      skipped: populatedTasks.filter(
        (t) => t.medication.administrationStatus === "Skipped"
      ).length,
      urgent: groupedTasks.urgent.length,
      overdue: populatedTasks.filter((task) => {
        if (task.medication.administrationStatus !== "Pending") return false;
        const taskTime = task.medication.time;
        const currentTime = new Date().toTimeString().slice(0, 5);
        return taskTime < currentTime;
      }).length,
    };

    res.status(200).json({
      success: true,
      data: {
        tasks: populatedTasks,
        groupedTasks,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount: total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
      },
      message: `Retrieved ${populatedTasks.length} medication tasks`,
    });
  } catch (error) {
    console.error("Error fetching medication tasks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch medication tasks",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const updateNurseProfile = async (req, res) => {
  try {
    const nurseId = req.userId; // From auth middleware
    const updateData = req.body;

    // Validate that the authenticated user is a nurse
    if (req.usertype !== "nurse") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only nurses can update nurse profiles.",
      });
    }

    // Find the nurse by ID
    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: "Nurse not found.",
      });
    }

    // Define allowed fields for update
    const allowedFields = ["nurseName", "email", "password", "doctorId"];

    // Create update object with only allowed fields
    const updates = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        updates[field] = updateData[field];
      }
    }

    // Special handling for email - check uniqueness
    if (updates.email && updates.email !== nurse.email) {
      const existingNurse = await Nurse.findOne({
        email: updates.email,
        _id: { $ne: nurseId },
      });

      if (existingNurse) {
        return res.status(400).json({
          success: false,
          message: "Email already exists. Please choose a different email.",
        });
      }
    }

    // Special handling for password - hash if provided
    if (updates.password) {
      // Validate password strength (optional)
      if (updates.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }

      const saltRounds = 12;
      updates.password = await bcrypt.hash(updates.password, saltRounds);
    }

    // Special handling for doctorId - validate if provided
    if (updates.doctorId) {
      // You can add validation here to check if the doctor exists
      // const doctorExists = await Doctor.findById(updates.doctorId);
      // if (!doctorExists) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Associated doctor not found.",
      //   });
      // }
    }

    // Check if there are any valid updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    // Update the nurse profile
    const updatedNurse = await Nurse.findByIdAndUpdate(
      nurseId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
        select: "-password", // Exclude password from response
      }
    ).populate("doctorId", "name email specialization"); // Populate doctor details if needed

    // Log the update activity (optional - for audit trail)
    console.log(
      `Nurse profile updated: ${nurse.email} at ${new Date().toISOString()}`
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        nurse: updatedNurse,
        updatedFields: Object.keys(updates),
      },
    });
  } catch (error) {
    console.error("Error updating nurse profile:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation error.",
        errors: validationErrors,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

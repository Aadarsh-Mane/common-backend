// controllers/sectionController.js

import PatientHistory from "../../models/patientHistorySchema.js";
import patientSchema from "../../models/patientSchema.js";
import Section from "../../models/sectionSchema.js";
import mongoose from "mongoose";
// Create a new hospital section
export const createSection = async (req, res) => {
  try {
    const { name, type, totalBeds } = req.body;

    // Validate required fields
    if (!name || !type || !totalBeds) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, type, and totalBeds",
      });
    }

    // Create new section
    const newSection = await Section.create({
      name,
      type,
      totalBeds,
      availableBeds: totalBeds,
    });

    return res.status(201).json({
      success: true,
      data: newSection,
      message: "Section created successfully",
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A section with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get all hospital sections
export const getAllSections = async (req, res) => {
  try {
    const sections = await Section.find();

    // Get counts of different section types
    const typeStats = await Section.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalBeds: { $sum: "$totalBeds" },
          availableBeds: { $sum: "$availableBeds" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: sections.length,
      typeStats,
      data: sections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get a single hospital section
export const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Update a hospital section
export const updateSection = async (req, res) => {
  try {
    const { name, type, totalBeds } = req.body;

    // Find section first to check if it exists and to handle beds properly
    let section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Calculate available beds if total beds are changing
    let availableBeds = section.availableBeds;
    if (totalBeds && totalBeds !== section.totalBeds) {
      const occupiedBeds = section.totalBeds - section.availableBeds;
      availableBeds = Math.max(0, totalBeds - occupiedBeds);
    }

    // Update the section
    section = await Section.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        totalBeds,
        availableBeds,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: section,
      message: "Section updated successfully",
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A section with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Delete a hospital section
export const deleteSection = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    await Section.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get section types (to populate dropdowns)
export const getSectionTypes = async (req, res) => {
  try {
    const types = await Section.distinct("type");

    res.status(200).json({
      success: true,
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
export const getPatientsWithAdmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      discharged,
      doctorId,
      sectionId,
      patientType,
      search,
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by discharge status
    if (discharged !== undefined) {
      filter.discharged = discharged === "true";
    }

    // Search by patient name or patientId
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ];
    }

    // Build admission record filters
    const admissionFilter = {};
    if (doctorId) {
      admissionFilter["admissionRecords.doctor.id"] = doctorId;
    }
    if (sectionId) {
      admissionFilter["admissionRecords.section.id"] = sectionId;
    }
    if (patientType) {
      admissionFilter["admissionRecords.patientType"] = patientType;
    }

    // Combine filters
    const finalFilter = { ...filter, ...admissionFilter };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get patients with admission records
    const patients = await patientSchema
      .find(finalFilter)
      .populate({
        path: "admissionRecords.doctor.id",
        select: "name specialization",
      })
      .populate({
        path: "admissionRecords.section.id",
        select: "name type capacity",
      })
      .populate({
        path: "admissionRecords.followUps.nurseId",
        select: "name department",
      })
      .populate({
        path: "admissionRecords.fourHrFollowUpSchema.nurseId",
        select: "name department",
      })
      .sort({ "admissionRecords.admissionDate": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await patientSchema.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Transform data to include admission count and latest admission info
    const transformedPatients = patients.map((patient) => ({
      ...patient,
      admissionCount: patient.admissionRecords?.length || 0,
      latestAdmission: patient.admissionRecords?.[0] || null,
      hasActiveAdmissions:
        patient.admissionRecords?.some(
          (admission) => admission.status !== "Discharged"
        ) || false,
    }));

    res.status(200).json({
      success: true,
      message: "Patients retrieved successfully",
      data: {
        patients: transformedPatients,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching patients with admissions:", error);
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

/**
 * Get specific patient with admission records by patientId
 */
export const getPatientWithAdmissions = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    const patient = await patientSchema
      .findOne({ patientId })
      .populate({
        path: "admissionRecords.doctor.id",
        select: "name specialization contact",
      })
      .populate({
        path: "admissionRecords.section.id",
        select: "name type capacity",
      })
      .populate({
        path: "admissionRecords.followUps.nurseId",
        select: "name department contact",
      })
      .populate({
        path: "admissionRecords.fourHrFollowUpSchema.nurseId",
        select: "name department contact",
      })
      .lean();

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Sort admission records by date (newest first)
    if (patient.admissionRecords) {
      patient.admissionRecords.sort(
        (a, b) => new Date(b.admissionDate) - new Date(a.admissionDate)
      );
    }

    res.status(200).json({
      success: true,
      message: "Patient retrieved successfully",
      data: patient,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve patient",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Delete an admission record entirely
 * This is a destructive operation and should be used carefully
 */
export const deleteAdmissionRecord = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const requestingUserId = req.userId; // From auth middleware

    console.log("=== DELETE ADMISSION RECORD ===");
    console.log("Custom PatientId:", patientId); // This is your custom ID
    console.log("Admission ObjectId:", admissionId); // This is MongoDB ObjectId
    console.log("RequestingUserId:", requestingUserId);

    // Validate required parameters
    if (!patientId || !admissionId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID and Admission ID are required",
      });
    }

    // Validate admission ID format (must be valid ObjectId)
    if (!mongoose.Types.ObjectId.isValid(admissionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID format",
      });
    }

    // Find the patient by your custom patientId field
    const patient = await patientSchema.findOne({ patientId: patientId });

    if (!patient) {
      console.log("Patient not found with custom patientId:", patientId);
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    console.log("Patient found:", {
      _id: patient._id,
      customPatientId: patient.patientId,
      name: patient.name,
      totalAdmissions: patient.admissionRecords.length,
    });

    // Find the admission record index by ObjectId
    const admissionIndex = patient.admissionRecords.findIndex(
      (admission) => admission._id.toString() === admissionId
    );

    if (admissionIndex === -1) {
      console.log(
        "Admission not found in patient records. Available admissions:"
      );
      patient.admissionRecords.forEach((admission, index) => {
        console.log(
          `  ${index + 1}. ID: ${admission._id}, Date: ${
            admission.admissionDate
          }`
        );
      });

      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Get the admission record before deletion
    const admissionToDelete = patient.admissionRecords[admissionIndex];
    console.log("Found admission to delete:", {
      admissionId: admissionToDelete._id,
      admissionDate: admissionToDelete.admissionDate,
      status: admissionToDelete.status,
      reasonForAdmission: admissionToDelete.reasonForAdmission,
    });

    // Optional: Add authorization check if needed
    // if (admissionToDelete.doctor?.id && admissionToDelete.doctor.id.toString() !== requestingUserId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized to delete this admission record'
    //   });
    // }

    // Create backup before deletion (recommended for audit trail)
    const backupData = {
      patientMongoId: patient._id,
      patientCustomId: patient.patientId, // Your custom patient ID
      admissionId,
      deletedBy: requestingUserId,
      deletedAt: new Date(),
      admissionData: admissionToDelete.toObject(),
      reason: req.body.reason || "No reason provided",
    };

    console.log("Backup data created for audit trail");

    // Store backup in a separate collection (optional but recommended)
    // await DeletedAdmission.create(backupData);

    // Remove the admission record from patient
    patient.admissionRecords.splice(admissionIndex, 1);
    console.log(
      `Admission removed. Remaining admissions: ${patient.admissionRecords.length}`
    );

    // Update patient discharge status if no more admission records
    if (patient.admissionRecords.length === 0) {
      patient.discharged = true;
      console.log("Patient marked as discharged (no remaining admissions)");
    }

    // Save the updated patient
    await patient.save();
    console.log("Patient document updated successfully");

    // Also remove from patient history if it exists
    // Use the custom patientId for history lookup (as per your schema)
    const patientHistory = await PatientHistory.findOne({
      patientId: patient.patientId, // Use your custom patientId
    });

    if (patientHistory) {
      const historyIndex = patientHistory.history.findIndex(
        (record) => record.admissionId.toString() === admissionId
      );

      if (historyIndex !== -1) {
        patientHistory.history.splice(historyIndex, 1);
        await patientHistory.save();
        console.log("Admission removed from patient history");
      } else {
        console.log("Admission not found in patient history");
      }
    } else {
      console.log(
        "No patient history record found for patientId:",
        patient.patientId
      );
    }

    // Log the deletion for audit purposes
    console.log(
      `Admission record deleted successfully:`,
      `Custom PatientID: ${patient.patientId},`,
      `AdmissionID: ${admissionId},`,
      `DeletedBy: ${requestingUserId}`
    );

    res.status(200).json({
      success: true,
      message: "Admission record deleted successfully",
      data: {
        patientId: patient.patientId, // Return your custom patient ID
        patientMongoId: patient._id, // Also return MongoDB ID for reference
        admissionId,
        remainingAdmissions: patient.admissionRecords.length,
        patientDischargeStatus: patient.discharged,
        deletedAdmission: {
          admissionDate: admissionToDelete.admissionDate,
          reasonForAdmission: admissionToDelete.reasonForAdmission,
          status: admissionToDelete.status,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting admission record:", error);

    // Handle specific errors
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format provided",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete admission record",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};
export const updatePatientInfo = async (req, res) => {
  try {
    const { patientId } = req.params; // This is actually the MongoDB _id
    const {
      name,
      age,
      gender,
      contact,
      address,
      city,
      state,
      country,
      dob,
      imageUrl,
      pendingAmount,
    } = req.body;

    console.log("=== UPDATE PATIENT INFO ===");
    console.log("Patient MongoDB _id:", patientId);
    console.log("Update data:", req.body);

    // Validate required parameters
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    // Validate if it's a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID format",
      });
    }

    // Find the patient by MongoDB _id
    const existingPatient = await patientSchema.findById(patientId);

    if (!existingPatient) {
      console.log("Patient not found with _id:", patientId);
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    console.log(
      "Patient found - Custom ID:",
      existingPatient.patientId,
      "Name:",
      existingPatient.name
    );

    // Build update object with only provided fields
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = parseInt(age);
    if (gender !== undefined) {
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be Male, Female, or Other",
        });
      }
      updateData.gender = gender;
    }
    if (contact !== undefined) updateData.contact = contact;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (dob !== undefined) updateData.dob = dob;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (pendingAmount !== undefined)
      updateData.pendingAmount = parseFloat(pendingAmount);

    // Validate required fields if being updated
    if (updateData.name && updateData.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty",
      });
    }

    if (updateData.age && (updateData.age < 0 || updateData.age > 150)) {
      return res.status(400).json({
        success: false,
        message: "Age must be between 0 and 150",
      });
    }

    if (updateData.contact && updateData.contact.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Contact cannot be empty",
      });
    }

    console.log("Update data prepared:", updateData);

    // Update the patient by MongoDB _id
    const updatedPatient = await patientSchema
      .findByIdAndUpdate(
        patientId,
        { $set: updateData },
        {
          new: true, // Return updated document
          runValidators: true, // Run schema validations
        }
      )
      .lean();

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        message: "Failed to update patient",
      });
    }

    console.log("Patient updated successfully");

    res.status(200).json({
      success: true,
      message: "Patient information updated successfully",
      data: {
        _id: updatedPatient._id,
        patientId: updatedPatient.patientId, // Your custom patient ID
        name: updatedPatient.name,
        age: updatedPatient.age,
        gender: updatedPatient.gender,
        contact: updatedPatient.contact,
        address: updatedPatient.address,
        city: updatedPatient.city,
        state: updatedPatient.state,
        country: updatedPatient.country,
        dob: updatedPatient.dob,
        imageUrl: updatedPatient.imageUrl,
        discharged: updatedPatient.discharged,
        pendingAmount: updatedPatient.pendingAmount,
        admissionCount: updatedPatient.admissionRecords?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error updating patient info:", error);

    // Handle specific MongoDB errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Patient ID already exists",
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update patient information",
      error: error.message,
    });
  }
};

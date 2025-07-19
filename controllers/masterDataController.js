// controllers/masterDataController.js
import Patient from "../models/patientSchema.js";
import PatientHistory from "../models/patientHistorySchema.js";
import mongoose from "mongoose";

// Helper function to convert date strings to MongoDB Date objects
const convertToMongoDate = (dateString) => {
  if (!dateString) return null;
  // Handle various date formats
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Get all patients with their latest admission status
export const getAllPatientsOverview = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "all" } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { patientId: { $regex: search, $options: "i" } },
          { contact: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Filter by status
    if (status === "active") {
      searchQuery.discharged = false;
    } else if (status === "discharged") {
      searchQuery.discharged = true;
    }

    // Get active patients
    const activePatients = await Patient.find(searchQuery)
      .select(
        "patientId name age gender contact discharged pendingAmount admissionRecords"
      )
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ "admissionRecords.admissionDate": -1 });

    // Get discharged patients from history
    const dischargedPatients = await PatientHistory.find(searchQuery)
      .select("patientId name age gender contact history")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ "history.dischargeDate": -1 });

    // Format response
    const formattedActivePatients = activePatients.map((patient) => {
      const latestAdmission =
        patient.admissionRecords[patient.admissionRecords.length - 1];
      return {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        status: "Active",
        discharged: patient.discharged,
        pendingAmount: patient.pendingAmount,
        latestAdmission: latestAdmission
          ? {
              opdNumber: latestAdmission.opdNumber,
              ipdNumber: latestAdmission.ipdNumber,
              admissionDate: latestAdmission.admissionDate,
              status: latestAdmission.status,
              doctor: latestAdmission.doctor,
            }
          : null,
      };
    });

    const formattedDischargedPatients = dischargedPatients.map((patient) => {
      const latestHistory = patient.history[patient.history.length - 1];
      return {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        status: "Discharged",
        discharged: true,
        latestHistory: latestHistory
          ? {
              opdNumber: latestHistory.opdNumber,
              ipdNumber: latestHistory.ipdNumber,
              admissionDate: latestHistory.admissionDate,
              dischargeDate: latestHistory.dischargeDate,
              conditionAtDischarge: latestHistory.conditionAtDischarge,
              doctor: latestHistory.doctor,
            }
          : null,
      };
    });

    // Combine and sort results
    let allPatients = [];
    if (status === "all") {
      allPatients = [
        ...formattedActivePatients,
        ...formattedDischargedPatients,
      ];
    } else if (status === "active") {
      allPatients = formattedActivePatients;
    } else {
      allPatients = formattedDischargedPatients;
    }

    // Get total count for pagination
    const totalActive = await Patient.countDocuments(searchQuery);
    const totalDischarged = await PatientHistory.countDocuments(searchQuery);
    const totalCount =
      status === "all"
        ? totalActive + totalDischarged
        : status === "active"
        ? totalActive
        : totalDischarged;

    res.status(200).json({
      success: true,
      data: {
        patients: allPatients,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + allPatients.length < totalCount,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching patients overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patients overview",
      error: error.message,
    });
  }
};

// Get detailed patient data for editing
export const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { source = "auto" } = req.query; // 'active', 'history', or 'auto'

    let patientData = null;
    let dataSource = "";

    // Try to find in active patients first
    if (source === "auto" || source === "active") {
      patientData = await Patient.findOne({ patientId })
        .populate("admissionRecords.doctor.id", "name usertype")
        .populate("admissionRecords.section.id", "name type");

      if (patientData) {
        dataSource = "active";
      }
    }

    // If not found in active or specifically looking in history
    if (!patientData && (source === "auto" || source === "history")) {
      patientData = await PatientHistory.findOne({ patientId })
        .populate("history.doctor.id", "name usertype")
        .populate("history.section.id", "name type");

      if (patientData) {
        dataSource = "history";
      }
    }

    if (!patientData) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        patient: patientData,
        dataSource,
        isEditable: true,
      },
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient details",
      error: error.message,
    });
  }
};

// Update patient basic information
export const updatePatientBasicInfo = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { source } = req.query; // 'active' or 'history'
    const updates = req.body;

    // Validate and convert dates
    if (updates.dob) {
      const dobDate = convertToMongoDate(updates.dob);
      if (dobDate) updates.dob = dobDate.toISOString().split("T")[0]; // Keep as string in YYYY-MM-DD format
    }

    let updatedPatient = null;

    if (source === "active") {
      updatedPatient = await Patient.findOneAndUpdate(
        { patientId },
        { $set: updates },
        { new: true, runValidators: true }
      );
    } else if (source === "history") {
      updatedPatient = await PatientHistory.findOneAndUpdate(
        { patientId },
        { $set: updates },
        { new: true, runValidators: true }
      );
    } else {
      // Try both collections
      updatedPatient = await Patient.findOneAndUpdate(
        { patientId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updatedPatient) {
        updatedPatient = await PatientHistory.findOneAndUpdate(
          { patientId },
          { $set: updates },
          { new: true, runValidators: true }
        );
      }
    }

    if (!updatedPatient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient information updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating patient basic info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update patient information",
      error: error.message,
    });
  }
};

// Update specific admission record
export const updateAdmissionRecord = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const { source } = req.query;
    const updates = req.body;

    // Convert date strings to MongoDB Date objects
    if (updates.admissionDate) {
      updates.admissionDate = convertToMongoDate(updates.admissionDate);
    }
    if (updates.dischargeDate) {
      updates.dischargeDate = convertToMongoDate(updates.dischargeDate);
    }

    // Validate ObjectIds if provided
    if (updates.doctor?.id && !isValidObjectId(updates.doctor.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    if (updates.section?.id && !isValidObjectId(updates.section.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    let result = null;

    if (source === "active") {
      result = await Patient.findOneAndUpdate(
        { patientId, "admissionRecords._id": admissionId },
        {
          $set: Object.keys(updates).reduce((acc, key) => {
            acc[`admissionRecords.$.${key}`] = updates[key];
            return acc;
          }, {}),
        },
        { new: true, runValidators: true }
      );
    } else if (source === "history") {
      result = await PatientHistory.findOneAndUpdate(
        { patientId, "history._id": admissionId },
        {
          $set: Object.keys(updates).reduce((acc, key) => {
            acc[`history.$.${key}`] = updates[key];
            return acc;
          }, {}),
        },
        { new: true, runValidators: true }
      );
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Patient or admission record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Admission record updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error updating admission record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update admission record",
      error: error.message,
    });
  }
};

// Re-admit discharged patient
export const readmitPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const admissionData = req.body;

    // Find patient in history
    const patientHistory = await PatientHistory.findOne({ patientId });
    if (!patientHistory) {
      return res.status(404).json({
        success: false,
        message: "Patient not found in history",
      });
    }

    // Get the latest history record
    const latestHistory =
      patientHistory.history[patientHistory.history.length - 1];
    if (!latestHistory) {
      return res.status(400).json({
        success: false,
        message: "No previous admission history found",
      });
    }

    // Check if patient already exists in active patients
    const existingActivePatient = await Patient.findOne({ patientId });
    if (existingActivePatient && !existingActivePatient.discharged) {
      return res.status(400).json({
        success: false,
        message: "Patient is already active",
      });
    }

    // Get next OPD number
    const lastPatient = await Patient.findOne(
      { "admissionRecords.opdNumber": { $exists: true } },
      {},
      { sort: { "admissionRecords.opdNumber": -1 } }
    );
    const nextOpdNumber = lastPatient?.admissionRecords?.[0]?.opdNumber
      ? Math.max(...lastPatient.admissionRecords.map((r) => r.opdNumber || 0)) +
        1
      : 1;

    // Prepare new admission record
    const newAdmissionRecord = {
      opdNumber: nextOpdNumber,
      admissionDate:
        convertToMongoDate(admissionData.admissionDate) || new Date(),
      status: admissionData.status || "Pending",
      patientType: admissionData.patientType || "Internal",
      admitNotes: admissionData.admitNotes || "",
      reasonForAdmission:
        admissionData.reasonForAdmission || latestHistory.reasonForAdmission,
      doctor: {
        id: admissionData.doctorId
          ? new mongoose.Types.ObjectId(admissionData.doctorId)
          : latestHistory.doctor.id,
        name: admissionData.doctorName || latestHistory.doctor.name,
        usertype: admissionData.doctorUsertype || latestHistory.doctor.usertype,
      },
      section: admissionData.sectionId
        ? {
            id: new mongoose.Types.ObjectId(admissionData.sectionId),
            name: admissionData.sectionName,
            type: admissionData.sectionType,
          }
        : latestHistory.section,
      weight: admissionData.weight || latestHistory.weight,
      symptoms: admissionData.symptoms || latestHistory.symptoms,
      initialDiagnosis:
        admissionData.initialDiagnosis || latestHistory.initialDiagnosis,
      // Initialize empty arrays for new admission
      followUps: [],
      fourHrFollowUpSchema: [],
      doctorPrescriptions: [],
      doctorConsulting: [],
      surgicalNotes: [],
      symptomsByDoctor: [],
      vitals: [],
      doctorNotes: [],
      medications: [],
      ivFluids: [],
      procedures: [],
      specialInstructions: [],
      diagnosisByDoctor: [],
    };

    // If IPD admission
    if (admissionData.isIpdAdmission) {
      const lastIpdPatient = await Patient.findOne(
        { "admissionRecords.ipdNumber": { $exists: true } },
        {},
        { sort: { "admissionRecords.ipdNumber": -1 } }
      );
      const nextIpdNumber = lastIpdPatient?.admissionRecords?.[0]?.ipdNumber
        ? Math.max(
            ...lastIpdPatient.admissionRecords.map((r) => r.ipdNumber || 0)
          ) + 1
        : 1;

      newAdmissionRecord.ipdNumber = nextIpdNumber;
      newAdmissionRecord.bedNumber = admissionData.bedNumber;
      newAdmissionRecord.ipdDetailsUpdated = true;
    }

    let patient;
    if (existingActivePatient) {
      // Update existing patient
      patient = await Patient.findOneAndUpdate(
        { patientId },
        {
          $set: {
            discharged: false,
            pendingAmount:
              admissionData.pendingAmount ||
              latestHistory.previousRemainingAmount ||
              0,
          },
          $push: { admissionRecords: newAdmissionRecord },
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new patient record from history
      patient = new Patient({
        patientId: patientHistory.patientId,
        name: patientHistory.name,
        age: patientHistory.age,
        gender: patientHistory.gender,
        contact: patientHistory.contact,
        address: patientHistory.address,
        city: latestHistory.city || "",
        state: latestHistory.state || "",
        country: latestHistory.country || "",
        dob: patientHistory.dob,
        imageUrl: patientHistory.imageUrl,
        discharged: false,
        pendingAmount:
          admissionData.pendingAmount ||
          latestHistory.previousRemainingAmount ||
          0,
        admissionRecords: [newAdmissionRecord],
      });
      await patient.save();
    }

    res.status(201).json({
      success: true,
      message: "Patient readmitted successfully",
      data: {
        patient,
        newAdmissionRecord,
        opdNumber: nextOpdNumber,
        ipdNumber: newAdmissionRecord.ipdNumber || null,
      },
    });
  } catch (error) {
    console.error("Error readmitting patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to readmit patient",
      error: error.message,
    });
  }
};

// Delete patient (soft delete - move to archive or hard delete)
export const deletePatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { source, deleteType = "soft" } = req.query; // 'soft' or 'hard'

    if (deleteType === "hard") {
      // Hard delete - remove completely
      const activeDeleted = await Patient.findOneAndDelete({ patientId });
      const historyDeleted = await PatientHistory.findOneAndDelete({
        patientId,
      });

      if (!activeDeleted && !historyDeleted) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Patient permanently deleted",
        data: {
          deletedFromActive: !!activeDeleted,
          deletedFromHistory: !!historyDeleted,
        },
      });
    } else {
      // Soft delete - mark as archived or move to history if active
      if (source === "active") {
        const patient = await Patient.findOne({ patientId });
        if (!patient) {
          return res.status(404).json({
            success: false,
            message: "Patient not found in active records",
          });
        }

        // Move to history if not already there
        const existingHistory = await PatientHistory.findOne({ patientId });
        if (!existingHistory) {
          // Create new history record
          const newHistory = new PatientHistory({
            patientId: patient.patientId,
            name: patient.name,
            gender: patient.gender,
            contact: patient.contact,
            age: patient.age,
            address: patient.address,
            dob: patient.dob,
            imageUrl: patient.imageUrl,
            history: patient.admissionRecords.map((record) => ({
              ...record.toObject(),
              admissionId: record._id,
            })),
          });
          await newHistory.save();
        } else {
          // Add to existing history
          const newHistoryRecords = patient.admissionRecords.map((record) => ({
            ...record.toObject(),
            admissionId: record._id,
          }));
          await PatientHistory.findOneAndUpdate(
            { patientId },
            { $push: { history: { $each: newHistoryRecords } } }
          );
        }

        // Remove from active patients
        await Patient.findOneAndDelete({ patientId });

        res.status(200).json({
          success: true,
          message: "Patient moved to history",
        });
      } else {
        // Just mark as archived in history
        const updated = await PatientHistory.findOneAndUpdate(
          { patientId },
          { $set: { archived: true, archivedAt: new Date() } },
          { new: true }
        );

        if (!updated) {
          return res.status(404).json({
            success: false,
            message: "Patient not found in history",
          });
        }

        res.status(200).json({
          success: true,
          message: "Patient archived successfully",
          data: updated,
        });
      }
    }
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete patient",
      error: error.message,
    });
  }
};

// Add new nested data (prescriptions, vitals, etc.)
export const addNestedData = async (req, res) => {
  try {
    const { patientId, admissionId, dataType } = req.params;
    const { source } = req.query;
    const newData = req.body;

    // Validate dataType
    const validDataTypes = [
      "doctorPrescriptions",
      "vitals",
      "doctorNotes",
      "medications",
      "ivFluids",
      "procedures",
      "specialInstructions",
      "followUps",
      "fourHrFollowUpSchema",
      "labReports",
      "doctorConsulting",
    ];

    if (!validDataTypes.includes(dataType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data type",
      });
    }

    // Add timestamps where needed
    if (["vitals", "doctorNotes"].includes(dataType)) {
      newData.recordedAt = new Date();
    }

    let result = null;
    const arrayPath =
      source === "active"
        ? `admissionRecords.$.${dataType}`
        : `history.$.${dataType}`;

    const query =
      source === "active"
        ? { patientId, "admissionRecords._id": admissionId }
        : { patientId, "history._id": admissionId };

    const Model = source === "active" ? Patient : PatientHistory;

    result = await Model.findOneAndUpdate(
      query,
      { $push: { [arrayPath]: newData } },
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Patient or admission record not found",
      });
    }

    res.status(201).json({
      success: true,
      message: `${dataType} added successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error adding nested data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add data",
      error: error.message,
    });
  }
};

// Update nested data
export const updateNestedData = async (req, res) => {
  try {
    const { patientId, admissionId, dataType, dataId } = req.params;
    const { source } = req.query;
    const updates = req.body;

    const Model = source === "active" ? Patient : PatientHistory;
    const arrayField = source === "active" ? "admissionRecords" : "history";

    // Find the document and update the nested array element
    const query =
      source === "active"
        ? {
            patientId,
            "admissionRecords._id": admissionId,
            [`admissionRecords.${dataType}._id`]: dataId,
          }
        : {
            patientId,
            "history._id": admissionId,
            [`history.${dataType}._id`]: dataId,
          };

    const updateQuery = {};
    Object.keys(updates).forEach((key) => {
      updateQuery[`${arrayField}.$.${dataType}.$[elem].${key}`] = updates[key];
    });

    const result = await Model.findOneAndUpdate(
      query,
      { $set: updateQuery },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ "elem._id": dataId }],
      }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `${dataType} updated successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error updating nested data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update data",
      error: error.message,
    });
  }
};

// Delete nested data
export const deleteNestedData = async (req, res) => {
  try {
    const { patientId, admissionId, dataType, dataId } = req.params;
    const { source } = req.query;

    const Model = source === "active" ? Patient : PatientHistory;
    const arrayPath =
      source === "active"
        ? `admissionRecords.$.${dataType}`
        : `history.$.${dataType}`;

    const query =
      source === "active"
        ? { patientId, "admissionRecords._id": admissionId }
        : { patientId, "history._id": admissionId };

    const result = await Model.findOneAndUpdate(
      query,
      { $pull: { [arrayPath]: { _id: dataId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `${dataType} deleted successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error deleting nested data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete data",
      error: error.message,
    });
  }
};

// Get system statistics
export const getSystemStatistics = async (req, res) => {
  try {
    const activePatients = await Patient.countDocuments({ discharged: false });
    const dischargedPatients = await PatientHistory.countDocuments();
    const totalAdmissions = await Patient.aggregate([
      { $unwind: "$admissionRecords" },
      { $count: "total" },
    ]);
    const totalHistoryRecords = await PatientHistory.aggregate([
      { $unwind: "$history" },
      { $count: "total" },
    ]);

    const recentAdmissions = await Patient.find({ discharged: false })
      .sort({ "admissionRecords.admissionDate": -1 })
      .limit(5)
      .select("patientId name admissionRecords");

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          activePatients,
          dischargedPatients,
          totalAdmissions:
            (totalAdmissions[0]?.total || 0) +
            (totalHistoryRecords[0]?.total || 0),
          totalPatients: activePatients + dischargedPatients,
        },
        recentAdmissions: recentAdmissions.map((patient) => ({
          patientId: patient.patientId,
          name: patient.name,
          latestAdmission:
            patient.admissionRecords[patient.admissionRecords.length - 1],
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

// routes/masterDataRoutes.js

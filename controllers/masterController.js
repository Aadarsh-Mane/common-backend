// controllers/patientMasterController.js
import patientSchema from "../models/patientSchema.js";
import PatientHistory from "../models/patientHistorySchema.js";
import mongoose from "mongoose";
import PatientCounter from "../models/patientCounter.js";

/**
 * Get all patients with pagination and search
 */
export const getAllPatientsController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      discharged = null,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { "admissionRecords.opdNumber": parseInt(search) || 0 },
        { "admissionRecords.ipdNumber": parseInt(search) || 0 },
      ];
    }

    // Filter by discharge status
    if (discharged !== null) {
      query.discharged = discharged === "true";
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const patients = await patientSchema
      .find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("admissionRecords.doctor.id", "name usertype")
      .populate("admissionRecords.section.id", "name type");

    const total = await patientSchema.countDocuments(query);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: patients.length,
        totalRecords: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patients",
      error: error.message,
    });
  }
};

/**
 * Get patient by ID with full details
 */
export const getPatientByIdController = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await patientSchema
      .findOne({ patientId })
      .populate("admissionRecords.doctor.id", "name usertype")
      .populate("admissionRecords.section.id", "name type")
      .populate("admissionRecords.followUps.nurseId", "name")
      .populate("admissionRecords.fourHrFollowUpSchema.nurseId", "name");

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient",
      error: error.message,
    });
  }
};

/**
 * Get patient by OPD/IPD number
 */
export const getPatientByNumberController = async (req, res) => {
  try {
    const { number, type } = req.params; // type: 'opd' or 'ipd'

    let patient;
    if (type === "opd") {
      patient = await patientSchema.findByOPDNumber(parseInt(number));
    } else if (type === "ipd") {
      patient = await patientSchema.findByIPDNumber(parseInt(number));
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Use 'opd' or 'ipd'",
      });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient not found with ${type.toUpperCase()} number: ${number}`,
      });
    }

    await patient.populate([
      { path: "admissionRecords.doctor.id", select: "name usertype" },
      { path: "admissionRecords.section.id", select: "name type" },
    ]);

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient",
      error: error.message,
    });
  }
};

/**
 * Update patient basic information
 */
export const updatePatientBasicInfoController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.patientId;
    delete updates.admissionRecords;
    delete updates._id;

    // Convert date strings to Date objects if present
    if (updates.dob) {
      updates.dob = new Date(updates.dob).toISOString().split("T")[0];
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient information updated successfully",
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update patient information",
      error: error.message,
    });
  }
};

/**
 * Update specific admission record
 */
export const updateAdmissionRecordController = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const updates = req.body;

    // Convert date strings to Date objects
    if (updates.admissionDate) {
      updates.admissionDate = new Date(updates.admissionDate);
    }
    if (updates.dischargeDate) {
      updates.dischargeDate = new Date(updates.dischargeDate);
    }

    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Update only allowed fields
    const allowedFields = [
      "opdNumber",
      "ipdNumber",
      "admissionDate",
      "dischargeDate",
      "status",
      "patientType",
      "admitNotes",
      "reasonForAdmission",
      "conditionAtDischarge",
      "amountToBePayed",
      "weight",
      "symptoms",
      "initialDiagnosis",
      "bedNumber",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        admissionRecord[field] = updates[field];
      }
    });

    await patient.save();

    res.status(200).json({
      success: true,
      message: "Admission record updated successfully",
      data: admissionRecord,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to update admission record",
      error: error.message,
    });
  }
};

// controllers/patientHistoryMasterController.js

/**
 * Get patient history with pagination
 */
export const getPatientHistoryController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "history.admissionDate",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { "history.opdNumber": parseInt(search) || 0 },
        { "history.ipdNumber": parseInt(search) || 0 },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const histories = await PatientHistory.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("history.doctor.id", "name usertype")
      .populate("history.section.id", "name type");

    const total = await PatientHistory.countDocuments(query);

    res.status(200).json({
      success: true,
      data: histories,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: histories.length,
        totalRecords: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient histories",
      error: error.message,
    });
  }
};

/**
 * Get specific patient history by patient ID
 */
export const getPatientHistoryByIdController = async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await PatientHistory.findOne({ patientId })
      .populate("history.doctor.id", "name usertype")
      .populate("history.section.id", "name type")
      .populate("history.followUps.nurseId", "name")
      .populate("history.fourHrFollowUpSchema.nurseId", "name");

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Patient history not found",
      });
    }

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient history",
      error: error.message,
    });
  }
};

/**
 * Update patient history basic info
 */
export const updatePatientHistoryBasicController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.patientId;
    delete updates.history;
    delete updates._id;

    const history = await PatientHistory.findOneAndUpdate(
      { patientId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Patient history not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Patient history updated successfully",
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update patient history",
      error: error.message,
    });
  }
};

/**
 * Update specific history record
 */
export const updateHistoryRecordController = async (req, res) => {
  try {
    const { patientId, historyId } = req.params;
    const updates = req.body;

    // Convert date strings to Date objects
    if (updates.admissionDate) {
      updates.admissionDate = new Date(updates.admissionDate);
    }
    if (updates.dischargeDate) {
      updates.dischargeDate = new Date(updates.dischargeDate);
    }

    const history = await PatientHistory.findOne({ patientId });
    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Patient history not found",
      });
    }

    const historyRecord = history.history.id(historyId);
    if (!historyRecord) {
      return res.status(404).json({
        success: false,
        message: "History record not found",
      });
    }

    // Update allowed fields
    const allowedFields = [
      "opdNumber",
      "ipdNumber",
      "admissionDate",
      "dischargeDate",
      "status",
      "patientType",
      "admitNotes",
      "reasonForAdmission",
      "conditionAtDischarge",
      "amountToBePayed",
      "weight",
      "symptoms",
      "initialDiagnosis",
      "bedNumber",
      "previousRemainingAmount",
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        historyRecord[field] = updates[field];
      }
    });

    await history.save();

    res.status(200).json({
      success: true,
      message: "History record updated successfully",
      data: historyRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update history record",
      error: error.message,
    });
  }
};

// controllers/patientAdmissionController.js

/**
 * Re-admit discharged patient (restore from history)
 */
export const readmitPatientController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { historyRecordId } = req.body;

    // Find patient history
    const history = await PatientHistory.findOne({ patientId });
    if (!history) {
      return res.status(404).json({
        success: false,
        message: "Patient history not found",
      });
    }

    // Get the specific history record (latest discharged one if not specified)
    let historyRecord;
    if (historyRecordId) {
      historyRecord = history.history.id(historyRecordId);
    } else {
      // Get the latest discharged record
      const dischargedRecords = history.history.filter(
        (record) => record.dischargeDate
      );
      historyRecord = dischargedRecords[dischargedRecords.length - 1];
    }

    if (!historyRecord) {
      return res.status(404).json({
        success: false,
        message: "No discharged record found for re-admission",
      });
    }

    // Check if patient already exists in active patients
    const existingPatient = await patientSchema.findOne({ patientId });
    if (existingPatient && !existingPatient.discharged) {
      return res.status(400).json({
        success: false,
        message: "Patient is already active",
      });
    }

    // Create new admission record based on history
    const newAdmissionRecord = {
      opdNumber: historyRecord.opdNumber,
      ipdNumber: historyRecord.ipdNumber,
      admissionDate: new Date(),
      status: "Active",
      patientType: historyRecord.patientType || "Internal",
      admitNotes: "Re-admitted from history",
      reasonForAdmission: historyRecord.reasonForAdmission,
      doctor: historyRecord.doctor,
      section: historyRecord.section,
      bedNumber: historyRecord.bedNumber,
      weight: historyRecord.weight,
      symptoms: historyRecord.symptoms,
      initialDiagnosis: historyRecord.initialDiagnosis,
      amountToBePayed: historyRecord.previousRemainingAmount || 0,
      conditionAtDischarge: "Discharged",
    };

    let patient;
    if (existingPatient) {
      // Update existing patient
      existingPatient.discharged = false;
      existingPatient.admissionRecords.push(newAdmissionRecord);
      patient = await existingPatient.save();
    } else {
      // Create new patient record
      patient = new patientSchema({
        patientId: history.patientId,
        name: history.name,
        age: history.age,
        gender: history.gender,
        contact: history.contact,
        address: history.address,
        dob: history.dob,
        imageUrl: history.imageUrl,
        discharged: false,
        pendingAmount: historyRecord.previousRemainingAmount || 0,
        admissionRecords: [newAdmissionRecord],
      });
      await patient.save();
    }

    res.status(200).json({
      success: true,
      message: "Patient re-admitted successfully",
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to re-admit patient",
      error: error.message,
    });
  }
};

/**
 * Get available discharged patients for re-admission
 */
export const getDischargedPatientsController = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
      ];
    }

    // Find patients with discharge history
    const histories = await PatientHistory.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("history.doctor.id", "name usertype");

    // Filter to only include patients with at least one discharged record
    const dischargedPatients = histories
      .filter((history) =>
        history.history.some((record) => record.dischargeDate)
      )
      .map((history) => {
        const latestDischarge = history.history
          .filter((record) => record.dischargeDate)
          .sort(
            (a, b) => new Date(b.dischargeDate) - new Date(a.dischargeDate)
          )[0];

        return {
          ...history.toObject(),
          latestDischarge,
        };
      });

    const total = dischargedPatients.length;

    res.status(200).json({
      success: true,
      data: dischargedPatients,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: dischargedPatients.length,
        totalRecords: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch discharged patients",
      error: error.message,
    });
  }
};

// controllers/patientNumberController.js

/**
 * Update OPD/IPD numbers
 */
export const updatePatientNumbersController = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const { opdNumber, ipdNumber } = req.body;

    if (!opdNumber && !ipdNumber) {
      return res.status(400).json({
        success: false,
        message: "At least one number (OPD or IPD) is required",
      });
    }

    // Check if numbers are already in use
    if (opdNumber) {
      console.log(`Checking if OPD number ${opdNumber} is already in use`);
      const existingOPD = await patientSchema.findByOPDNumber(opdNumber);
      if (existingOPD && existingOPD.patientId !== patientId) {
        // Find the specific admission record with this OPD number
        const existingAdmission = existingOPD.admissionRecords.find(
          (record) => record.opdNumber === parseInt(opdNumber)
        );

        console.log(
          `OPD conflict found: ${existingOPD.patientId}, ${existingOPD.name}`
        );

        return res.status(400).json({
          success: false,
          message: `OPD number ${opdNumber} is already in use`,
          conflictDetails: {
            patientId: existingOPD.patientId,
            patientName: existingOPD.name,
            admissionDate: existingAdmission
              ? existingAdmission.admissionDate
              : null,
            admissionStatus: existingAdmission
              ? existingAdmission.status
              : null,
          },
        });
      }
    }

    if (ipdNumber) {
      const existingIPD = await patientSchema.findByIPDNumber(ipdNumber);
      if (existingIPD && existingIPD.patientId !== patientId) {
        return res.status(400).json({
          success: false,
          message: `IPD number ${ipdNumber} is already in use`,
        });
      }
    }

    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found",
      });
    }

    // Update numbers
    if (opdNumber) admissionRecord.opdNumber = opdNumber;
    if (ipdNumber) admissionRecord.ipdNumber = ipdNumber;

    await patient.save();

    res.status(200).json({
      success: true,
      message: "Patient numbers updated successfully",
      data: {
        opdNumber: admissionRecord.opdNumber,
        ipdNumber: admissionRecord.ipdNumber,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update patient numbers",
      error: error.message,
    });
  }
};

/**
 * Get next available OPD/IPD numbers
 */
export const getNextAvailableNumbersController = async (req, res) => {
  try {
    // Get highest OPD number
    const highestOPD = await patientSchema
      .findOne({}, { "admissionRecords.opdNumber": 1 })
      .sort({ "admissionRecords.opdNumber": -1 });

    // Get highest IPD number
    const highestIPD = await patientSchema
      .findOne({}, { "admissionRecords.ipdNumber": 1 })
      .sort({ "admissionRecords.ipdNumber": -1 });

    let nextOPD = 1;
    let nextIPD = 1;

    if (highestOPD && highestOPD.admissionRecords.length > 0) {
      const maxOPD = Math.max(
        ...highestOPD.admissionRecords.map((r) => r.opdNumber || 0)
      );
      nextOPD = maxOPD + 1;
    }

    if (highestIPD && highestIPD.admissionRecords.length > 0) {
      const maxIPD = Math.max(
        ...highestIPD.admissionRecords
          .map((r) => r.ipdNumber || 0)
          .filter((n) => n > 0)
      );
      nextIPD = maxIPD + 1;
    }

    res.status(200).json({
      success: true,
      data: {
        nextOPDNumber: nextOPD,
        nextIPDNumber: nextIPD,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get next available numbers",
      error: error.message,
    });
  }
};
export const getPatientListController = async (req, res) => {
  console.log("Fetching patient list with query:", req.query);
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "all", // all, active, discharged
      sortBy = "admissionDate",
      sortOrder = "desc",
      includeHistory = "false",
    } = req.query;

    // Build query for current patients
    const query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { "admissionRecords.opdNumber": parseInt(search) || 0 },
        { "admissionRecords.ipdNumber": parseInt(search) || 0 },
      ];
    }

    // Filter by status
    if (status === "active") {
      query.discharged = false;
    } else if (status === "discharged") {
      query.discharged = true;
    }

    // Sort options
    const sortOptions = {};
    if (sortBy === "admissionDate") {
      sortOptions["admissionRecords.admissionDate"] =
        sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Fetch current patients
    const currentPatients = await patientSchema
      .find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("admissionRecords.doctor.id", "name usertype")
      .populate("admissionRecords.section.id", "name type")
      .lean();

    // Process current patients data
    let processedPatients = currentPatients.map((patient) => {
      const latestAdmission =
        patient.admissionRecords && patient.admissionRecords.length > 0
          ? patient.admissionRecords[patient.admissionRecords.length - 1]
          : null;

      return {
        // Basic Patient Info
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        address: patient.address,

        // Status Info
        discharged: patient.discharged,
        pendingAmount: patient.pendingAmount,

        // Current Admission Details
        currentAdmission: latestAdmission
          ? {
              admissionId: latestAdmission._id,
              opdNumber: latestAdmission.opdNumber,
              ipdNumber: latestAdmission.ipdNumber,
              admissionDate: latestAdmission.admissionDate,
              dischargeDate: latestAdmission.dischargeDate,
              status: latestAdmission.status,
              patientType: latestAdmission.patientType,
              reasonForAdmission: latestAdmission.reasonForAdmission,
              initialDiagnosis: latestAdmission.initialDiagnosis,
              conditionAtDischarge: latestAdmission.conditionAtDischarge,
              amountToBePayed: latestAdmission.amountToBePayed,
              bedNumber: latestAdmission.bedNumber,
              doctor: {
                name: latestAdmission.doctor?.name,
                usertype: latestAdmission.doctor?.usertype,
              },
              section: {
                name: latestAdmission.section?.name,
                type: latestAdmission.section?.type,
              },
            }
          : null,

        // All OPD/IPD Numbers for this patient
        allNumbers:
          patient.admissionRecords?.map((record) => ({
            admissionId: record._id,
            opdNumber: record.opdNumber,
            ipdNumber: record.ipdNumber,
            admissionDate: record.admissionDate,
            dischargeDate: record.dischargeDate,
            status: record.status,
          })) || [],

        // Quick Stats
        totalAdmissions: patient.admissionRecords?.length || 0,
        hasIPDHistory:
          patient.admissionRecords?.some((record) => record.ipdNumber) || false,
      };
    });

    // Include historical data if requested
    if (includeHistory === "true") {
      const historyQuery = search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { patientId: { $regex: search, $options: "i" } },
              { contact: { $regex: search, $options: "i" } },
              { "history.opdNumber": parseInt(search) || 0 },
              { "history.ipdNumber": parseInt(search) || 0 },
            ],
          }
        : {};

      const historicalPatients = await PatientHistory.find(historyQuery)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const processedHistory = historicalPatients.map((historyRecord) => ({
        patientId: historyRecord.patientId,
        name: historyRecord.name,
        age: historyRecord.age,
        gender: historyRecord.gender,
        contact: historyRecord.contact,
        address: historyRecord.address,

        // Status
        discharged: true, // All history records are discharged
        pendingAmount: 0,

        // Latest Historical Record
        currentAdmission: null, // No current admission for historical records

        // Historical admissions with OPD/IPD numbers
        allNumbers:
          historyRecord.history?.map((record) => ({
            admissionId: record._id,
            opdNumber: record.opdNumber,
            ipdNumber: record.ipdNumber,
            admissionDate: record.admissionDate,
            dischargeDate: record.dischargeDate,
            status: "Discharged",
          })) || [],

        // Stats
        totalAdmissions: historyRecord.history?.length || 0,
        hasIPDHistory:
          historyRecord.history?.some((record) => record.ipdNumber) || false,

        // Mark as historical
        isHistoricalRecord: true,
      }));

      // Combine current and historical (avoid duplicates)
      const currentPatientIds = new Set(
        processedPatients.map((p) => p.patientId)
      );
      const uniqueHistoricalPatients = processedHistory.filter(
        (hp) => !currentPatientIds.has(hp.patientId)
      );

      processedPatients = [...processedPatients, ...uniqueHistoricalPatients];
    }

    // Get total count
    const totalCurrent = await patientSchema.countDocuments(query);
    const totalHistorical =
      includeHistory === "true"
        ? await PatientHistory.countDocuments(
            search
              ? {
                  $or: [
                    { name: { $regex: search, $options: "i" } },
                    { patientId: { $regex: search, $options: "i" } },
                  ],
                }
              : {}
          )
        : 0;

    const totalRecords =
      totalCurrent + (includeHistory === "true" ? totalHistorical : 0);

    // Get system statistics
    const [opdCounter, ipdCounter] = await Promise.all([
      PatientCounter.getCurrentSequenceValue("opdNumber"),
      PatientCounter.getCurrentSequenceValue("ipdNumber"),
    ]);

    const systemStats = {
      totalActivePatients: await patientSchema.countDocuments({
        discharged: false,
      }),
      totalDischargedPatients: await patientSchema.countDocuments({
        discharged: true,
      }),
      totalHistoricalRecords: await PatientHistory.countDocuments(),
      nextOPDNumber: opdCounter + 1,
      nextIPDNumber: ipdCounter + 1,
      todayAdmissions: await patientSchema.countDocuments({
        "admissionRecords.admissionDate": {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    };

    res.status(200).json({
      success: true,
      data: processedPatients,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalRecords / limit),
        count: processedPatients.length,
        totalRecords,
        totalCurrent,
        totalHistorical: includeHistory === "true" ? totalHistorical : 0,
      },
      systemStats,
      filters: {
        search,
        status,
        sortBy,
        sortOrder,
        includeHistory: includeHistory === "true",
      },
    });
  } catch (error) {
    console.error("Error in getPatientListController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient list",
      error: error.message,
    });
  }
};
export const getAllPatientsLastRecords = async (req, res) => {
  try {
    // Extract pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Extract filter parameters
    const {
      search,
      gender,
      ageMin,
      ageMax,
      conditionAtDischarge,
      doctorName,
      admissionDateFrom,
      admissionDateTo,
      dischargeDateFrom,
      dischargeDateTo,
      opdNumber,
      ipdNumber,
      sortBy = "name",
      sortOrder = "asc",
      hasIpdNumber,
    } = req.query;

    // Build MongoDB aggregation pipeline
    const pipeline = [];

    // Stage 1: Match documents based on filters
    const matchStage = {};

    // Search filter (name, contact, patientId)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      matchStage.$or = [
        { name: searchRegex },
        { contact: searchRegex },
        { patientId: searchRegex },
      ];
    }

    // Gender filter
    if (gender && ["Male", "Female", "Other"].includes(gender)) {
      matchStage.gender = gender;
    }

    // Age range filter
    if (ageMin || ageMax) {
      matchStage.age = {};
      if (ageMin) matchStage.age.$gte = parseInt(ageMin);
      if (ageMax) matchStage.age.$lte = parseInt(ageMax);
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Stage 2: Add computed field for last record and apply history filters
    pipeline.push({
      $addFields: {
        lastRecord: { $arrayElemAt: ["$history", -1] },
        totalAdmissions: { $size: "$history" },
      },
    });

    // Stage 3: Match based on last record filters
    const lastRecordMatchStage = {};

    // Condition at discharge filter
    if (
      conditionAtDischarge &&
      [
        "Discharged",
        "Transferred",
        "D.A.M.A.",
        "Absconded",
        "Expired",
      ].includes(conditionAtDischarge)
    ) {
      lastRecordMatchStage["lastRecord.conditionAtDischarge"] =
        conditionAtDischarge;
    }

    // Doctor name filter
    if (doctorName && doctorName.trim()) {
      lastRecordMatchStage["lastRecord.doctor.name"] = new RegExp(
        doctorName.trim(),
        "i"
      );
    }

    // OPD number filter
    if (opdNumber) {
      lastRecordMatchStage["lastRecord.opdNumber"] = parseInt(opdNumber);
    }

    // IPD number filter
    if (ipdNumber) {
      lastRecordMatchStage["lastRecord.ipdNumber"] = parseInt(ipdNumber);
    }

    // Has IPD number filter
    if (hasIpdNumber !== undefined) {
      if (hasIpdNumber === "true") {
        lastRecordMatchStage["lastRecord.ipdNumber"] = {
          $exists: true,
          $ne: null,
        };
      } else if (hasIpdNumber === "false") {
        lastRecordMatchStage["lastRecord.ipdNumber"] = { $exists: false };
      }
    }

    // Date range filters
    if (admissionDateFrom || admissionDateTo) {
      lastRecordMatchStage["lastRecord.admissionDate"] = {};
      if (admissionDateFrom) {
        lastRecordMatchStage["lastRecord.admissionDate"].$gte = new Date(
          admissionDateFrom
        );
      }
      if (admissionDateTo) {
        lastRecordMatchStage["lastRecord.admissionDate"].$lte = new Date(
          admissionDateTo
        );
      }
    }

    if (dischargeDateFrom || dischargeDateTo) {
      lastRecordMatchStage["lastRecord.dischargeDate"] = {};
      if (dischargeDateFrom) {
        lastRecordMatchStage["lastRecord.dischargeDate"].$gte = new Date(
          dischargeDateFrom
        );
      }
      if (dischargeDateTo) {
        lastRecordMatchStage["lastRecord.dischargeDate"].$lte = new Date(
          dischargeDateTo
        );
      }
    }

    if (Object.keys(lastRecordMatchStage).length > 0) {
      pipeline.push({ $match: lastRecordMatchStage });
    }

    // Stage 4: Project final structure
    pipeline.push({
      $project: {
        patientId: 1,
        name: 1,
        gender: 1,
        age: 1,
        contact: 1,
        address: 1,
        dob: 1,
        imageUrl: 1,
        totalAdmissions: 1,
        lastRecord: {
          $cond: {
            if: { $gt: [{ $size: "$history" }, 0] },
            then: {
              admissionId: "$lastRecord.admissionId",
              opdNumber: "$lastRecord.opdNumber",
              ipdNumber: "$lastRecord.ipdNumber",
              admissionDate: "$lastRecord.admissionDate",
              dischargeDate: "$lastRecord.dischargeDate",
              status: "$lastRecord.status",
              patientType: "$lastRecord.patientType",
              reasonForAdmission: "$lastRecord.reasonForAdmission",
              conditionAtDischarge: "$lastRecord.conditionAtDischarge",
              amountToBePayed: "$lastRecord.amountToBePayed",
              weight: "$lastRecord.weight",
              initialDiagnosis: "$lastRecord.initialDiagnosis",
              doctor: "$lastRecord.doctor",
              section: "$lastRecord.section",
              bedNumber: "$lastRecord.bedNumber",
              // Calculate length of stay
              lengthOfStay: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ["$lastRecord.dischargeDate", null] },
                      { $ne: ["$lastRecord.admissionDate", null] },
                    ],
                  },
                  then: {
                    $divide: [
                      {
                        $subtract: [
                          "$lastRecord.dischargeDate",
                          "$lastRecord.admissionDate",
                        ],
                      },
                      86400000, // Convert milliseconds to days
                    ],
                  },
                  else: null,
                },
              },
            },
            else: null,
          },
        },
      },
    });

    // Stage 5: Sort
    const sortStage = {};
    const validSortFields = [
      "name",
      "age",
      "gender",
      "patientId",
      "totalAdmissions",
      "lastRecord.admissionDate",
      "lastRecord.dischargeDate",
      "lastRecord.opdNumber",
      "lastRecord.ipdNumber",
    ];

    if (validSortFields.includes(sortBy)) {
      sortStage[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortStage.name = 1; // Default sort
    }

    pipeline.push({ $sort: sortStage });

    // Execute aggregation with pagination
    const [results, totalCount] = await Promise.all([
      PatientHistory.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit },
      ]),
      PatientHistory.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Calculate statistics
    const statistics = await PatientHistory.aggregate([
      ...pipeline.slice(0, -2), // Exclude sort and pagination stages
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          avgAge: { $avg: "$age" },
          genderDistribution: {
            $push: "$gender",
          },
          dischargeConditions: {
            $push: "$lastRecord.conditionAtDischarge",
          },
          avgLengthOfStay: {
            $avg: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$lastRecord.dischargeDate", null] },
                    { $ne: ["$lastRecord.admissionDate", null] },
                  ],
                },
                then: {
                  $divide: [
                    {
                      $subtract: [
                        "$lastRecord.dischargeDate",
                        "$lastRecord.admissionDate",
                      ],
                    },
                    86400000,
                  ],
                },
                else: null,
              },
            },
          },
        },
      },
      {
        $project: {
          totalPatients: 1,
          avgAge: { $round: ["$avgAge", 1] },
          avgLengthOfStay: { $round: ["$avgLengthOfStay", 1] },
          genderStats: {
            male: {
              $size: {
                $filter: {
                  input: "$genderDistribution",
                  cond: { $eq: ["$$this", "Male"] },
                },
              },
            },
            female: {
              $size: {
                $filter: {
                  input: "$genderDistribution",
                  cond: { $eq: ["$$this", "Female"] },
                },
              },
            },
            other: {
              $size: {
                $filter: {
                  input: "$genderDistribution",
                  cond: { $eq: ["$$this", "Other"] },
                },
              },
            },
          },
          dischargeStats: {
            discharged: {
              $size: {
                $filter: {
                  input: "$dischargeConditions",
                  cond: { $eq: ["$$this", "Discharged"] },
                },
              },
            },
            transferred: {
              $size: {
                $filter: {
                  input: "$dischargeConditions",
                  cond: { $eq: ["$$this", "Transferred"] },
                },
              },
            },
            dama: {
              $size: {
                $filter: {
                  input: "$dischargeConditions",
                  cond: { $eq: ["$$this", "D.A.M.A."] },
                },
              },
            },
            absconded: {
              $size: {
                $filter: {
                  input: "$dischargeConditions",
                  cond: { $eq: ["$$this", "Absconded"] },
                },
              },
            },
            expired: {
              $size: {
                $filter: {
                  input: "$dischargeConditions",
                  cond: { $eq: ["$$this", "Expired"] },
                },
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        recordsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      filters: {
        applied: {
          search: search || null,
          gender: gender || null,
          ageRange: ageMin || ageMax ? `${ageMin || 0}-${ageMax || "∞"}` : null,
          conditionAtDischarge: conditionAtDischarge || null,
          doctorName: doctorName || null,
          opdNumber: opdNumber || null,
          ipdNumber: ipdNumber || null,
          hasIpdNumber: hasIpdNumber || null,
          admissionDateRange:
            admissionDateFrom || admissionDateTo
              ? `${admissionDateFrom || "start"} to ${admissionDateTo || "end"}`
              : null,
          dischargeDateRange:
            dischargeDateFrom || dischargeDateTo
              ? `${dischargeDateFrom || "start"} to ${dischargeDateTo || "end"}`
              : null,
        },
        sortBy,
        sortOrder,
      },
      statistics: statistics[0] || {
        totalPatients: 0,
        avgAge: 0,
        avgLengthOfStay: 0,
        genderStats: { male: 0, female: 0, other: 0 },
        dischargeStats: {
          discharged: 0,
          transferred: 0,
          dama: 0,
          absconded: 0,
          expired: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching patients last records:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

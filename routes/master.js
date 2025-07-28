import express from "express";
import {
  // Patient Controllers
  getAllPatientsController,
  getPatientByIdController,
  getPatientByNumberController,
  updatePatientBasicInfoController,
  updateAdmissionRecordController,

  // Patient History Controllers
  getPatientHistoryController,
  getPatientHistoryByIdController,
  updatePatientHistoryBasicController,
  updateHistoryRecordController,

  // Patient Admission Controllers
  readmitPatientController,
  getDischargedPatientsController,

  // Patient Number Controllers
  updatePatientNumbersController,
  getNextAvailableNumbersController,
  getPatientListController,
  getAllPatientsLastRecords,
} from "../controllers/masterController.js";

const masterRouter = express.Router();

// =============================================================================
// PATIENT MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/patients
 * @desc    Get all patients with pagination, search, and filters
 * @access  Admin
 * @params  ?page=1&limit=10&search=John&discharged=false&sortBy=name&sortOrder=asc
 */
masterRouter.get("/patients", getAllPatientsController);
masterRouter.get("/getAllPatientsLastRecords", getAllPatientsLastRecords);

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get patient by patient ID with full details
 * @access  Admin
 */
masterRouter.get("/patients/:patientId", getPatientByIdController);

/**
 * @route   GET /api/patients/number/:type/:number
 * @desc    Get patient by OPD or IPD number
 * @access  Admin
 * @params  type: 'opd' or 'ipd', number: the actual number
 */
masterRouter.get(
  "/patients/number/:type/:number",
  getPatientByNumberController
);

/**
 * @route   PUT /api/patients/:patientId/basic
 * @desc    Update patient basic information (name, age, contact, etc.)
 * @access  Admin
 */
masterRouter.patch(
  "/patients/:patientId/basic",
  updatePatientBasicInfoController
);

/**
 * @route   PUT /api/patients/:patientId/admission/:admissionId
 * @desc    Update specific admission record
 * @access  Admin
 */
masterRouter.put(
  "/patients/:patientId/admission/:admissionId",
  updateAdmissionRecordController
);

// =============================================================================
// PATIENT HISTORY MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/patient-history
 * @desc    Get all patient histories with pagination and search
 * @access  Admin
 * @params  ?page=1&limit=10&search=John&sortBy=history.admissionDate&sortOrder=desc
 */
masterRouter.get("/patient-history", getPatientHistoryController);

/**
 * @route   GET /api/patient-history/:patientId
 * @desc    Get patient history by patient ID
 * @access  Admin
 */
masterRouter.get(
  "/patient-history/:patientId",
  getPatientHistoryByIdController
);

/**
 * @route   PUT /api/patient-history/:patientId/basic
 * @desc    Update patient history basic information
 * @access  Admin
 */
masterRouter.put(
  "/patient-history/:patientId/basic",
  updatePatientHistoryBasicController
);

/**
 * @route   PUT /api/patient-history/:patientId/record/:historyId
 * @desc    Update specific history record
 * @access  Admin
 */
masterRouter.put(
  "/patient-history/:patientId/record/:historyId",
  updateHistoryRecordController
);

// =============================================================================
// PATIENT RE-ADMISSION ROUTES
// =============================================================================

/**
 * @route   GET /api/discharged-patients
 * @desc    Get all discharged patients available for re-admission
 * @access  Admin
 * @params  ?page=1&limit=10&search=John
 */
masterRouter.get("/discharged-patients", getDischargedPatientsController);

/**
 * @route   POST /api/patients/:patientId/readmit
 * @desc    Re-admit a discharged patient
 * @access  Admin
 * @body    { historyRecordId?: string } (optional, will use latest discharge if not provided)
 */
masterRouter.post("/patients/:patientId/readmit", readmitPatientController);

// =============================================================================
// PATIENT NUMBER MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   PUT /api/patients/:patientId/admission/:admissionId/numbers
 * @desc    Update OPD/IPD numbers for specific admission
 * @access  Admin
 * @body    { opdNumber?: number, ipdNumber?: number }
 */
masterRouter.patch(
  "/patients/:patientId/admission/:admissionId/numbers",
  updatePatientNumbersController
);

/**
 * @route   GET /api/next-available-numbers
 * @desc    Get next available OPD and IPD numbers
 * @access  Admin
 */
masterRouter.get("/next-available-numbers", getNextAvailableNumbersController);
masterRouter.get("/getPatientListController", getPatientListController);
export default masterRouter;

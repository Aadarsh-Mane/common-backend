import express from "express";
import { signinDoctor, signinNurse } from "../controllers/userController.js";
// import { signin, signup } from "../controllers/userController.js";
import { auth } from "./../middleware/auth.js";
import {
  add2hrFollowUp,
  addFollowUp,
  get2hrFollowups,
  getAdmissionRecordsById,
  getFollowups,
  getLastFollowUpTime,
  getNurseProfile,
  seeMyAttendance,
} from "../controllers/nurseController.js";
import {
  assignNurseToWard,
  checkIn,
  checkOut,
  getAllActivePatients,
  getAllEmergencyMedications,
  getAllNurses,
  getAllWards,
  getAttendanceSummary,
  getEmergencyMedications,
  getMyAttendance,
  getMyEmergencyMedications,
  getNurseWards,
  getPatientsForEmergencyMedication,
  getStaffAttendance,
  getWardPatients,
  getWardPatientsDetail,
  getWardTreatmentTasks,
  markAttendanceManually,
  markCheckOutManually,
  markInstructionCompleted,
  markIVFluidAdministered,
  markMedicationAdministered,
  markProcedureCompleted,
  recordEmergencyMedication,
  reviewEmergencyMedication,
  updateNurseProfile,
} from "../controllers/nurse/newNurseController.js";
import {
  generateAttendanceReport,
  getAllNurseAttendance,
  getNurseAttendanceSummary,
} from "../controllers/nurse/attendanceController.js";

const nurseRouter = express.Router();

//nurseRouter.post("/signup", signup);
nurseRouter.post("/signin", signinNurse);
nurseRouter.get("/nurseProfile", auth, getNurseProfile);
nurseRouter.get("/addmissionRecords/:admissionId", getAdmissionRecordsById);
nurseRouter.post("/addFollowUp", auth, addFollowUp);
nurseRouter.post("/add2hrFollowUp", auth, add2hrFollowUp);
nurseRouter.get("/lastFollowUp", getLastFollowUpTime);
nurseRouter.get("/followups/:admissionId", getFollowups);
nurseRouter.get("/2hrfollowups/:admissionId", get2hrFollowups);
// nurseRouter.post("/check-in", auth, checkIn);
// nurseRouter.post("/check-out", auth, checkOut);
nurseRouter.get("/myAttendance", auth, seeMyAttendance);
// routes/nurseRoutes.js

const router = express.Router();

// Auth routes
// router.post("/register", nurseAuth.registerNurse); // Super admin only route
// router.post("/login", loginNurse);
// router.get("/profile", auth, nurseAuth.getNurseProfile);

// // Ward and shift management routes
nurseRouter.get("/getAllWards", getAllWards);
nurseRouter.get("/getAllNurses", getAllNurses);
nurseRouter.post("/assignNurseToWard", assignNurseToWard);
nurseRouter.get(
  "/getPatientsForEmergencyMedication",
  auth,
  getPatientsForEmergencyMedication
);
nurseRouter.get(
  "/getAllEmergencyMedications",

  getAllEmergencyMedications
);
nurseRouter.get("/getWardTreatmentTasks", auth, getWardTreatmentTasks);
nurseRouter.get("/getNurseWards", auth, getNurseWards);

// // Patient care routes
nurseRouter.get("/getWardPatients", auth, getWardPatients);
nurseRouter.get("/getWardPatientsDetail", auth, getWardPatientsDetail);
nurseRouter.post(
  "/markMedicationAdministered/:patientId/:admissionId/:medicationId",
  auth,
  markMedicationAdministered
);
nurseRouter.post(
  "/markIVFluidAdministered/:patientId/:admissionId/:ivFluidId",
  auth,
  markIVFluidAdministered
);
nurseRouter.post(
  "/markProcedureCompleted/:patientId/:admissionId/:procedureId",
  auth,
  markProcedureCompleted
);
nurseRouter.post(
  "/markInstructionCompleted/:patientId/:admissionId/:instructionId",
  auth,
  markInstructionCompleted
);
nurseRouter.get("/getAllNurseAttendance", getAllNurseAttendance);
nurseRouter.get("/getAllActivePatients", getAllActivePatients);
nurseRouter.get("/getNurseAttendanceSummary", getNurseAttendanceSummary);

/**
 * @route   GET /api/attendance/nurses/summary
 * @desc    Get attendance summary by date range
 * @access  Private (Admin/HR)
 * @query   startDate, endDate, nurseId
 */
nurseRouter.get("/getNurseAttendanceSummary", getNurseAttendanceSummary);

/**
 * @route   GET /api/attendance/nurses/dashboard
 * @desc    Get attendance dashboard data
 * @access  Private (Admin/HR)
 */
// router.get("/dashboard", auth, getAttendanceDashboard);

/**
 * @route   POST /api/attendance/nurses/report
 * @desc    Generate attendance report PDF
 * @access  Private (Admin/HR)
 * @body    startDate, endDate, nurseId, includeStats
 */
nurseRouter.post("/generateAttendanceReport", generateAttendanceReport);
nurseRouter.get("/getMyEmergencyMedications", auth, getMyEmergencyMedications);

/**
 * @route   GET /api/attendance/nurses/:nurseId
 * @desc    Get attendance for a specific nurse
 * @access  Private (Admin/HR/Nurse)
 * @params  nurseId
 * @query   page, limit, startDate, endDate, status, sortOrder
 */
// router.get("/:nurseId", auth, getNurseAttendanceById);
// router.get(
//   "/patients/:patientId/treatment/:admissionId",
//   auth,
//   patientCare.getPatientTreatment
// );
// router.post("/wards/unassign", auth, nurseManagement.unassignNurseFromWard);
// router.post("/wards/join", auth, nurseManagement.voluntaryJoinWard);
// router.post(
//   "/patients/:patientId/vitals/:admissionId",
//   auth,
//   patientCare.recordVitals
// );
// router.post(
//   "/patients/:patientId/followup/:admissionId",
//   auth,
//   patientCare.recordFollowUp
// );
// router.post(
//   "/patients/:patientId/followup4hr/:admissionId",
//   auth,
//   patientCare.recordFourHourFollowUp
// );
// router.post(
//   "/patients/:patientId/note/:admissionId",
//   auth,
//   patientCare.addNoteToDoctor
// );

// // Checklist routes
// router.post("/checklists", auth, patientCare.createNursingChecklist);
// router.patch(
//   "/checklists/:checklistId/items/:itemId",
//   auth,
//   patientCare.updateChecklistItem
// );
// router.post(
//   "/checklists/:checklistId/validate",
//   auth,
//   patientCare.validateChecklist
// );
// router.get(
//   "/patients/:patientId/checklists/:admissionId",
//   auth,
//   patientCare.getPatientChecklists
// );

// // Emergency medication routes
nurseRouter.post(
  "/recordEmergencyMedication/:patientId/:admissionId",
  auth,
  recordEmergencyMedication
);
nurseRouter.patch(
  "/reviewEmergencyMedication/:medicationId",

  reviewEmergencyMedication
);
nurseRouter.get(
  "/getEmergencyMedications/:patientId/:admissionId",

  getEmergencyMedications
);

// // Discharge coordination routes
// router.get("/discharge-patients", auth, patientCare.getPatientsForDischarge);
// router.post(
//   "/patients/:patientId/discharge-process/:admissionId",
//   auth,
//   patientCare.completeNurseDischarge
// );

// // Attendance routes
nurseRouter.post("/checkin", auth, checkIn);
nurseRouter.post("/checkout", auth, checkOut);
nurseRouter.get("/getMyAttendance", auth, getMyAttendance);
nurseRouter.get("/getStaffAttendance", getStaffAttendance);
nurseRouter.post("/markAttendanceManually", markAttendanceManually);
nurseRouter.post("/markCheckOutManually", markCheckOutManually);
nurseRouter.patch("/updateNurseProfile", auth, updateNurseProfile);
nurseRouter.get("/getAttendanceSummary", getAttendanceSummary);

export default nurseRouter;

import express from "express";
import {
  acceptAppointment,
  addIpdDetails,
  addPatient,
  admitPatientWithNotes,
  assignBedToPatient,
  assignDoctor,
  cancelDepositReceipt,
  checkDepositReceiptExists,
  createAppointment,
  createDepositReceipt,
  dischargeByReception,
  dischargePatientByReception,
  generateBillForDischargedPatient,
  generateDeclaration,
  generateDischargeSummary,
  generateFinalReceipt,
  generateIpdBill,
  generateManualDischargeSummary,
  generateOPDBill,
  generateOpdReceipt,
  generatePatientRecordPDFs,
  getAdmissionDepositSummary,
  getAdmittedPatients,
  getAiSggestions,
  getAllAppointments,
  getAllBills,
  getAllDeposits,
  getAllPatientAmountDetails,
  getAllPatientAmountDetailsWithBilling,
  getAllPatientHistories,
  getAllPatientsDeposits,
  getAppointmentsForReceptionist,
  getAvailableBeds,
  getBasicPatientInfo,
  getDepositSummaryDashboard,
  getDischargedPatientHistory,
  getDoctorAdvic1,
  getDoctorAdvice,
  getDoctorSchedule,
  getDoctorSheet,
  getDoctorsPatient,
  getLastRecordWithFollowUps,
  getLatestPatientRecord,
  getOccupiedBeds,
  getPatientSuggestions,
  listAllPatientsWithLastRecord,
  listDoctors,
  listExternalDoctors,
  listPatients,
  rescheduleAppointmentByReceptionist,
  searchPatientAppointment,
  storeIpdBill,
} from "../controllers/admin/receiptionController.js";
import {
  deleteDoctor,
  signinDoctor,
  signupDoctor,
  signupNurse,
} from "../controllers/userController.js";
import upload from "../helpers/multer.js";
import { getBillingAnalyticsDashboard } from "../controllers/anayltics.js";
import {
  deleteAdmissionRecord,
  getPatientsWithAdmissions,
  updatePatientInfo,
} from "../controllers/admin/adminController.js";

const receiptionRouter = express.Router();

receiptionRouter.post("/addDoctor", upload.single("image"), signupDoctor);
receiptionRouter.delete("/deleteDoctor/:doctorId", deleteDoctor);
receiptionRouter.post("/addNurse", signupNurse);
receiptionRouter.post("/addPatient", upload.single("image"), addPatient);
receiptionRouter.get("/listDoctors", listDoctors);
receiptionRouter.get("/listExternalDoctors", listExternalDoctors);
receiptionRouter.get("/listPatients", listPatients);
receiptionRouter.post("/assign-Doctor", assignDoctor);
receiptionRouter.get(
  "/getPatientAssignedToDoctor/:doctorName",
  getDoctorsPatient
);
receiptionRouter.post("/acceptAppointment", acceptAppointment);
receiptionRouter.post("/dischargePatient", dischargePatientByReception);
receiptionRouter.post("/bill", generateBillForDischargedPatient);
receiptionRouter.post("/generateIpdBill/:patientId", generateIpdBill);
receiptionRouter.get(
  "/checkDepositReceiptExists/:patientId/:admissionId",
  checkDepositReceiptExists
);
receiptionRouter.post("/addDoctorToPatient");
receiptionRouter.post("/createDepositReceipt", createDepositReceipt);
receiptionRouter.patch(
  "/cancelDepositReceipt/:receiptId",
  cancelDepositReceipt
);
receiptionRouter.get(
  "/getDischargedPatient/:patientId",
  getDischargedPatientHistory
);
receiptionRouter.get("/getAllDischargedPatient", listAllPatientsWithLastRecord);
receiptionRouter.get(
  "/getAdmissionDepositSummary/:admissionId",
  getAdmissionDepositSummary
);
receiptionRouter.get("/getDoctorAdvice/:patientId", getDoctorAdvice);
receiptionRouter.get("/getAllPatientsDeposits", getAllPatientsDeposits);
receiptionRouter.get(
  "/getDoctorAdvice/:patientId/:admissionId",
  getDoctorAdvic1
);
receiptionRouter.get(
  "/receipt/:patientId/:amountPaid/:billingAmount",
  generateFinalReceipt
);
receiptionRouter.get("/declaration", generateDeclaration);
receiptionRouter.get("/doctorSheet/:patientId", getDoctorSheet);
receiptionRouter.put(
  "/dischargeByReceptionCondition/:patientId/:admissionId",
  dischargeByReception
);
receiptionRouter.get(
  "/getLastFollowUps/:patientId",
  getLastRecordWithFollowUps
);
receiptionRouter.post("/generateOPDBill/:patientId", generateOPDBill);
receiptionRouter.post(
  "/generatePatientRecordPDFs/:patientId",
  generatePatientRecordPDFs
);
receiptionRouter.post("/storeIpdBill", storeIpdBill);
receiptionRouter.get(
  "/getLatestPatientRecord/:patientId",
  getLatestPatientRecord
);
receiptionRouter.post("/generateOpdReceipt", generateOpdReceipt);
receiptionRouter.get("/getAllBills", getAllBills);
receiptionRouter.post("/admitPatientWithNotes", admitPatientWithNotes);
receiptionRouter.get("/info", getBasicPatientInfo);
receiptionRouter.get("/suggestions", getPatientSuggestions);
receiptionRouter.get("/ai", getAiSggestions);
receiptionRouter.post("/createAppointment", createAppointment);
receiptionRouter.get("/getPatientsWithAdmissions", getPatientsWithAdmissions);
receiptionRouter.delete(
  "/deleteAdmissionRecord/:patientId/:admissionId",
  deleteAdmissionRecord
);
receiptionRouter.patch("/updatePatientInfo/:patientId", updatePatientInfo);
receiptionRouter.get(
  "/getAppointmentsForReceptionist",
  getAppointmentsForReceptionist
);
receiptionRouter.get(
  "/rescheduleAppointmentByReceptionist/:patientId/:appointmentId",
  rescheduleAppointmentByReceptionist
);
receiptionRouter.get("/getAllAppointments", getAllAppointments);
receiptionRouter.get("/getDoctorSchedule/:doctorId", getDoctorSchedule);
receiptionRouter.get("/searchPatientAppointment", searchPatientAppointment);
receiptionRouter.get("/getAdmittedPatients", getAdmittedPatients);
receiptionRouter.post("/assignBedToPatient", assignBedToPatient);
receiptionRouter.get("/occupiedBeds/:sectionId", getOccupiedBeds);
receiptionRouter.get("/availableBeds/:sectionId", getAvailableBeds);
receiptionRouter.post("/addIpdDetails", addIpdDetails);
receiptionRouter.get("/getAllDeposits", getAllDeposits);
receiptionRouter.get("/getDepositSummaryDashboard", getDepositSummaryDashboard);
receiptionRouter.get("/getAllPatientHistories", getAllPatientHistories);
receiptionRouter.get("/getAllPatientAmountDetails", getAllPatientAmountDetails);
receiptionRouter.post(
  "/generateManualDischargeSummary/:patientId",
  generateManualDischargeSummary
);
receiptionRouter.get(
  "/generateDischargeSummary/:patientId",
  generateDischargeSummary
);
receiptionRouter.get(
  "/getBillingAnalyticsDashboard",
  getBillingAnalyticsDashboard
);
receiptionRouter.get(
  "/getAllPatientAmountDetailsWithBilling",
  getAllPatientAmountDetailsWithBilling
);

export default receiptionRouter;

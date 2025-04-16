import express from "express";
import {
  acceptAppointment,
  addPatient,
  admitPatientWithNotes,
  assignBedToPatient,
  assignDoctor,
  createAppointment,
  dischargeByReception,
  dischargePatientByReception,
  generateBillForDischargedPatient,
  generateDeclaration,
  generateFinalReceipt,
  generateOpdBill,
  generateOpdReceipt,
  getAdmittedPatients,
  getAiSggestions,
  getAllAppointments,
  getAvailableBeds,
  getBasicPatientInfo,
  getDischargedPatientHistory,
  getDoctorAdvic1,
  getDoctorAdvice,
  getDoctorSchedule,
  getDoctorSheet,
  getDoctorsPatient,
  getLastRecordWithFollowUps,
  getOccupiedBeds,
  getPatientSuggestions,
  listAllPatientsWithLastRecord,
  listDoctors,
  listExternalDoctors,
  listPatients,
  searchPatientAppointment,
} from "../controllers/admin/receiptionController.js";
import {
  deleteDoctor,
  signinDoctor,
  signupDoctor,
  signupNurse,
} from "../controllers/userController.js";
import upload from "../helpers/multer.js";

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
receiptionRouter.post("/addDoctorToPatient");
receiptionRouter.get(
  "/getDischargedPatient/:patientId",
  getDischargedPatientHistory
);
receiptionRouter.get("/getAllDischargedPatient", listAllPatientsWithLastRecord);
receiptionRouter.get("/getDoctorAdvice/:patientId", getDoctorAdvice);
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
receiptionRouter.post("/generateOpdBill", generateOpdBill);
receiptionRouter.post("/generateOpdReceipt", generateOpdReceipt);
receiptionRouter.post("/admitPatientWithNotes", admitPatientWithNotes);
receiptionRouter.get("/info", getBasicPatientInfo);
receiptionRouter.get("/suggestions", getPatientSuggestions);
receiptionRouter.get("/ai", getAiSggestions);
receiptionRouter.post("/createAppointment", createAppointment);
receiptionRouter.get("/getAllAppointments", getAllAppointments);
receiptionRouter.get("/getDoctorSchedule/:doctorId", getDoctorSchedule);
receiptionRouter.get("/searchPatientAppointment", searchPatientAppointment);
receiptionRouter.get("/getAdmittedPatients", getAdmittedPatients);
// Assign bed to a patient
receiptionRouter.post("/assignBedToPatient", assignBedToPatient);
receiptionRouter.get("/occupiedBeds/:sectionId", getOccupiedBeds);
receiptionRouter.get("/availableBeds/:sectionId", getAvailableBeds);

export default receiptionRouter;

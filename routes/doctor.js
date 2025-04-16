import express from "express";
import {
  addConsultant,
  addDiagnosisByDoctor,
  addDoctorConsultant,
  addDoctorTreatment,
  addMedicine,
  addNotes,
  addPrescription,
  addSymptomsByDoctor,
  addVitals,
  admitPatient,
  admitPatientByDoctor,
  amountToBePayed,
  askQuestion,
  askQuestionAI,
  assignPatientToLab,
  deleteDiagnosis,
  deleteDoctorMedicine,
  deleteDoctorTreatment,
  deletedPrescription,
  deletedVitals,
  deleteNote,
  deleteSymptom,
  dischargePatient,
  fetchConsultant,
  fetchDiagnosis,
  fetchNotes,
  fetchPrescription,
  fetchSymptoms,
  fetchVitals,
  getAdmittedPatientsByDoctor,
  getAllDoctorsProfiles,
  getAllNurses,
  getAssignedPatients,
  getDiagnosis,
  getDischargedPatientsByDoctor,
  getDoctorAppointments,
  getDoctorConsulting,
  getDoctorMedicines,
  getDoctorProfile,
  getDoctorTreatment,
  getPatientHistory1,
  getPatients,
  getPatientsAssignedByDoctor,
  getPatientSuggestions,
  rescheduleAppointment,
  seeAllAttendees,
  suggestions,
  updateAppointmentStatus,
  updateConditionAtDischarge,
  updateMedicine,
} from "../controllers/doctorController.js";
import { auth } from "../middleware/auth.js";

const doctorRouter = express.Router();

doctorRouter.get("/getPatients", auth, getPatients);
doctorRouter.get("/getDoctorProfile", auth, getDoctorProfile);
doctorRouter.get("/getAllDoctorProfile", getAllDoctorsProfiles);
doctorRouter.get("/getConsultant/:admissionId", fetchConsultant);
doctorRouter.post("/addConsultant", addConsultant);
doctorRouter.post("/admitPatient", auth, admitPatientByDoctor);
doctorRouter.get("/getadmittedPatient", auth, getAdmittedPatientsByDoctor);
doctorRouter.get("/getAssignedPatients", auth, getAssignedPatients);
doctorRouter.post("/admitPatient/:patientId", auth, admitPatient);
doctorRouter.post("/assignPatient", auth, assignPatientToLab);
doctorRouter.post("/dischargePatient", auth, dischargePatient);
doctorRouter.get("/getdischargedPatient", getDischargedPatientsByDoctor);
doctorRouter.get(
  "/getDoctorAssignedPatient",
  auth,
  getPatientsAssignedByDoctor
);
doctorRouter.post("/addPresciption", addPrescription);
doctorRouter.get("/getPrescription/:patientId/:admissionId", fetchPrescription);
doctorRouter.post("/addSymptoms", addSymptomsByDoctor);
doctorRouter.get("/fetchSymptoms/:patientId/:admissionId", fetchSymptoms);
doctorRouter.post("/addVitals", addVitals);
doctorRouter.get("/fetchVitals/:patientId/:admissionId", fetchVitals);
doctorRouter.post("/addDiagnosis", addDiagnosisByDoctor);
doctorRouter.post("/addDoctorConsultant", addDoctorConsultant);
doctorRouter.get("/fetchDiagnosis/:patientId/:admissionId", fetchDiagnosis);
doctorRouter.post("/updateCondition", auth, updateConditionAtDischarge);
doctorRouter.get("/allAttendees", seeAllAttendees);
doctorRouter.get("/allNurses", getAllNurses);
doctorRouter.get("/getPatientSuggestion/:patientId", getPatientSuggestions);
doctorRouter.get("/getDiagnosis/:patientId", getDiagnosis);
doctorRouter.delete(
  "/deletePrescription/:patientId/:admissionId/:prescriptionId",
  deletedPrescription
);
doctorRouter.delete(
  "/deleteVitals/:patientId/:admissionId/:vitalsId",
  deletedVitals
);
doctorRouter.delete(
  "/deleteSymptom/:patientId/:admissionId/:symptom",
  deleteSymptom
);
doctorRouter.delete(
  "/deleteDiagnosis/:patientId/:admissionId/:diagnosis",
  deleteDiagnosis
);

doctorRouter.get(
  "/doctorConsulting/:patientId/:admissionId",
  getDoctorConsulting
);
doctorRouter.post("/amountToBePayed", amountToBePayed);
doctorRouter.get("/getPatientHistory1/:patientId", getPatientHistory1);
doctorRouter.get("/suggestions", suggestions);
doctorRouter.post("/ask-question", askQuestion);
doctorRouter.post("/ask-ai", askQuestionAI);
doctorRouter.post("/addNotes", auth, addNotes);
doctorRouter.delete("/deleteNote", deleteNote);
doctorRouter.get("/fetchNotes/:patientId/:admissionId", fetchNotes);
doctorRouter.post("/addDoctorTreatment", addDoctorTreatment);
doctorRouter.get(
  "/getDoctorTreatment/:patientId/:admissionId",
  getDoctorTreatment
);
doctorRouter.delete("/deleteDoctorTreatment", deleteDoctorTreatment);
doctorRouter.get("/getDoctorAppointments", auth, getDoctorAppointments);
doctorRouter.patch("/rescheduleAppointment", auth, rescheduleAppointment);
doctorRouter.post("/updateAppointmentStatus", auth, updateAppointmentStatus);
doctorRouter.post("/addMedicine", auth, addMedicine);
doctorRouter.get("/getDoctorMedicines", auth, getDoctorMedicines);
doctorRouter.patch("/updateMedicine/:medicineId", auth, updateMedicine);
doctorRouter.delete(
  "/deleteDoctorMedicine/:medicineId",
  auth,
  deleteDoctorMedicine
);

// userRouter.get("/profile", auth, getUserProfile);
// userRouter.patch("/edit-profile", auth, upload.single("image"), editProfile);

export default doctorRouter;

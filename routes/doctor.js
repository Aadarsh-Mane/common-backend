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
  confirmSaveSummaryToDB,
  createInvestigation,
  createSurgicalNotes,
  deleteDiagnosis,
  deleteDoctorConsultant,
  deleteDoctorMedicine,
  deleteDoctorTreatment,
  deletedPrescription,
  deletedVitals,
  deleteNote,
  deleteSurgicalNotes,
  deleteSymptom,
  dischargePatient,
  doctorBulkApproveEmergencyMedications,
  fetchConsultant,
  fetchDiagnosis,
  fetchNotes,
  fetchPrescription,
  fetchSymptoms,
  fetchVitals,
  generateDischargeSummaryByDoctor,
  generateMedicalCertificate,
  getAdmittedPatientsByDoctor,
  getAllDischargeSummaries,
  getAllDoctorsProfiles,
  getAllNurses,
  getAssignedPatients,
  getCoOccurringSymptoms,
  getDiagnosis,
  getDischargedPatientsByDoctor,
  getDoctorAppointments,
  getDoctorConsulting,
  getDoctorInvestigations,
  getDoctorMedicines,
  getDoctorProfile,
  getDoctorTreatment,
  getEmergencyMedicationsForDoctor,
  getLabReportsByAdmissionId,
  getMedicationStatus,
  getOutbreakDetection,
  getPatientAdmissionDetails,
  getPatientEmergencyMedicationsForDoctor,
  getPatientHistory1,
  getPatientInvestigationsByAdmission,
  getPatients,
  getPatientsAssignedByDoctor,
  getPatientsList,
  getPatientSuggestions,
  getSeasonalSymptoms,
  getSurgicalNotes,
  getSymptomAnalytics,
  getSymptomDemographics,
  getSymptomsByLocation,
  getSymptomTrends,
  seeAllAttendees,
  suggestions,
  updateAppointmentStatus,
  updateConditionAtDischarge,
  updateDoctorProfile,
  updateMedicine,
  updateSurgicalNotes,
} from "../controllers/doctorController.js";
import { auth } from "../middleware/auth.js";

const doctorRouter = express.Router();

doctorRouter.get("/getPatients", auth, getPatients);
doctorRouter.get("/getDoctorProfile", auth, getDoctorProfile);
doctorRouter.patch("/updateProfile", auth, updateDoctorProfile);

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
  "/getPatientAdmissionDetails/:patientId/:admissionId",
  getPatientAdmissionDetails
);
doctorRouter.get(
  "/getDoctorAssignedPatient",
  auth,
  getPatientsAssignedByDoctor
);
doctorRouter.post("/addPresciption", addPrescription);
doctorRouter.get("/getPatientsList", getPatientsList);
doctorRouter.get("/getAllDischargeSummaries", getAllDischargeSummaries);
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
doctorRouter.delete("/deleteDoctorConsultant", deleteDoctorConsultant);
doctorRouter.get("/getDiagnosis/:patientId", getDiagnosis);
doctorRouter.get(
  "/getMedicationStatus/:patientId/:admissionId",
  getMedicationStatus
);
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
doctorRouter.post(
  "/updateAppointmentStatus/:patientId/:appointmentId",
  auth,
  updateAppointmentStatus
);
// doctorRouter.patch("/rescheduleAppointment", auth, rescheduleAppointment);
// doctorRouter.post("/updateAppointmentStatus", auth, updateAppointmentStatus);
doctorRouter.post("/addMedicine", auth, addMedicine);
doctorRouter.get("/getDoctorMedicines", auth, getDoctorMedicines);
doctorRouter.patch("/updateMedicine/:medicineId", auth, updateMedicine);
doctorRouter.delete(
  "/deleteDoctorMedicine/:medicineId",
  auth,
  deleteDoctorMedicine
);
doctorRouter.get("/getSymptomAnalytics", getSymptomAnalytics);
doctorRouter.get("/getSymptomTrends", getSymptomTrends);
doctorRouter.get("/getSymptomDemographics", getSymptomDemographics);
doctorRouter.get("/getSeasonalSymptoms", getSeasonalSymptoms);
doctorRouter.get("/getCoOccurringSymptoms", getCoOccurringSymptoms);
doctorRouter.get("/getOutbreakDetection", getOutbreakDetection);
doctorRouter.get("/getSymptomsByLocation", getSymptomsByLocation);
doctorRouter.get(
  "/getLabReportsByAdmissionId/:admissionId",
  getLabReportsByAdmissionId
);

doctorRouter.post("/createInvestigation", auth, createInvestigation);
doctorRouter.post(
  "/generateMedicalCertificate",
  auth,
  generateMedicalCertificate
);
doctorRouter.get("/getDoctorInvestigations", auth, getDoctorInvestigations);
doctorRouter.get(
  "/getPatientInvestigationsByAdmission/:patientId/:admissionId",
  auth,
  getPatientInvestigationsByAdmission
);
doctorRouter.patch(
  "/doctorBulkApproveEmergencyMedications/:patientId/:admissionId",
  auth,
  doctorBulkApproveEmergencyMedications
);
doctorRouter.post(
  "/generateDischargeSummaryByDoctor/:patientId",
  auth,
  generateDischargeSummaryByDoctor
);
doctorRouter.post("/confirmSaveSummaryToDB", auth, confirmSaveSummaryToDB);
doctorRouter.get(
  "/getEmergencyMedicationsForDoctor",
  auth,
  getEmergencyMedicationsForDoctor
);
doctorRouter.get(
  "/getPatientEmergencyMedicationsForDoctor/:patientId/:admissionId",
  auth,
  getPatientEmergencyMedicationsForDoctor
);
doctorRouter.post(
  "/createSurgicalNotes/:patientId/:admissionId",
  auth,
  createSurgicalNotes
);
doctorRouter.get(
  "/getSurgicalNotes/:patientId/:admissionId",
  auth,
  getSurgicalNotes
);
doctorRouter.patch(
  "/updateSurgicalNotes/:patientId/:admissionId/:noteId",
  auth,
  updateSurgicalNotes
);
doctorRouter.delete(
  "/updateSurgicalNotes/:patientId/:admissionId/:noteId",
  auth,
  deleteSurgicalNotes
);

// userRouter.get("/profile", auth, getUserProfile);
// userRouter.patch("/edit-profile", auth, upload.single("image"), editProfile);

export default doctorRouter;

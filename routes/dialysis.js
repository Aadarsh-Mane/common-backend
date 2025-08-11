import express from "express";
import {
  registerDialysisPatient,
  startDialysisSession,
  endDialysisSession,
  addLabReport,
  prescribeMedication,
  administerMedication,
  getDialysisHistory,
  generateBilling,
  createAlert,
  addMachine,
  addInventoryItem,
  getAllDialysisPatients,
  getPatientSessions,
  createPreDialysisAssessment,
  getAvailableMachines,
  getAllMachines,
  getActiveSessions,
  getSessionDetails,
} from "../controllers/dialysisController.js";
import { auth } from "../middleware/auth.js";

const dialysisRouter = express.Router();

// 1. Patient Dialysis Registration
dialysisRouter.post(
  "/dialysis/register/:patientId/:admissionId",
  registerDialysisPatient,
  auth
);

// 2. Pre-Dialysis Assessment
dialysisRouter.post(
  "/dialysis/pre-assessment/:dialysisPatientId",
  createPreDialysisAssessment
);

// 3. Dialysis Session Management
dialysisRouter.put("/dialysis/start-session/:sessionId", startDialysisSession);
dialysisRouter.put("/dialysis/end-session/:sessionId", endDialysisSession);

// 4. Lab Reports
dialysisRouter.post("/dialysis/lab-report/:dialysisPatientId", addLabReport);

// 5. Medication Management
dialysisRouter.post(
  "/dialysis/prescribe-medication/:dialysisPatientId",
  prescribeMedication
);
dialysisRouter.put(
  "/dialysis/administer-medication/:medicationId",
  administerMedication
);

// 6. History and Reports
dialysisRouter.get("/dialysis/history/:dialysisPatientId", getDialysisHistory);
// 7. Billing
dialysisRouter.post(
  "/dialysis/billing/:dialysisPatientId/:sessionId",
  generateBilling
);

// 8. Alerts
dialysisRouter.post("/dialysis/alert/:dialysisPatientId", createAlert);

// 9. Machine Management
dialysisRouter.post("/dialysis/machine", addMachine);

// 10. Inventory Management
dialysisRouter.post("/dialysis/inventory", addInventoryItem);

// 11. Patient Management
dialysisRouter.get("/dialysis/patients", getAllDialysisPatients);
dialysisRouter.get(
  "/dialysis/patient-sessions/:dialysisPatientId",

  getPatientSessions
);
dialysisRouter.get("/dialysis/machines/available", getAvailableMachines);
dialysisRouter.get("/dialysis/machines/all", getAllMachines);

// Session Query Routes
dialysisRouter.get("/dialysis/sessions/active", getActiveSessions);
dialysisRouter.get("/dialysis/session/:sessionId", getSessionDetails);

export default dialysisRouter;

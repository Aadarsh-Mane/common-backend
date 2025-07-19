import express from "express";
import {
  getAllPatientsOverview,
  getPatientDetails,
  updatePatientBasicInfo,
  updateAdmissionRecord,
  readmitPatient,
  deletePatient,
  addNestedData,
  updateNestedData,
  deleteNestedData,
  getSystemStatistics,
} from "../controllers/masterDataController.js";

const masterRouter = express.Router();

// System overview and statistics
masterRouter.get("/statistics", getSystemStatistics);
masterRouter.get("/patients/overview", getAllPatientsOverview);

// Patient management
masterRouter.get("/patients/:patientId", getPatientDetails);
masterRouter.put("/patients/:patientId/basic-info", updatePatientBasicInfo);
masterRouter.delete("/patients/:patientId", deletePatient);

// Admission record management
masterRouter.put(
  "/patients/:patientId/admissions/:admissionId",
  updateAdmissionRecord
);
masterRouter.post("/patients/:patientId/readmit", readmitPatient);

// Nested data management (prescriptions, vitals, etc.)
masterRouter.post(
  "/patients/:patientId/admissions/:admissionId/:dataType",
  addNestedData
);
masterRouter.put(
  "/patients/:patientId/admissions/:admissionId/:dataType/:dataId",
  updateNestedData
);
masterRouter.delete(
  "/patients/:patientId/admissions/:admissionId/:dataType/:dataId",
  deleteNestedData
);

export default masterRouter;

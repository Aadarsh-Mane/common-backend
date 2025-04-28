import express from "express";

import {
  uploadInvestigationReport,
  getAllInvestigations,
  uploadReportMiddleware,
  getInvestigationDetails,
} from "../controllers/investigationController.js";
const investigateRouter = express.Router();

//investigateRouter.post("/signup", signup);
investigateRouter.get("/getAllInvestigations", getAllInvestigations);
investigateRouter.post(
  "/:id/upload-report",
  uploadReportMiddleware,
  uploadInvestigationReport
);
investigateRouter.get(
  "/getInvestigationDetails/:id",

  getInvestigationDetails
);

export default investigateRouter;

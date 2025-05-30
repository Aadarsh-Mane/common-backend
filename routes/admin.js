// routes/sectionRoutes.js
import express from "express";
import {
  createSection,
  deleteSection,
  getAllSections,
  getPatientsWithAdmissions,
  getSectionById,
  getSectionTypes,
  updateSection,
} from "../controllers/admin/adminController.js";

const adminRouter = express.Router();

// Protect all route

// Get section types
adminRouter.get("/getSectionTypes", getSectionTypes);

// Main section routes
adminRouter.get("/getAllSections", getAllSections);
adminRouter.post("/createSection", createSection);
adminRouter.get("/:id", getSectionById);
adminRouter.patch("/updateSection/:id", updateSection);
adminRouter.delete("/deleteSection/:id", deleteSection);
// adminRouter.get("/getPatientsWithAdmissions", getPatientsWithAdmissions);

export default adminRouter;

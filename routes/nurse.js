import express from "express";
import { signinDoctor, signinNurse } from "../controllers/userController.js";
// import { signin, signup } from "../controllers/userController.js";
import { auth } from "./../middleware/auth.js";
import {
  add2hrFollowUp,
  addFollowUp,
  checkIn,
  checkOut,
  get2hrFollowups,
  getAdmissionRecordsById,
  getFollowups,
  getLastFollowUpTime,
  getNurseProfile,
  seeMyAttendance,
} from "../controllers/nurseController.js";

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
nurseRouter.post("/check-in", auth, checkIn);
nurseRouter.post("/check-out", auth, checkOut);
nurseRouter.get("/myAttendance", auth, seeMyAttendance);
// nurseRouter.post("/signin", );

// nurseRouter.get("/profile", auth, getUserProfile);
// nurseRouter.patch("/edit-profile", auth, upload.single("image"), editProfile);

export default nurseRouter;

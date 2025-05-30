// models/nurseAttendance.js
import mongoose from "mongoose";

const nurseAttendanceSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  checkIn: {
    time: Date,
    latitude: Number,
    longitude: Number,
    isWithinRadius: Boolean,
  },
  checkOut: {
    time: Date,
    latitude: Number,
    longitude: Number,
    isWithinRadius: Boolean,
  },
  totalHours: Number,
  status: {
    type: String,
    enum: ["Present", "Absent", "Late", "Half-Day"],
    default: "Absent",
  },
  notes: String,
});

// Create a compound index for nurseId and date
nurseAttendanceSchema.index({ nurseId: 1, date: 1 }, { unique: true });
nurseAttendanceSchema.index({ date: 1 }); // For date-range queries
nurseAttendanceSchema.index({ status: 1 });

const NurseAttendance = mongoose.model(
  "NurseAttendance",
  nurseAttendanceSchema
);
export default NurseAttendance;

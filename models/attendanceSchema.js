import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  },
  nurseName: { type: String, required: true }, // Redundant but useful for quick access
  date: { type: Date, required: true, default: Date.now }, // The date of attendance
  checkIn: {
    time: { type: Date }, // Stores check-in time
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  checkOut: {
    time: { type: Date }, // Stores check-out time
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Partial"],
    default: "Absent",
  }, // Status to handle missing check-ins
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;

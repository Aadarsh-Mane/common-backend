import mongoose from "mongoose";

const appointmentRecordSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    doctorSpecialization: { type: String },

    symptoms: { type: String, required: true },
    appointmentType: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    date: { type: String, required: true },
    time: { type: String, required: true },

    status: {
      type: String,
      enum: [
        "waiting",
        "canceled",
        "completed",
        "rescheduled",
        "no-show",
        "accepted",
      ],
      default: "waiting",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    rescheduledTo: { type: String, default: null }, // New date if rescheduled
  },
  { timestamps: true }
);

const patientAppointmentSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true },
    patientName: { type: String, required: true },
    patientContact: { type: String, required: true },

    appointments: [appointmentRecordSchema], // Array of appointments
  },
  { timestamps: true }
);

const PatientAppointment = mongoose.model(
  "PatientAppointments",
  patientAppointmentSchema
);
export default PatientAppointment;

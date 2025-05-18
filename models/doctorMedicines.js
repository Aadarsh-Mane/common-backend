import mongoose from "mongoose";
const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  morning: {
    type: String,
    default: "0",
  },
  afternoon: {
    type: String,
    default: "0",
  },
  night: {
    type: String,
    default: "0",
  },
  comment: {
    type: String,
    default: "",
  },
  addedBy: {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "hospitalDoctor",
      required: true,
    },
    doctorName: { type: String, required: true },
  },
});

// Create separate Medicine model
const Medicine = mongoose.model("doctorMedicines", medicineSchema);
export default Medicine;

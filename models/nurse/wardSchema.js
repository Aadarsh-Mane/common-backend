// models/wardSchema.js
import mongoose from "mongoose";

const wardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // ICU, General, etc.
  floor: { type: Number },
  totalBeds: { type: Number, required: true },
  nurseAssignments: [
    {
      nurseId: { type: mongoose.Schema.Types.ObjectId, ref: "Nurse" },
      shift: { type: String, enum: ["Morning", "Evening", "Night"] },
      assignedDate: { type: Date, default: Date.now },
      isActive: { type: Boolean, default: true },
    },
  ],
});

const Ward = mongoose.model("Ward", wardSchema);
export default Ward;

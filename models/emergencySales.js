import mongoose from "mongoose";
const EmergencySaleSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  billNumber: { type: String, required: true, unique: true },
  items: [
    {
      inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
      medicine: { type: Object },
      batchNumber: String,
      quantity: Number,
      mrp: Number,
      totalAmount: Number,
      expiryDate: Date,
      distributor: Object,
    },
  ],
  emergencyItems: [
    {
      medicineName: { type: String, required: true },
      medicineId: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
      batchNumber: String,
      quantity: { type: Number, required: true },
      mrp: { type: Number, default: 0 },
      totalAmount: Number,
      isEmergencyItem: { type: Boolean, default: true },
      dosage: {
        morning: Number,
        afternoon: Number,
        night: Number,
      },
      prescribedDate: Date,
      availableStock: { type: Number, default: 0 },
    },
  ],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 18 },
  total: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "upi", "credit"],
    default: "cash",
  },
  isEmergencySale: { type: Boolean, default: true },
  patientInfo: {
    patientId: String,
    prescriptionDate: Date,
    doctorNotes: String,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "completed",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
// export default mongoose.model("EmergencySale", EmergencySaleSchema);
const EmergencySale = mongoose.model("EmergencySale", EmergencySaleSchema);
export default EmergencySale;

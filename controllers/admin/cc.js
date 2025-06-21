import PatientHistory from "../../models/patientHistorySchema.js";

// Check what old discharged patients actually look like
const oldDischargedPatients = await PatientHistory.aggregate([
  { $unwind: "$history" },
  {
    $match: {
      "history.dischargeDate": { $exists: true, $ne: null },
      "history.admissionDate": { $lt: new Date("2025-06-10") }, // Before your schema change
    },
  },
  {
    $project: {
      patientId: 1,
      "history.dischargeDate": 1,
      "history.dischargedByReception": 1,
      "history.admissionDate": 1,
    },
  },
]);

console.log("Old discharged patients:", oldDischargedPatients);

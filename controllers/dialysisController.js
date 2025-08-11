// import {

import {
  DialysisRegistration,
  DialysisSession,
  DialysisLabReport,
  DialysisMedication,
  DialysisBilling,
  DialysisAlert,
  DialysisMachine,
  DialysisInventory,
} from "../models/dialysisSchema.js";
import patientSchema from "../models/patientSchema.js";
import { generatePdf } from "../services/pdfGenerator.js";
import { uploadToDrive } from "../services/uploader.js";
import {
  generateDialysisBillingPDF,
  generateDialysisHistoryPDF,
  generateDialysisRegistrationPDF,
  generateDialysisSessionPDF,
} from "../utils/dialysis.js";

// 1. Patient Dialysis Registration
export const registerDialysisPatient = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    const {
      dialysisType,
      accessType,
      nephrologistId,
      nephrologistName,
      dialysisSchedule,
      dialysisStartDate,
    } = req.body;

    // Verify patient exists
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Generate unique dialysis patient ID
    const dialysisPatientId = `DIAL-${patientId}-${Date.now()}`;

    // Create dialysis registration
    const dialysisRegistration = new DialysisRegistration({
      dialysisPatientId,
      patientId,
      admissionId,
      dialysisType,
      accessType,
      nephrologist: {
        id: nephrologistId,
        name: nephrologistName,
      },
      dialysisSchedule,
      dialysisStartDate: new Date(dialysisStartDate),
      registeredBy: req.userId,
    });

    await dialysisRegistration.save();

    // Generate registration PDF
    const pdfContent = generateDialysisRegistrationPDF(
      dialysisRegistration,
      patient
    );
    const pdfBuffer = await generatePdf(pdfContent);

    // Upload PDF
    const fileName = `dialysis-registration-${dialysisPatientId}.pdf`;
    const driveLink = await uploadToDrive(
      pdfBuffer,
      fileName,
      "1MKYZ4fIUzERPyYzL_8I101agWemxVXts"
    );

    res.status(201).json({
      message: "Dialysis patient registered successfully",
      dialysisPatientId,
      registrationPdf: driveLink,
      data: dialysisRegistration,
    });
  } catch (error) {
    console.error("Error registering dialysis patient:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 2. Pre-Dialysis Assessment
export const createPreDialysisAssessment = async (req, res) => {
  try {
    const { dialysisPatientId } = req.params;
    const {
      preWeight,
      preBloodPressure,
      temperature,
      pulse,
      accessSiteCondition,
      complaints,
      assessedBy,
    } = req.body;

    // Verify dialysis patient exists
    const dialysisPatient = await DialysisRegistration.findOne({
      dialysisPatientId,
    });
    if (!dialysisPatient) {
      return res.status(404).json({ message: "Dialysis patient not found" });
    }

    // Create new session
    const session = new DialysisSession({
      dialysisPatientId,
      preDialysisAssessment: {
        dialysisPatientId,
        dateTime: new Date(),
        preWeight,
        preBloodPressure,
        temperature,
        pulse,
        accessSiteCondition,
        complaints,
        assessedBy,
      },
    });

    await session.save();

    res.status(201).json({
      message: "Pre-dialysis assessment completed",
      sessionId: session._id,
      data: session.preDialysisAssessment,
    });
  } catch (error) {
    console.error("Error creating pre-dialysis assessment:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 3. Start Dialysis Session
export const startDialysisSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      machineId,
      dialyzerType,
      dryWeight,
      bloodFlowRate,
      dialysateFlowRate,
      heparinDosage,
      conductivity,
      dialysateTemperature,
      technicianName,
    } = req.body;

    // Find session
    const session = await DialysisSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Check if machine is available
    const machine = await DialysisMachine.findOne({
      machineId,
      status: "Active",
    });
    if (!machine) {
      return res.status(400).json({ message: "Machine not available" });
    }

    // Update session with dialysis details
    session.machineId = machineId;
    session.dialyzerType = dialyzerType;
    session.sessionStartTime = new Date();
    session.dryWeight = dryWeight;
    session.bloodFlowRate = bloodFlowRate;
    session.dialysateFlowRate = dialysateFlowRate;
    session.heparinDosage = heparinDosage;
    session.conductivity = conductivity;
    session.dialysateTemperature = dialysateTemperature;
    session.sessionStatus = "In Progress";
    session.technicianNurse = {
      id: req.userId,
      name: technicianName,
    };

    await session.save();

    // Update machine status
    machine.currentSession = {
      sessionId: session._id,
      patientId: session.dialysisPatientId,
      startTime: new Date(),
    };
    await machine.save();

    res.status(200).json({
      message: "Dialysis session started successfully",
      sessionId: session._id,
      data: session,
    });
  } catch (error) {
    console.error("Error starting dialysis session:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 4. End Dialysis Session & Post-Monitoring
export const endDialysisSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      ultrafiltrationVolume,
      postWeight,
      postBloodPressure,
      postPulse,
      postTemperature,
      accessSiteCheck,
      complications,
      adverseEvents,
    } = req.body;

    const session = await DialysisSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Calculate duration
    const duration = Math.floor(
      (new Date() - session.sessionStartTime) / (1000 * 60)
    );

    // Update session
    session.sessionEndTime = new Date();
    session.duration = duration;
    session.ultrafiltrationVolume = ultrafiltrationVolume;
    session.sessionStatus = "Completed";

    if (adverseEvents && adverseEvents.length > 0) {
      session.adverseEvents = adverseEvents;
    }

    session.postDialysisMonitoring = {
      postWeight,
      postBloodPressure,
      postPulse,
      postTemperature,
      accessSiteCheck,
      complications: complications || [],
      monitoredBy: req.userId,
      monitoredAt: new Date(),
    };

    await session.save();

    // Free up machine
    await DialysisMachine.findOneAndUpdate(
      { machineId: session.machineId },
      { $unset: { currentSession: 1 } }
    );

    // Update inventory usage
    await updateInventoryUsage(session);

    // Generate session PDF
    const pdfContent = generateDialysisSessionPDF(session);
    const pdfBuffer = await generatePdf(pdfContent);
    const fileName = `dialysis-session-${sessionId}.pdf`;
    const driveLink = await uploadToDrive(
      pdfBuffer,
      fileName,
      "1MKYZ4fIUzERPyYzL_8I101agWemxVXts"
    );

    res.status(200).json({
      message: "Dialysis session completed successfully",
      sessionPdf: driveLink,
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      data: session,
    });
  } catch (error) {
    console.error("Error ending dialysis session:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 5. Add Lab Reports
export const addLabReport = async (req, res) => {
  try {
    const { dialysisPatientId } = req.params;
    const {
      testType,
      hemoglobin,
      creatinine,
      urea,
      potassium,
      sodium,
      calcium,
      phosphorus,
      pth,
      reportFile,
    } = req.body;

    let reportUrl = null;
    if (reportFile) {
      reportUrl = await uploadToCloudinary(reportFile);
    }

    const labReport = new DialysisLabReport({
      dialysisPatientId,
      testType,
      labValues: {
        hemoglobin,
        creatinine,
        urea,
        potassium,
        sodium,
        calcium,
        phosphorus,
        pth,
      },
      reportUrl,
      orderedBy: req.userId,
    });

    await labReport.save();

    res.status(201).json({
      message: "Lab report added successfully",
      data: labReport,
    });
  } catch (error) {
    console.error("Error adding lab report:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 6. Prescribe Medication
export const prescribeMedication = async (req, res) => {
  try {
    const { dialysisPatientId } = req.params;
    const { medicationName, customMedicationName, dosage, frequency, route } =
      req.body;

    const medication = new DialysisMedication({
      dialysisPatientId,
      medicationName,
      customMedicationName,
      dosage,
      frequency,
      route,
      prescribedBy: req.userId,
    });

    await medication.save();

    res.status(201).json({
      message: "Medication prescribed successfully",
      data: medication,
    });
  } catch (error) {
    console.error("Error prescribing medication:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 7. Administer Medication
export const administerMedication = async (req, res) => {
  try {
    const { medicationId } = req.params;
    const { dosageGiven, notes, status } = req.body;

    const medication = await DialysisMedication.findById(medicationId);
    if (!medication) {
      return res.status(404).json({ message: "Medication not found" });
    }

    medication.administrationRecords.push({
      administeredDate: new Date(),
      administeredBy: req.userId,
      dosageGiven,
      notes,
      status: status || "Administered",
    });

    await medication.save();

    res.status(200).json({
      message: "Medication administered successfully",
      data: medication,
    });
  } catch (error) {
    console.error("Error administering medication:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 8. Generate Dialysis History Report
export const getDialysisHistory = async (req, res) => {
  try {
    const { dialysisPatientId } = req.params;
    const { startDate, endDate, complications, machineId } = req.query;

    let query = { dialysisPatientId };

    if (startDate && endDate) {
      query.sessionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (machineId) {
      query.machineId = machineId;
    }

    let sessions = await DialysisSession.find(query)
      .populate("technicianNurse.id", "name")
      .sort({ sessionDate: -1 });

    if (complications === "true") {
      sessions = sessions.filter(
        (session) =>
          session.adverseEvents.length > 0 ||
          (session.postDialysisMonitoring &&
            session.postDialysisMonitoring.complications.length > 0)
      );
    }

    // Generate PDF report
    const pdfContent = generateDialysisHistoryPDF(sessions, dialysisPatientId);
    const pdfBuffer = await generatePdf(pdfContent);
    const fileName = `dialysis-history-${dialysisPatientId}-${Date.now()}.pdf`;
    const driveLink = await uploadToDrive(
      pdfBuffer,
      fileName,
      "1MKYZ4fIUzERPyYzL_8I101agWemxVXts"
    );

    res.status(200).json({
      message: "Dialysis history retrieved successfully",
      historyPdf: driveLink,
      totalSessions: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Error getting dialysis history:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 9. Generate Billing
export const generateBilling = async (req, res) => {
  try {
    const { dialysisPatientId, sessionId } = req.params;
    const {
      sessionCharges,
      consumables,
      packageType,
      paymentMethod,
      insuranceDetails,
    } = req.body;

    const totalConsumableCost = consumables.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
    const totalAmount = sessionCharges + totalConsumableCost;

    const billing = new DialysisBilling({
      dialysisPatientId,
      sessionId,
      sessionCharges,
      consumables,
      packageType,
      paymentMethod,
      insuranceDetails,
      totalAmount,
      balanceAmount: totalAmount,
      generatedBy: req.userId,
    });

    await billing.save();

    // Generate billing PDF
    const pdfContent = generateDialysisBillingPDF(billing);
    const pdfBuffer = await generatePdf(pdfContent);
    const fileName = `dialysis-bill-${billing._id}.pdf`;
    const driveLink = await uploadToDrive(
      pdfBuffer,
      fileName,
      "1MKYZ4fIUzERPyYzL_8I101agWemxVXts"
    );

    res.status(201).json({
      message: "Billing generated successfully",
      billingPdf: driveLink,
      billId: billing._id,
      totalAmount,
      data: billing,
    });
  } catch (error) {
    console.error("Error generating billing:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// 10. Create Alert
export const createAlert = async (req, res) => {
  try {
    const { dialysisPatientId } = req.params;
    const { alertType, alertMessage, priority, scheduledDate } = req.body;

    const alert = new DialysisAlert({
      dialysisPatientId,
      alertType,
      alertMessage,
      priority,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    });

    await alert.save();

    res.status(201).json({
      message: "Alert created successfully",
      data: alert,
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Machine Management
export const addMachine = async (req, res) => {
  try {
    const {
      machineId,
      machineName,
      manufacturer,
      model,
      serialNumber,
      installationDate,
    } = req.body;

    const machine = new DialysisMachine({
      machineId,
      machineName,
      manufacturer,
      model,
      serialNumber,
      installationDate: new Date(installationDate),
    });

    await machine.save();

    res.status(201).json({
      message: "Machine added successfully",
      data: machine,
    });
  } catch (error) {
    console.error("Error adding machine:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Inventory Management
export const addInventoryItem = async (req, res) => {
  try {
    const {
      itemName,
      itemCode,
      category,
      currentStock,
      minimumStock,
      unitCost,
      supplier,
      expiryDate,
    } = req.body;

    const inventoryItem = new DialysisInventory({
      itemName,
      itemCode,
      category,
      currentStock,
      minimumStock,
      unitCost,
      supplier,
      expiryDate: new Date(expiryDate),
      lastRestocked: new Date(),
    });

    await inventoryItem.save();

    res.status(201).json({
      message: "Inventory item added successfully",
      data: inventoryItem,
    });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get All Dialysis Patients
export const getAllDialysisPatients = async (req, res) => {
  try {
    const { status, dialysisType } = req.query;

    let query = {};
    if (status) query.dialysisStatus = status;
    if (dialysisType) query.dialysisType = dialysisType;

    const patients = await DialysisRegistration.find(query)
      .populate("nephrologist.id", "name specialization")
      .sort({ registeredAt: -1 });

    res.status(200).json({
      message: "Dialysis patients retrieved successfully",
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("Error getting dialysis patients:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get Patient Sessions
export const getPatientSessions = async (req, res) => {
  try {
    const { dialysisPatientId } = req.params;
    const { limit = 10 } = req.query;

    const sessions = await DialysisSession.find({ dialysisPatientId })
      .populate("technicianNurse.id", "name")
      .sort({ sessionDate: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      message: "Patient sessions retrieved successfully",
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error("Error getting patient sessions:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Helper function to update inventory usage
const dialyzerMapping = {
  // ========== FRESENIUS DIALYZERS (Most Common) ==========

  // Low-flux series (Regular efficiency)
  F4: "DIALYZER_004", // 0.8 m² - Pediatric/small patients
  F5: "DIALYZER_005", // 1.0 m² - Small adult patients
  F6: "DIALYZER_002", // 1.3 m² - Average adult patients
  F7: "DIALYZER_006", // 1.6 m² - Large adult patients
  F8: "DIALYZER_003", // 1.8 m² - Large adult patients
  F10: "DIALYZER_007", // 2.2 m² - Very large patients

  // High-flux series (High efficiency)
  F80A: "DIALYZER_001", // 1.8 m² - Most common high-flux
  FX80: "DIALYZER_008", // 1.8 m² - High-efficiency
  FX100: "DIALYZER_009", // 2.2 m² - Maximum efficiency
  "FX CorDiax 80": "DIALYZER_021", // 1.8 m² - Latest technology
  "FX CorDiax 100": "DIALYZER_022", // 2.2 m² - Latest technology

  // ========== GAMBRO/BAXTER DIALYZERS ==========

  // Polyflux series
  "Polyflux 6L": "DIALYZER_010", // 1.3 m² - Low-flux
  "Polyflux 8L": "DIALYZER_011", // 1.8 m² - Low-flux
  "Polyflux 10L": "DIALYZER_012", // 2.2 m² - Low-flux
  "Polyflux 140H": "DIALYZER_023", // 1.4 m² - High-flux
  "Polyflux 170H": "DIALYZER_024", // 1.7 m² - High-flux
  "Polyflux 210H": "DIALYZER_025", // 2.1 m² - High-flux

  // Revaclear series (High-flux)
  "Revaclear 300": "DIALYZER_013", // 1.5 m² - Medium efficiency
  "Revaclear 400": "DIALYZER_014", // 1.8 m² - High efficiency
  "Revaclear MAX": "DIALYZER_026", // 2.2 m² - Maximum efficiency

  // ========== NIPRO DIALYZERS ==========

  // Elisio series (High-performance)
  "Elisio 15H": "DIALYZER_015", // 1.5 m² - Medium efficiency
  "Elisio 18H": "DIALYZER_016", // 1.8 m² - High efficiency
  "Elisio 21H": "DIALYZER_017", // 2.1 m² - Maximum efficiency
  "Elisio 19HDF": "DIALYZER_027", // 1.9 m² - For HDF treatment

  // Sureflux series
  "Sureflux 130G": "DIALYZER_028", // 1.3 m² - Standard
  "Sureflux 150G": "DIALYZER_029", // 1.5 m² - Standard
  "Sureflux 180G": "DIALYZER_030", // 1.8 m² - Standard

  // ========== TORAY DIALYZERS ==========

  // TS series (High-performance)
  "TS-1.6UL": "DIALYZER_018", // 1.6 m² - Medium efficiency
  "TS-1.8UL": "DIALYZER_019", // 1.8 m² - High efficiency
  "TS-2.1UL": "DIALYZER_020", // 2.1 m² - Maximum efficiency
  "TS-2.5UL": "DIALYZER_031", // 2.5 m² - Extra large

  // ========== B.BRAUN DIALYZERS ==========

  "Diacap UF": "DIALYZER_032", // 1.4 m² - Standard
  "Diacap HI": "DIALYZER_033", // 1.8 m² - High-flux
  "Diacap PRO": "DIALYZER_034", // 2.0 m² - Professional

  // ========== ASAHI KASEI DIALYZERS ==========

  "APS-15SA": "DIALYZER_035", // 1.5 m² - Standard
  "APS-18SA": "DIALYZER_036", // 1.8 m² - Standard
  "APS-21SA": "DIALYZER_037", // 2.1 m² - Large

  // ========== PEDIATRIC DIALYZERS ==========

  "F4 Kids": "DIALYZER_038", // 0.4 m² - Small children
  "F5 Kids": "DIALYZER_039", // 0.6 m² - Children
  "Polyflux 4L": "DIALYZER_040", // 0.7 m² - Pediatric
};

// ========== BLOOD LINE MAPPING ==========
const bloodLineMapping = {
  // Based on patient age/size
  Adult: "BLOOD_LINES_001", // Standard adult blood lines
  Pediatric: "BLOOD_LINES_002", // Pediatric blood lines
  Large: "BLOOD_LINES_003", // Large adult blood lines
  Small: "BLOOD_LINES_004", // Small adult blood lines
};

// ========== HEPARIN MAPPING ==========
const heparinMapping = {
  5000: "HEPARIN_001", // 5000 IU vials
  25000: "HEPARIN_002", // 25000 IU vials (bulk)
};

// ========== UPDATED INVENTORY USAGE FUNCTION ==========
const updateInventoryUsage = async (session) => {
  try {
    console.log(`\n=== UPDATING INVENTORY FOR SESSION: ${session._id} ===`);
    console.log(`Patient: ${session.dialysisPatientId}`);
    console.log(`Dialyzer Type: ${session.dialyzerType}`);
    console.log(`Heparin Dosage: ${session.heparinDosage} units`);

    // 1. DIALYZER SELECTION
    const dialyzerItemCode =
      dialyzerMapping[session.dialyzerType] || "DIALYZER_001";
    console.log(`Dialyzer ${session.dialyzerType} → ${dialyzerItemCode}`);

    // 2. BLOOD LINE SELECTION (based on patient age/weight)
    let bloodLineType = "Adult"; // Default
    if (session.preDialysisAssessment) {
      const weight = session.preDialysisAssessment.preWeight;
      if (weight < 30) bloodLineType = "Pediatric";
      else if (weight > 80) bloodLineType = "Large";
      else if (weight < 50) bloodLineType = "Small";
    }
    const bloodLineItemCode = bloodLineMapping[bloodLineType];
    console.log(
      `Patient weight-based blood line: ${bloodLineType} → ${bloodLineItemCode}`
    );

    // 3. HEPARIN CALCULATION
    const heparinUnitsUsed = session.heparinDosage || 2000;
    let heparinItemCode, heparinVialsUsed;

    if (heparinUnitsUsed <= 5000) {
      // Use 5000 IU vials
      heparinItemCode = "HEPARIN_001";
      heparinVialsUsed = Math.ceil(heparinUnitsUsed / 5000);
    } else {
      // Use 25000 IU vials for high doses
      heparinItemCode = "HEPARIN_002";
      heparinVialsUsed = Math.ceil(heparinUnitsUsed / 25000);
    }
    console.log(
      `Heparin: ${heparinUnitsUsed} units = ${heparinVialsUsed} vials of ${heparinItemCode}`
    );

    // 4. SALINE CALCULATION (based on patient weight and session duration)
    const patientWeight = session.preDialysisAssessment?.preWeight || 70;
    const sessionDuration = session.duration || 240; // minutes

    let salineBottlesUsed;
    if (patientWeight < 50) {
      salineBottlesUsed = 1; // Small patients
    } else if (patientWeight > 80 || sessionDuration > 300) {
      salineBottlesUsed = 2; // Large patients or long sessions
    } else {
      salineBottlesUsed = 1; // Average patients
    }
    console.log(
      `Saline: ${patientWeight}kg patient, ${sessionDuration}min = ${salineBottlesUsed} bottles`
    );

    // 5. DEFINE USAGE ITEMS
    const usageItems = [
      {
        itemCode: dialyzerItemCode,
        itemName: `Dialyzer ${session.dialyzerType}`,
        quantity: 1,
        reason: `Used ${session.dialyzerType} dialyzer for dialysis`,
      },
      {
        itemCode: bloodLineItemCode,
        itemName: `Blood Line Set ${bloodLineType}`,
        quantity: 1,
        reason: `${bloodLineType} blood lines for ${patientWeight}kg patient`,
      },
      {
        itemCode: heparinItemCode,
        itemName:
          heparinItemCode === "HEPARIN_001"
            ? "Heparin 5000 IU"
            : "Heparin 25000 IU",
        quantity: heparinVialsUsed,
        reason: `${heparinUnitsUsed} units heparin (${heparinVialsUsed} vials)`,
      },
      {
        itemCode: "SALINE_001",
        itemName: "Normal Saline 500ml",
        quantity: salineBottlesUsed,
        reason: `${salineBottlesUsed} bottles for ${patientWeight}kg patient`,
      },
      {
        itemCode: "GAUZE_001",
        itemName: "Gauze Pads 4x4 inch",
        quantity: 4,
        reason: "Standard gauze for access site care",
      },
      {
        itemCode: "TAPE_001",
        itemName: "Medical Tape 1 inch",
        quantity: 1,
        reason: "Securing access and dressings",
      },
    ];

    console.log("\n--- INVENTORY DEDUCTIONS ---");

    // 6. UPDATE INVENTORY FOR EACH ITEM
    for (const item of usageItems) {
      try {
        // Check if item exists in inventory
        const inventoryItem = await DialysisInventory.findOne({
          itemCode: item.itemCode,
        });

        if (!inventoryItem) {
          console.warn(`⚠️  Item ${item.itemCode} not found in inventory!`);
          continue;
        }

        // Check if enough stock
        if (inventoryItem.currentStock < item.quantity) {
          console.error(
            `❌ Insufficient stock for ${item.itemName}: need ${item.quantity}, have ${inventoryItem.currentStock}`
          );

          // Create critical alert
          await DialysisAlert.create({
            dialysisPatientId: session.dialysisPatientId,
            alertType: "Out of Stock",
            alertMessage: `${item.itemName} insufficient stock: need ${item.quantity}, have ${inventoryItem.currentStock}`,
            priority: "Critical",
          });
          continue;
        }

        // Update inventory
        const updateResult = await DialysisInventory.findOneAndUpdate(
          { itemCode: item.itemCode },
          {
            $inc: { currentStock: -item.quantity },
            $push: {
              usageRecords: {
                sessionId: session._id,
                patientId: session.dialysisPatientId,
                quantityUsed: item.quantity,
                usageDate: new Date(),
                itemName: item.itemName,
                reason: item.reason,
                dialyzerType: session.dialyzerType,
                patientWeight: patientWeight,
              },
            },
          },
          { new: true }
        );

        console.log(
          `✅ ${item.itemName}: -${item.quantity} → ${updateResult.currentStock} remaining`
        );

        // Check for low stock alert
        if (updateResult.currentStock <= updateResult.minimumStock) {
          await DialysisAlert.create({
            dialysisPatientId: session.dialysisPatientId,
            alertType: "Stock Low",
            alertMessage: `${item.itemName} low stock: ${updateResult.currentStock} remaining (min: ${updateResult.minimumStock})`,
            priority: "High",
          });
          console.log(`🚨 LOW STOCK ALERT: ${item.itemName}`);
        }
      } catch (itemError) {
        console.error(`Error updating ${item.itemCode}:`, itemError.message);
      }
    }

    console.log(`=== INVENTORY UPDATE COMPLETED ===\n`);
  } catch (error) {
    console.error("Error updating inventory usage:", error);
    throw error; // Re-throw to handle in calling function
  }
};

export const getAvailableMachines = async (req, res) => {
  try {
    const machines = await DialysisMachine.find({
      status: "Active",
      currentSession: { $exists: false }, // Not currently in use
    }).select("machineId machineName manufacturer model status");

    res.status(200).json({
      message: "Available machines retrieved successfully",
      count: machines.length,
      data: machines,
    });
  } catch (error) {
    console.error("Error getting available machines:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get All Machines (including busy ones)
export const getAllMachines = async (req, res) => {
  try {
    const machines = await DialysisMachine.find()
      .populate(
        "currentSession.sessionId",
        "dialysisPatientId sessionStartTime"
      )
      .sort({ machineId: 1 });

    res.status(200).json({
      message: "All machines retrieved successfully",
      count: machines.length,
      data: machines,
    });
  } catch (error) {
    console.error("Error getting all machines:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get Active Sessions
export const getActiveSessions = async (req, res) => {
  try {
    const activeSessions = await DialysisSession.find({
      sessionStatus: "In Progress",
    })
      .populate("technicianNurse.id", "name")
      .sort({ sessionStartTime: -1 });

    res.status(200).json({
      message: "Active sessions retrieved successfully",
      count: activeSessions.length,
      data: activeSessions,
    });
  } catch (error) {
    console.error("Error getting active sessions:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get Session Details
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await DialysisSession.findById(sessionId).populate(
      "technicianNurse.id",
      "name email"
    );

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({
      message: "Session details retrieved successfully",
      data: session,
    });
  } catch (error) {
    console.error("Error getting session details:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

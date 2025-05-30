import mongoose from "mongoose";
import { Inventory } from "../../models/pharma/inventorySchema.js";
import { Customer } from "../../models/pharma/customerSchema.js";
import { Sale } from "../../models/pharma/saleSchema.js";
import {
  generateBillHTML,
  generateReturnHTML,
} from "../../utils/pharmaBill.js";
import { generatePdf } from "../../services/pdfGenerator.js";
import { uploadToDrive } from "../../services/uploader.js";
import { Return } from "../../models/pharma/returnSchema.js";
import patientSchema from "../../models/patientSchema.js";
import { calculateMedicationQuantity } from "./pharmaOperation.js";
import { Medicine } from "../../models/pharma/medicineSchema.js";
import PatientHistory from "../../models/patientHistorySchema.js";
import EmergencySale from "../../models/emergencySales.js";
// Helper function to generate a unique bill number
const generateBillNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const prefix = `INV-${year}${month}${day}`;

  // Find the last bill number with this prefix
  const lastSale = await Sale.findOne({
    billNumber: { $regex: `^${prefix}` },
  })
    .sort({ billNumber: -1 })
    .limit(1);

  let nextNumber = 1;
  if (lastSale) {
    const parts = lastSale.billNumber.split("-");
    nextNumber = parseInt(parts[parts.length - 1]) + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};

export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerId, items, paymentMethod } = req.body;

    // Validate customer if provided
    let customer = null;
    if (customerId) {
      customer = await Customer.findById(customerId).session(session);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sale items are required",
      });
    }

    // Process each sale item
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      // Validate inventory
      const inventory = await Inventory.findById(item.inventoryId)
        .populate("medicine")
        .session(session);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: `Inventory item not found: ${item.inventoryId}`,
        });
      }

      if (inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${inventory.medicine.name}, Batch: ${inventory.batchNumber}`,
        });
      }

      // Calculate item total
      const mrp = inventory.medicine.mrp;
      const discount = item.discount || 0;
      const totalAmount = mrp * item.quantity * (1 - discount / 100);

      // Update inventory
      await Inventory.findByIdAndUpdate(
        inventory._id,
        { $inc: { quantity: -item.quantity } },
        { session }
      );

      // Add to processed items
      processedItems.push({
        medicine: inventory.medicine._id,
        inventory: inventory._id,
        batchNumber: inventory.batchNumber,
        expiryDate: inventory.expiryDate,
        quantity: item.quantity,
        mrp: mrp,
        discount: discount,
        totalAmount: totalAmount,
      });

      subtotal += totalAmount;
    }

    // Calculate totals
    const tax = req.body.tax || 0;
    const discount = req.body.discount || 0;
    const total = subtotal + (subtotal * tax) / 100 - discount;

    // Generate bill number
    const billNumber = await generateBillNumber();

    // Create sale
    const sale = await Sale.create(
      [
        {
          billNumber,
          customer: customerId,
          items: processedItems,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod: paymentMethod || "cash",
        },
      ],
      { session }
    );

    // Get the populated sale data for the bill generation
    const populatedSale = await Sale.findById(sale[0]._id)
      .populate({
        path: "items.medicine",
        model: "Medicine",
      })
      .populate("customer")
      .session(session);

    // Generate bill HTML
    const billHTML = generateBillHTML(populatedSale);

    // Generate PDF
    const pdfBuffer = await generatePdf(billHTML);

    // Upload to Google Drive
    const driveLink = await uploadToDrive(
      pdfBuffer,
      `Bill_${billNumber}.pdf`,
      "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"
    );

    // Update sale with PDF link
    await Sale.findByIdAndUpdate(
      populatedSale._id,
      { pdfLink: driveLink },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Return the sale data with PDF link
    res.status(201).json({
      success: true,
      data: {
        ...populatedSale._doc,
        pdfLink: driveLink,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, customerId, billNumber } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    if (customerId) {
      filter.customer = customerId;
    }

    if (billNumber) {
      filter.billNumber = { $regex: billNumber, $options: "i" };
    }

    const sales = await Sale.find(filter)
      .populate("customer")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("customer")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSaleByBillNumber = async (req, res) => {
  try {
    const sale = await Sale.findOne({ billNumber: req.params.billNumber })
      .populate("customer")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSalesByCustomer = async (req, res) => {
  try {
    const sales = await Sale.find({ customer: req.params.customerId })
      .populate("customer")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to generate a unique return number
const generateReturnNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const prefix = `RET-${year}${month}${day}`;

  // Find the last return number with this prefix
  const lastReturn = await Return.findOne({
    returnNumber: { $regex: `^${prefix}` },
  })
    .sort({ returnNumber: -1 })
    .limit(1);

  let nextNumber = 1;
  if (lastReturn) {
    const parts = lastReturn.returnNumber.split("-");
    nextNumber = parseInt(parts[parts.length - 1]) + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
};

export const createReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { saleId, items, customerId, reason } = req.body;

    // Validate sale if provided
    let sale = null;
    if (saleId) {
      sale = await Sale.findById(saleId)
        .populate({
          path: "items.medicine",
          model: "Medicine",
        })
        .session(session);

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Original sale not found",
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Return items are required",
      });
    }

    // Process each return item
    const processedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      // If from an original sale, validate against it
      if (sale) {
        const originalItem = sale.items.find(
          (si) =>
            si.medicine._id.toString() === item.medicineId &&
            si.batchNumber === item.batchNumber
        );

        if (!originalItem) {
          return res.status(400).json({
            success: false,
            message: `Item not found in original sale: ${item.medicineId}, Batch: ${item.batchNumber}`,
          });
        }

        if (originalItem.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Return quantity exceeds sold quantity for ${originalItem.medicine.name}`,
          });
        }
      }

      // Find inventory item to update
      let inventory = await Inventory.findOne({
        medicine: item.medicineId,
        batchNumber: item.batchNumber,
      }).session(session);

      // If inventory doesn't exist (e.g., expired and removed), create a new one
      if (!inventory) {
        inventory = await Inventory.create(
          [
            {
              medicine: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate || new Date(),
              quantity: 0,
            },
          ],
          { session }
        );
        inventory = inventory[0];
      }

      // Update inventory by adding the returned quantity
      await Inventory.findByIdAndUpdate(
        inventory._id,
        { $inc: { quantity: item.quantity } },
        { session }
      );

      // Add to processed items
      processedItems.push({
        medicine: item.medicineId,
        inventory: inventory._id,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        mrp: item.mrp,
        totalAmount: item.mrp * item.quantity,
        reason: item.reason || reason,
      });

      totalAmount += item.mrp * item.quantity;
    }

    // Generate return number
    const returnNumber = await generateReturnNumber();

    // Create return record
    const returnDoc = await Return.create(
      [
        {
          returnNumber,
          originalSale: saleId,
          customer: customerId || (sale ? sale.customer : null),
          items: processedItems,
          totalAmount,
        },
      ],
      { session }
    );

    // Get the populated return data for the PDF generation
    const populatedReturn = await Return.findById(returnDoc[0]._id)
      .populate({
        path: "items.medicine",
        model: "Medicine",
      })
      .populate("customer")
      .populate("originalSale")
      .session(session);

    // Generate return HTML
    const returnHTML = generateReturnHTML(populatedReturn);

    // Generate PDF
    const pdfBuffer = await generatePdf(returnHTML);

    // Upload to Google Drive
    const driveLink = await uploadToDrive(
      pdfBuffer,
      `Return_${returnNumber}.pdf`,
      "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"
    );

    // Update return with PDF link
    await Return.findByIdAndUpdate(
      populatedReturn._id,
      { pdfLink: driveLink },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    // Return the return data with PDF link
    res.status(201).json({
      success: true,
      data: {
        ...populatedReturn._doc,
        pdfLink: driveLink,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReturns = async (req, res) => {
  try {
    const { startDate, endDate, customerId, returnNumber, saleId } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    if (customerId) {
      filter.customer = customerId;
    }

    if (returnNumber) {
      filter.returnNumber = { $regex: returnNumber, $options: "i" };
    }

    if (saleId) {
      filter.originalSale = saleId;
    }

    const returns = await Return.find(filter)
      .populate("customer")
      .populate("originalSale")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: returns.length,
      data: returns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReturn = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id)
      .populate("customer")
      .populate("originalSale")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      });

    if (!returnDoc) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

    res.status(200).json({
      success: true,
      data: returnDoc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReturnByNumber = async (req, res) => {
  try {
    const returnDoc = await Return.findOne({
      returnNumber: req.params.returnNumber,
    })
      .populate("customer")
      .populate("originalSale")
      .populate({
        path: "items.medicine",
        model: "Medicine",
      });

    if (!returnDoc) {
      return res.status(404).json({
        success: false,
        message: "Return not found",
      });
    }

    res.status(200).json({
      success: true,
      data: returnDoc,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start of current month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get sales stats
    const todaySales = await Sale.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);

    const monthSales = await Sale.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);

    // Get inventory stats
    const totalInventoryItems = await Inventory.countDocuments({
      quantity: { $gt: 0 },
    });

    // Get expiring soon count (next 3 months)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const expiringSoon = await Inventory.countDocuments({
      expiryDate: { $gte: today, $lte: threeMonthsFromNow },
      quantity: { $gt: 0 },
    });

    // Get out of stock count
    const outOfStock = await Medicine.countDocuments({
      _id: {
        $nin: await Inventory.distinct("medicine", { quantity: { $gt: 0 } }),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        sales: {
          today: {
            total: todaySales[0]?.total || 0,
            count: todaySales[0]?.count || 0,
          },
          month: {
            total: monthSales[0]?.total || 0,
            count: monthSales[0]?.count || 0,
          },
        },
        inventory: {
          total: totalInventoryItems,
          expiringSoon,
          outOfStock,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    let start = startDate ? new Date(startDate) : new Date();
    start.setMonth(start.getMonth() - 1); // Default to last month
    start.setHours(0, 0, 0, 0);

    let end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let groupByField = "$createdAt";
    let dateFormat = "%Y-%m-%d";

    // Group by day, week, or month
    if (groupBy === "week") {
      dateFormat = "%Y-%U"; // Year and week number
    } else if (groupBy === "month") {
      dateFormat = "%Y-%m"; // Year and month
    }

    const salesData = await Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: groupByField } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get top selling medicines
    const topMedicines = await Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.medicine",
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: { $sum: "$items.totalAmount" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "medicines",
          localField: "_id",
          foreignField: "_id",
          as: "medicine",
        },
      },
      { $unwind: "$medicine" },
      {
        $project: {
          name: "$medicine.name",
          totalQuantity: 1,
          totalAmount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        salesTrend: salesData,
        topMedicines,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInventoryAnalytics = async (req, res) => {
  try {
    // Get low stock items (less than 10 units)
    const lowStock = await Inventory.aggregate([
      { $match: { quantity: { $gt: 0, $lt: 10 } } },
      {
        $lookup: {
          from: "medicines",
          localField: "medicine",
          foreignField: "_id",
          as: "medicine",
        },
      },
      { $unwind: "$medicine" },
      {
        $project: {
          name: "$medicine.name",
          quantity: 1,
          batchNumber: 1,
          expiryDate: 1,
        },
      },
      { $sort: { quantity: 1 } },
      { $limit: 20 },
    ]);

    // Get medicines by category
    const medicinesByCategory = await Medicine.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get expiring soon (next 3 months)
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const expiringSoon = await Inventory.aggregate([
      {
        $match: {
          expiryDate: { $gte: today, $lte: threeMonthsFromNow },
          quantity: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: "medicines",
          localField: "medicine",
          foreignField: "_id",
          as: "medicine",
        },
      },
      { $unwind: "$medicine" },
      {
        $project: {
          name: "$medicine.name",
          quantity: 1,
          batchNumber: 1,
          expiryDate: 1,
        },
      },
      { $sort: { expiryDate: 1 } },
      { $limit: 20 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        lowStock,
        medicinesByCategory,
        expiringSoon,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getAllPrescriptions = async (req, res) => {
  try {
    const patients = await patientSchema.find(
      {},
      { patientId: 1, name: 1, contact: 1, admissionRecords: 1 }
    );
    const responseData = [];

    for (const patient of patients) {
      let latestRecord = null;
      let source = "";

      // 1. Check current admission
      if (patient.admissionRecords && patient.admissionRecords.length > 0) {
        latestRecord =
          patient.admissionRecords[patient.admissionRecords.length - 1];
        source = "admission";
      } else {
        // 2. Else get last history record
        const history = await PatientHistory.findOne(
          { patientId: patient.patientId },
          { history: 1 }
        );

        if (history && history.history.length > 0) {
          latestRecord = history.history[history.history.length - 1];
          source = "history";
        }
      }

      // 3. Extract prescriptions
      if (latestRecord?.doctorPrescriptions?.length > 0) {
        const prescriptions = latestRecord.doctorPrescriptions.map(
          (prescription) => ({
            _id: prescription._id,
            medicineName: prescription.medicine.name,
            morning: prescription.medicine.morning,
            afternoon: prescription.medicine.afternoon,
            night: prescription.medicine.night,
            comment: prescription.medicine.comment,
            prescribedDate: prescription.medicine.date,
            admissionDate: latestRecord.admissionDate,
          })
        );

        responseData.push({
          patientId: patient.patientId,
          name: patient.name,
          contact: patient.contact,
          from: source,
          prescriptions,
        });
      }
    }

    res.status(200).json({
      success: true,
      count: responseData.length,
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Enhanced createSaleFromPatientPrescription API with emergency sale support
export const createSaleFromPatientPrescription = async (req, res) => {
  try {
    const {
      patientId,
      prescriptions,
      days,
      customerId,
      forceCreateWithoutInventory = false, // New parameter for emergency sales
    } = req.body;

    // Validate input
    if (!patientId || !prescriptions || !Array.isArray(prescriptions)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input: patient ID and prescriptions are required",
      });
    }

    // Find or create customer
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else {
      const patientName = req.body.patientName;
      const patientContact = req.body.patientContact;

      if (!patientName || !patientContact) {
        return res.status(400).json({
          success: false,
          message:
            "Customer ID or patient details (name and contact) are required",
        });
      }

      // Check if customer already exists with this contact
      customer = await Customer.findOne({ contactNumber: patientContact });

      if (!customer) {
        // Create new customer
        customer = await Customer.create({
          name: patientName,
          contactNumber: patientContact,
          isPatient: true,
          patientId: patientId,
        });
      }
    }

    // Process each prescription medicine
    const saleItems = [];
    const unavailableMedicines = [];
    const emergencyItems = []; // For tracking emergency sale items

    for (const prescription of prescriptions) {
      // Find medicine in pharmacy database
      const medicine = await Medicine.findOne({
        name: { $regex: prescription.medicineName, $options: "i" },
      });

      // Calculate quantity based on dosage
      const quantity = calculateMedicationQuantity(
        prescription.morning,
        prescription.afternoon,
        prescription.night,
        days || 7
      );

      if (!medicine) {
        if (forceCreateWithoutInventory) {
          // Create emergency sale item without medicine reference
          emergencyItems.push({
            medicineName: prescription.medicineName,
            quantity: quantity,
            morning: prescription.morning,
            afternoon: prescription.afternoon,
            night: prescription.night,
            prescribedDate: prescription.prescribedDate,
            // Use default values for missing medicine data
            mrp: 0, // Will be set manually or estimated
            batchNumber: "EMERGENCY-" + Date.now(),
            isEmergencyItem: true,
          });
          continue;
        } else {
          unavailableMedicines.push({
            name: prescription.medicineName,
            reason: "Medicine not found in pharmacy database",
          });
          continue;
        }
      }

      // Find in inventory
      const inventory = await Inventory.findOne({
        medicine: medicine._id,
        quantity: { $gt: 0 },
        expiryDate: { $gt: new Date() },
      }).sort({ expiryDate: 1 });

      if (!inventory) {
        if (forceCreateWithoutInventory) {
          // Create emergency sale item with medicine reference but no inventory
          emergencyItems.push({
            medicineId: medicine._id,
            medicineName: prescription.medicineName,
            quantity: quantity,
            morning: prescription.morning,
            afternoon: prescription.afternoon,
            night: prescription.night,
            prescribedDate: prescription.prescribedDate,
            mrp: medicine.mrp || 0,
            batchNumber: "EMERGENCY-" + Date.now(),
            isEmergencyItem: true,
          });
          continue;
        } else {
          unavailableMedicines.push({
            name: prescription.medicineName,
            reason: "Out of stock",
          });
          continue;
        }
      }

      if (inventory.quantity < quantity) {
        if (forceCreateWithoutInventory) {
          // Create emergency sale item even with insufficient stock
          emergencyItems.push({
            inventoryId: inventory._id,
            medicineId: medicine._id,
            medicineName: prescription.medicineName,
            quantity: quantity,
            morning: prescription.morning,
            afternoon: prescription.afternoon,
            night: prescription.night,
            prescribedDate: prescription.prescribedDate,
            mrp: medicine.mrp || 0,
            batchNumber: inventory.batchNumber || "EMERGENCY-" + Date.now(),
            isEmergencyItem: true,
            availableStock: inventory.quantity,
          });
          continue;
        } else {
          unavailableMedicines.push({
            name: prescription.medicineName,
            reason: "Insufficient stock",
            available: inventory.quantity,
            required: quantity,
          });
          continue;
        }
      }

      // Add to regular sale items (sufficient inventory available)
      saleItems.push({
        inventoryId: inventory._id,
        quantity: quantity,
        discount: 0,
      });
    }

    // Handle emergency sale creation
    if (forceCreateWithoutInventory && emergencyItems.length > 0) {
      return await createEmergencySale(
        req,
        res,
        customer,
        emergencyItems,
        saleItems
      );
    }

    // Regular sale creation logic
    if (unavailableMedicines.length > 0 && saleItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot create sale. No medicines are available.",
        unavailableMedicines: unavailableMedicines.map((item) => item.name),
      });
    }

    // Create regular sale
    if (saleItems.length > 0) {
      const saleData = {
        customerId: customer._id,
        items: saleItems,
        discount: 0,
        tax: 18,
        paymentMethod: req.body.paymentMethod || "cash",
        patientInfo: {
          patientId: patientId,
          prescriptionDate: prescriptions[0]?.prescribedDate || new Date(),
          doctorNotes: req.body.doctorNotes || "",
        },
      };

      req.body = saleData;
      return await createSale(req, res);
    } else {
      return res.status(400).json({
        success: false,
        message: "Cannot create sale with no items",
        unavailableMedicines: unavailableMedicines.map((item) => item.name),
      });
    }
  } catch (error) {
    console.error("Error in createSaleFromPatientPrescription:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const generateBillNumber1 = (prefix = "SALE") => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}-${random}`;
};
// New function to handle emergency sales
const createEmergencySale = async (
  req,
  res,
  customer,
  emergencyItems,
  regularItems = []
) => {
  try {
    // Create emergency sale record
    const emergencySale = {
      customerId: customer._id,
      billNumber: generateBillNumber1("EMG"),
      items: [],
      emergencyItems: emergencyItems,
      subtotal: 0,
      discount: 0,
      tax: 18,
      total: 0,
      paymentMethod: req.body.paymentMethod || "cash",
      isEmergencySale: true,
      patientInfo: {
        patientId: req.body.patientId,
        prescriptionDate: emergencyItems[0]?.prescribedDate || new Date(),
        doctorNotes: req.body.doctorNotes || "",
      },
      createdAt: new Date(),
      status: "completed",
    };

    // Process regular inventory items if any
    let subtotal = 0;
    const processedItems = [];

    for (const item of regularItems) {
      const inventory = await Inventory.findById(item.inventoryId)
        .populate("medicine")
        .populate("distributor");

      if (inventory && inventory.quantity >= item.quantity) {
        const itemTotal = inventory.medicine.mrp * item.quantity;
        processedItems.push({
          inventoryId: inventory._id,
          medicine: inventory.medicine,
          batchNumber: inventory.batchNumber,
          quantity: item.quantity,
          mrp: inventory.medicine.mrp,
          totalAmount: itemTotal,
          expiryDate: inventory.expiryDate,
          distributor: inventory.distributor,
        });

        subtotal += itemTotal;

        // Update inventory
        inventory.quantity -= item.quantity;
        await inventory.save();
      }
    }

    // Process emergency items (estimate pricing or use default)
    const processedEmergencyItems = [];
    for (const item of emergencyItems) {
      const estimatedPrice = item.mrp || 50; // Default price or estimation logic
      const itemTotal = estimatedPrice * item.quantity;

      processedEmergencyItems.push({
        medicineName: item.medicineName,
        medicineId: item.medicineId || null,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        mrp: estimatedPrice,
        totalAmount: itemTotal,
        isEmergencyItem: true,
        dosage: {
          morning: item.morning,
          afternoon: item.afternoon,
          night: item.night,
        },
        prescribedDate: item.prescribedDate,
        availableStock: item.availableStock || 0,
      });

      subtotal += itemTotal;
    }

    // Calculate totals
    const taxAmount = (subtotal * emergencySale.tax) / 100;
    const total = subtotal + taxAmount - emergencySale.discount;

    // Update sale object
    emergencySale.items = processedItems;
    emergencySale.emergencyItems = processedEmergencyItems;
    emergencySale.subtotal = subtotal;
    emergencySale.total = total;

    // Save emergency sale to database
    const savedSale = await EmergencySale.create(emergencySale);

    // Generate PDF invoice for emergency sale
    const pdfUrl = await generateEmergencyInvoicePDF(savedSale, customer);

    // Log emergency sale for audit

    // Send notification to inventory manager
    await sendEmergencySaleNotification({
      saleId: savedSale._id,
      patientId: req.body.patientId,
      emergencyItems: processedEmergencyItems,
      total: total,
    });

    return res.status(201).json({
      success: true,
      message: "Emergency sale created successfully",
      data: {
        ...savedSale.toObject(),
        customer: customer,
        pdfLink: pdfUrl,
        isEmergencySale: true,
        warning:
          "This sale was created without full inventory tracking. Please update inventory manually.",
      },
    });
  } catch (error) {
    console.error("Error in createEmergencySale:", error);
    throw error;
  }
};

// Helper function to calculate medication quantity

// Helper function to generate bill number

// Helper function to generate emergency invoice PDF
const generateEmergencyInvoicePDF = async (sale, customer) => {
  try {
    // Implementation would depend on your PDF generation library
    // This is a placeholder for the actual PDF generation logic
    const pdfData = {
      saleId: sale._id,
      billNumber: sale.billNumber,
      customer: customer,
      items: sale.items,
      emergencyItems: sale.emergencyItems,
      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,
      isEmergencySale: true,
      watermark: "EMERGENCY SALE",
      createdAt: sale.createdAt,
    };

    // Generate PDF and upload to cloud storage
    const pdfBuffer = await generatePdf(pdfData);
    const pdfUrl = await uploadToDrive(
      pdfBuffer,
      `emergency-invoice-${sale.billNumber}.pdf`
    );

    return pdfUrl;
  } catch (error) {
    console.error("Error generating emergency PDF:", error);
    return null;
  }
};

// Helper function to send emergency sale notification
const sendEmergencySaleNotification = async (notificationData) => {
  try {
    // Send email notification to inventory manager
    const emailData = {
      to: process.env.INVENTORY_MANAGER_EMAIL,
      subject: `Emergency Sale Created - ${notificationData.saleId}`,
      template: "emergency-sale-notification",
      data: notificationData,
    };

    await sendEmail(emailData);

    // Send internal system notification
    await SystemNotification.create({
      type: "EMERGENCY_SALE",
      title: "Emergency Sale Created",
      message: `Emergency sale for patient ${notificationData.patientId} with ${notificationData.emergencyItems.length} items`,
      data: notificationData,
      priority: "high",
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Error sending emergency sale notification:", error);
  }
};

// Database schema for emergency sales (Mongoose example)

// API endpoint to get emergency sales report
export const getEmergencySalesReport = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const query = { isEmergencySale: true };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const emergencySales = await EmergencySale.find(query)
      .populate("customerId")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EmergencySale.countDocuments(query);

    const summary = await EmergencySale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          totalEmergencyItems: { $sum: { $size: "$emergencyItems" } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        sales: emergencySales,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: emergencySales.length,
          totalRecords: total,
        },
        summary: summary[0] || {
          totalSales: 0,
          totalAmount: 0,
          totalEmergencyItems: 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching emergency sales report:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API endpoint to update inventory after emergency sale
export const updateInventoryAfterEmergencySale = async (req, res) => {
  try {
    const { emergencySaleId, inventoryUpdates } = req.body;

    const emergencySale = await EmergencySale.findById(emergencySaleId);
    if (!emergencySale) {
      return res.status(404).json({
        success: false,
        message: "Emergency sale not found",
      });
    }

    // Process inventory updates
    for (const update of inventoryUpdates) {
      const {
        emergencyItemId,
        medicineId,
        batchNumber,
        actualMrp,
        addToInventory,
      } = update;

      if (addToInventory) {
        // Add the medicine to inventory if it wasn't there before
        await Inventory.create({
          medicine: medicineId,
          batchNumber: batchNumber,
          quantity: 0, // Start with 0, will be updated separately
          mrp: actualMrp,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
          distributor: null, // To be updated separately
        });
      }

      // Update the emergency item with actual pricing
      const emergencyItem = emergencySale.emergencyItems.id(emergencyItemId);
      if (emergencyItem) {
        emergencyItem.mrp = actualMrp;
        emergencyItem.totalAmount = actualMrp * emergencyItem.quantity;
      }
    }

    // Recalculate totals
    const newSubtotal = [
      ...emergencySale.items,
      ...emergencySale.emergencyItems,
    ].reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    const newTaxAmount = (newSubtotal * emergencySale.tax) / 100;
    const newTotal = newSubtotal + newTaxAmount - emergencySale.discount;

    emergencySale.subtotal = newSubtotal;
    emergencySale.total = newTotal;
    emergencySale.updatedAt = new Date();

    await emergencySale.save();

    res.json({
      success: true,
      message: "Inventory updated successfully for emergency sale",
      data: emergencySale,
    });
  } catch (error) {
    console.error("Error updating inventory after emergency sale:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// utils/billHtmlGenerator.js

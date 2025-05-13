// controllers/distributorController.js

import mongoose from "mongoose";
import { Distributor } from "../../models/pharma/distributionSchema.js";
import { Medicine } from "../../models/pharma/medicineSchema.js";
import { Inventory } from "../../models/pharma/inventorySchema.js";
import { Customer } from "../../models/pharma/customerSchema.js";

export const createDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.create(req.body);
    res.status(201).json({
      success: true,
      data: distributor,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDistributors = async (req, res) => {
  try {
    const distributors = await Distributor.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: distributors.length,
      data: distributors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findById(req.params.id);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found",
      });
    }
    res.status(200).json({
      success: true,
      data: distributor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found",
      });
    }
    res.status(200).json({
      success: true,
      data: distributor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteDistributor = async (req, res) => {
  try {
    const distributor = await Distributor.findByIdAndDelete(req.params.id);
    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// controllers/medicineController.js

export const createMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMedicines = async (req, res) => {
  try {
    const { name, category } = req.query;
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (category) {
      filter.category = category;
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: medicines.length,
      data: medicines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }
    res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }
    res.status(200).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addToInventory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { medicineId, batchNumber, expiryDate, quantity, distributorId } =
      req.body;

    // Check if medicine exists
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: "Medicine not found",
      });
    }

    // Check if distributor exists if provided
    if (distributorId) {
      const distributor = await Distributor.findById(distributorId);
      if (!distributor) {
        return res.status(404).json({
          success: false,
          message: "Distributor not found",
        });
      }
    }

    // Check if batch already exists
    const existingBatch = await Inventory.findOne({
      medicine: medicineId,
      batchNumber,
      expiryDate: new Date(expiryDate),
    });

    let inventory;
    if (existingBatch) {
      // Update existing batch
      inventory = await Inventory.findByIdAndUpdate(
        existingBatch._id,
        { $inc: { quantity } },
        { new: true, runValidators: true, session }
      ).populate("medicine distributor");
    } else {
      // Create new batch
      inventory = await Inventory.create(
        [
          {
            medicine: medicineId,
            batchNumber,
            expiryDate,
            quantity,
            distributor: distributorId,
          },
        ],
        { session }
      );
      inventory = await Inventory.findById(inventory[0]._id)
        .populate("medicine distributor")
        .session(session);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: inventory,
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

export const getInventory = async (req, res) => {
  try {
    const { medicineId, batchNumber, expiringSoon } = req.query;
    const filter = {};

    if (medicineId) {
      filter.medicine = medicineId;
    }

    if (batchNumber) {
      filter.batchNumber = { $regex: batchNumber, $options: "i" };
    }

    if (expiringSoon === "true") {
      // Get items expiring in the next 3 months
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      filter.expiryDate = {
        $gte: new Date(),
        $lte: threeMonthsFromNow,
      };
    }

    // Only get items with quantity > 0
    filter.quantity = { $gt: 0 };

    const inventory = await Inventory.find(filter)
      .populate("medicine")
      .populate("distributor")
      .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("medicine distributor");

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findByIdAndDelete(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const searchMedicineInInventory = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Find medicines matching the query
    const medicines = await Medicine.find({
      name: { $regex: query, $options: "i" },
    }).select("_id");

    const medicineIds = medicines.map((medicine) => medicine._id);

    // Find inventory items for these medicines
    const inventory = await Inventory.find({
      medicine: { $in: medicineIds },
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    })
      .populate("medicine")
      .populate("distributor")
      .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { name, contactNumber, isPatient } = req.query;
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (contactNumber) {
      filter.contactNumber = { $regex: contactNumber, $options: "i" };
    }

    if (isPatient) {
      filter.isPatient = isPatient === "true";
    }

    const customers = await Customer.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const searchCustomers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const customers = await Customer.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { contactNumber: { $regex: query, $options: "i" } },
      ],
    }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// utils/prescriptionHelper.js
export const calculateMedicationQuantity = (
  morning,
  afternoon,
  night,
  days = 7
) => {
  // Convert string values to numbers or default to 0 if empty
  const morningDose = morning ? parseInt(morning, 10) : 0;
  const afternoonDose = afternoon ? parseInt(afternoon, 10) : 0;
  const nightDose = night ? parseInt(night, 10) : 0;

  // Calculate total daily dosage
  const dailyDosage = morningDose + afternoonDose + nightDose;

  // Calculate total quantity needed for treatment period
  return dailyDosage * days;
};

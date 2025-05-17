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
    // Validate the request ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid distributor ID format",
      });
    }

    // Security: Ensure only allowed fields can be updated
    const allowedFields = ["name", "contactNumber", "email", "address"];
    const updateData = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = req.body[key];
      }
    });

    // If no valid fields are provided, return an error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    // Use lean() for better performance
    const distributor = await Distributor.findByIdAndUpdate(
      req.params.id,
      // Use $set to only update the specified fields
      { $set: updateData },
      {
        new: true, // Return the updated document
        runValidators: true, // Run validators on update
        lean: true, // Return plain JavaScript object
      }
    );

    if (!distributor) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found",
      });
    }

    // Audit logging (optional but recommended for production)
    console.log(
      `Distributor ${req.params.id} updated by ${
        req.user?.id || "unknown"
      } with fields: ${Object.keys(updateData).join(", ")}`
    );

    res.status(200).json({
      success: true,
      data: distributor,
    });
  } catch (error) {
    // More detailed error handling
    if (error.name === "ValidationError") {
      // Handle Mongoose validation errors
      const validationErrors = {};

      // Extract validation error messages
      Object.keys(error.errors).forEach((field) => {
        validationErrors[field] = error.errors[field].message;
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Handle duplicate key errors (e.g. unique email constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `The ${field} '${error.keyValue[field]}' is already in use.`,
      });
    }

    console.error("Error updating distributor:", error);
    res.status(500).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "An error occurred while updating the distributor"
          : error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
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
export const getDistributorMedicines = async (req, res) => {
  const { distributorId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "name",
    sortOrder = "asc",
    search = "",
    expiryBefore,
    minQuantity,
  } = req.query;

  try {
    // Validate distributorId format
    if (!mongoose.Types.ObjectId.isValid(distributorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid distributor ID format",
      });
    }

    // Check if distributor exists
    const distributorExists = await Distributor.exists({ _id: distributorId });
    if (!distributorExists) {
      return res.status(404).json({
        success: false,
        message: "Distributor not found",
      });
    }

    // Build match stage for aggregation
    const matchStage = {
      distributor: new mongoose.Types.ObjectId(distributorId),
    };

    // Build aggregation pipeline
    const aggregationPipeline = [];

    // Initial match for distributor
    aggregationPipeline.push({ $match: matchStage });

    // Join with medicines collection
    aggregationPipeline.push({
      $lookup: {
        from: "medicines",
        localField: "medicine",
        foreignField: "_id",
        as: "medicineDetails",
      },
    });

    aggregationPipeline.push({ $unwind: "$medicineDetails" });

    // Apply search filter if provided
    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { "medicineDetails.name": { $regex: search, $options: "i" } },
            {
              "medicineDetails.manufacturer": { $regex: search, $options: "i" },
            },
            { batchNumber: { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Apply expiry filter if provided
    if (expiryBefore) {
      const expiryDate = new Date(expiryBefore);
      if (!isNaN(expiryDate.getTime())) {
        aggregationPipeline.push({
          $match: { expiryDate: { $lte: expiryDate } },
        });
      }
    }

    // Apply minimum quantity filter if provided
    if (minQuantity !== undefined && !isNaN(Number(minQuantity))) {
      aggregationPipeline.push({
        $match: { quantity: { $gte: Number(minQuantity) } },
      });
    }

    // Group by medicine
    aggregationPipeline.push({
      $group: {
        _id: "$medicine",
        name: { $first: "$medicineDetails.name" },
        manufacturer: { $first: "$medicineDetails.manufacturer" },
        dosageForm: { $first: "$medicineDetails.dosageForm" },
        strength: { $first: "$medicineDetails.strength" },
        totalQuantity: { $sum: "$quantity" },
        nearestExpiry: { $min: "$expiryDate" },
        batches: {
          $push: {
            batchNumber: "$batchNumber",
            expiryDate: "$expiryDate",
            quantity: "$quantity",
          },
        },
      },
    });

    // Sorting
    const sortDirection = sortOrder.toLowerCase() === "desc" ? -1 : 1;
    const sortField = sortBy === "expiryDate" ? "nearestExpiry" : sortBy;

    aggregationPipeline.push({
      $sort: { [sortField]: sortDirection },
    });

    // Get total count for pagination
    const countPipeline = [...aggregationPipeline];
    countPipeline.push({ $count: "totalCount" });

    const totalCountResult = await Inventory.aggregate(countPipeline);
    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;

    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit);
    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: Number(limit) });

    // Execute aggregation
    const medicines = await Inventory.aggregate(aggregationPipeline);

    // Return paginated response
    return res.status(200).json({
      success: true,
      count: medicines.length,
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
      currentPage: Number(page),
      data: medicines,
    });
  } catch (error) {
    console.error("Error fetching paginated distributor medicines:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve medicines",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// controllers/medicineController.js

export const createMedicinesBulk = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Handle both single medicine and array of medicines
    const medicines = Array.isArray(req.body)
      ? req.body
      : req.body.medicines
      ? req.body.medicines
      : [req.body];

    if (medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one medicine",
      });
    }

    const results = {
      created: [],
      duplicates: [],
      errors: [],
    };

    // Extract all names and manufacturers for efficient bulk duplicate check
    const namesToCheck = medicines.map((med) => ({
      name: med.name?.trim(),
      manufacturer: med.manufacturer?.trim() || "",
    }));

    // Bulk find existing medicines (more efficient than individual checks)
    const existingMedicinesQuery = namesToCheck.map((item) => ({
      name: { $regex: new RegExp(`^${item.name}$`, "i") },
      manufacturer: item.manufacturer
        ? { $regex: new RegExp(`^${item.manufacturer}$`, "i") }
        : { $exists: true },
    }));

    const existingMedicines =
      existingMedicinesQuery.length > 0
        ? await Medicine.find({ $or: existingMedicinesQuery }).session(session)
        : [];

    // Create a map for quick lookup of existing medicines
    const existingMedicineMap = new Map();
    existingMedicines.forEach((med) => {
      const key = `${med.name.toLowerCase()}_${(
        med.manufacturer || ""
      ).toLowerCase()}`;
      existingMedicineMap.set(key, med);
    });

    // Process each medicine
    const medicinesToCreate = [];

    for (const medicineData of medicines) {
      try {
        if (!medicineData.name) {
          results.errors.push({
            input: medicineData,
            error: "Medicine name is required",
          });
          continue;
        }

        // Check if medicine already exists using our map (faster than DB query)
        const lookupKey = `${medicineData.name.trim().toLowerCase()}_${(
          medicineData.manufacturer || ""
        )
          .trim()
          .toLowerCase()}`;
        const existingMedicine = existingMedicineMap.get(lookupKey);

        if (existingMedicine) {
          results.duplicates.push({
            input: medicineData,
            existing: existingMedicine,
          });
          continue;
        }

        // Add to batch for creation
        medicinesToCreate.push({
          ...medicineData,
          name: medicineData.name.trim(),
        });
      } catch (err) {
        results.errors.push({
          input: medicineData,
          error: err.message,
        });
      }
    }

    // Batch create medicines if any available
    if (medicinesToCreate.length > 0) {
      const createdMedicines = await Medicine.create(medicinesToCreate, {
        session,
      });
      results.created = createdMedicines;
    }

    // Commit transaction only if at least one medicine was created
    if (results.created.length > 0) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }

    return res.status(201).json({
      success: true,
      message: `Created ${results.created.length} medicines, found ${results.duplicates.length} duplicates, encountered ${results.errors.length} errors`,
      data: results,
    });
  } catch (error) {
    // Abort transaction on any error
    await session.abortTransaction();

    console.error("Error in bulk medicine creation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create medicines in bulk",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    session.endSession();
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
    console.log(req.body);
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
    const {
      medicineId,
      batchNumber,
      expiringSoon,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { quantity: { $gt: 0 } }; // Always filter for items with quantity > 0

    // Add additional filters only if they exist
    if (medicineId) {
      // Convert string ID to ObjectId to ensure proper matching
      filter.medicine = new mongoose.Types.ObjectId(medicineId);
    }

    if (batchNumber) {
      filter.batchNumber = { $regex: new RegExp(batchNumber, "i") };
    }

    if (expiringSoon === "true") {
      // Get items expiring in the next 3 months
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day

      const threeMonthsFromNow = new Date(today);
      threeMonthsFromNow.setMonth(today.getMonth() + 3);

      filter.expiryDate = {
        $gte: today,
        $lte: threeMonthsFromNow,
      };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use lean() for better performance when you don't need Mongoose document methods
    // Use proper indexing in your schema for the fields you're filtering and sorting on
    const countPromise = Inventory.countDocuments(filter);
    const inventoryPromise = Inventory.find(filter)
      .populate({
        path: "medicine",
        select: "name manufacturer category mrp purchasePrice", // Select only needed fields
      })
      .populate({
        path: "distributor",
        select: "name contactNumber email", // Select only needed fields
      })
      .sort({ expiryDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    // Execute both promises in parallel
    const [count, inventory] = await Promise.all([
      countPromise,
      inventoryPromise,
    ]);

    // Add proper caching headers for GET requests
    res.set("Cache-Control", "public, max-age=300"); // Cache for 5 minutes

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: inventory,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
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

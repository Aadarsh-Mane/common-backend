// controllers/sectionController.js

import Section from "../../models/sectionSchema.js";

// Create a new hospital section
export const createSection = async (req, res) => {
  try {
    const { name, type, totalBeds } = req.body;

    // Validate required fields
    if (!name || !type || !totalBeds) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, type, and totalBeds",
      });
    }

    // Create new section
    const newSection = await Section.create({
      name,
      type,
      totalBeds,
      availableBeds: totalBeds,
    });

    return res.status(201).json({
      success: true,
      data: newSection,
      message: "Section created successfully",
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A section with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get all hospital sections
export const getAllSections = async (req, res) => {
  try {
    const sections = await Section.find();

    // Get counts of different section types
    const typeStats = await Section.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalBeds: { $sum: "$totalBeds" },
          availableBeds: { $sum: "$availableBeds" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: sections.length,
      typeStats,
      data: sections,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get a single hospital section
export const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Update a hospital section
export const updateSection = async (req, res) => {
  try {
    const { name, type, totalBeds } = req.body;

    // Find section first to check if it exists and to handle beds properly
    let section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    // Calculate available beds if total beds are changing
    let availableBeds = section.availableBeds;
    if (totalBeds && totalBeds !== section.totalBeds) {
      const occupiedBeds = section.totalBeds - section.availableBeds;
      availableBeds = Math.max(0, totalBeds - occupiedBeds);
    }

    // Update the section
    section = await Section.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type,
        totalBeds,
        availableBeds,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: section,
      message: "Section updated successfully",
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A section with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Delete a hospital section
export const deleteSection = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    await Section.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get section types (to populate dropdowns)
export const getSectionTypes = async (req, res) => {
  try {
    const types = await Section.distinct("type");

    res.status(200).json({
      success: true,
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

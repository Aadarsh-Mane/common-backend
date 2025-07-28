import express from "express";
import {
  getMedicinesByManufacturer,
  searchManufacturers,
  searchMedicines,
} from "../controllers/medicineSearchController.js";

const medicineRoutes = express.Router();

/**
 * @route   GET /api/medicines/search
 * @desc    Search and filter medicines with pagination
 * @access  Protected (requires authentication)
 * @params
 *   - search: string (optional) - Search term for medicine name, manufacturer, or composition
 *   - sortBy: string (optional) - Field to sort by (medicineName, manufacturer, mrp, letterCategory)
 *   - sortOrder: string (optional) - Sort order (asc, desc)
 *   - page: number (optional) - Page number for pagination (default: 1)
 *   - limit: number (optional) - Items per page (default: 50, max: 100)
 *   - letterCategory: string (optional) - Filter by letter category
 *   - minPrice: number (optional) - Minimum price filter
 *   - maxPrice: number (optional) - Maximum price filter
 *
 * @example
 * GET /api/medicines/search?search=paracetamol&page=1&limit=20&sortBy=mrp&sortOrder=asc
 */
medicineRoutes.get("/search", searchMedicines);

/**
 * @route   GET /api/medicines/manufacturers
 * @desc    Get all manufacturers with their statistics and medicine counts
 * @access  Protected (requires authentication)
 * @params
 *   - search: string (optional) - Search term for manufacturer name
 *   - sortBy: string (optional) - Field to sort by (name, medicineCount, avgPrice)
 *   - sortOrder: string (optional) - Sort order (asc, desc)
 *   - page: number (optional) - Page number for pagination (default: 1)
 *   - limit: number (optional) - Items per page (default: 50, max: 100)
 *
 * @example
 * GET /api/medicines/manufacturers?search=cipla&sortBy=medicineCount&sortOrder=desc
 */
medicineRoutes.get("/manufacturers", searchManufacturers);

/**
 * @route   GET /api/medicines/by-manufacturer
 * @desc    Get medicines associated with a specific manufacturer
 * @access  Protected (requires authentication)
 * @params
 *   - manufacturer: string (required) - Manufacturer name or partial name
 *   - search: string (optional) - Additional search term for medicines
 *   - sortBy: string (optional) - Field to sort by (medicineName, mrp, composition, letterCategory)
 *   - sortOrder: string (optional) - Sort order (asc, desc)
 *   - page: number (optional) - Page number for pagination (default: 1)
 *   - limit: number (optional) - Items per page (default: 50, max: 100)
 *   - includeStats: string (optional) - Include manufacturer statistics (true/false)
 *
 * @example
 * GET /api/medicines/by-manufacturer?manufacturer=Roche&includeStats=true&page=1&limit=25
 */
medicineRoutes.get("/by-manufacturer", getMedicinesByManufacturer);

/**
 * @route   GET /api/medicines/categories
 * @desc    Get all available letter categories
 * @access  Protected (requires authentication)
 */
medicineRoutes.get("/categories", async (req, res) => {
  try {
    const { loadMedicineData } = await import("./medicineController.js");
    const medicineData = await loadMedicineData();

    const categories = medicineData
      .map((medicine) => medicine.letterCategory)
      .filter(Boolean)
      .reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: Object.entries(categories)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => a.category.localeCompare(b.category)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get categories",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

/**
 * @route   GET /api/medicines/stats
 * @desc    Get overall medicine database statistics
 * @access  Protected (requires authentication)
 */
medicineRoutes.get("/stats", async (req, res) => {
  try {
    const { loadMedicineData } = await import("./medicineController.js");
    const medicineData = await loadMedicineData();

    const stats = {
      totalMedicines: medicineData.length,
      totalManufacturers: new Set(medicineData.map((m) => m.manufacturer)).size,
      averagePrice: (
        medicineData.reduce((sum, m) => sum + (parseFloat(m.mrp) || 0), 0) /
        medicineData.length
      ).toFixed(2),
      priceRange: {
        min: Math.min(...medicineData.map((m) => parseFloat(m.mrp) || 0)),
        max: Math.max(...medicineData.map((m) => parseFloat(m.mrp) || 0)),
      },
      categoriesCount: new Set(medicineData.map((m) => m.letterCategory)).size,
      lastUpdated: medicineData[0]?.scrapedDate || "Unknown",
    };

    res.status(200).json({
      success: true,
      message: "Statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

export default medicineRoutes;

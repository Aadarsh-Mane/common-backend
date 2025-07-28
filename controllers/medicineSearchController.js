import fs from "fs/promises";
import path from "path";
import Papa from "papaparse";
import _ from "lodash";

// Cache for medicine data to avoid repeated file reads
let medicineCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Extract numeric price from MRP string (e.g., "MRP₹33863" -> 33863)
 */
const extractPrice = (mrpString) => {
  if (!mrpString) return 0;
  // Remove all non-numeric characters except decimal point
  const numericValue = mrpString.toString().replace(/[^\d.]/g, "");
  const price = parseFloat(numericValue);
  return isNaN(price) ? 0 : price;
};

/**
 * Load and cache medicine data from CSV
 */
const loadMedicineData = async () => {
  const now = Date.now();

  // Return cached data if still valid
  if (
    medicineCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return medicineCache;
  }

  try {
    const csvPath = path.join(process.cwd(), "data", "medicines.csv");
    const csvData = await fs.readFile(csvPath, "utf8");

    const parsed = Papa.parse(csvData, {
      header: true,
      dynamicTyping: false, // Keep as strings to handle properly
      skipEmptyLines: true,
      delimitersToGuess: [",", "\t", "|", ";"],
    });

    if (parsed.errors.length > 0) {
      console.warn("CSV parsing warnings:", parsed.errors.slice(0, 5)); // Log only first 5 errors
    }

    // Clean and normalize data with proper filtering
    const cleanedData = parsed.data
      .map((row) => {
        const medicineName = (row["Medicine Name"] || "").trim();
        const manufacturer = (row["Manufacturer"] || "").trim();
        const mrpOriginal = (row["MRP"] || "").trim();
        const price = extractPrice(mrpOriginal);

        return {
          index: parseInt(row["Index"]) || 0,
          medicineName,
          manufacturer,
          price, // Numeric price for filtering/sorting
          mrpOriginal, // Original price string for display
          packageInfo: (row["Package Information"] || "").trim(),
          composition: (row["Composition"] || "").trim(),
          letterCategory: (row["Letter Category"] || "").trim().toUpperCase(),
          pageNumber: parseInt(row["Page Number"]) || 0,
          scrapedDate: (row["Scraped Date"] || "").trim(),
          scrapedTime: (row["Scraped Time"] || "").trim(),
        };
      })
      .filter(
        (row) =>
          row.medicineName &&
          row.medicineName.length > 2 && // Filter out very short/invalid names
          row.manufacturer &&
          row.manufacturer.length > 2 // Filter out invalid manufacturers
      );

    medicineCache = cleanedData;
    cacheTimestamp = now;

    console.log(`Loaded ${cleanedData.length} medicines into cache`);
    return cleanedData;
  } catch (error) {
    throw new Error(`Failed to load medicine data: ${error.message}`);
  }
};

/**
 * Helper function for pagination
 */
const paginate = (data, page = 1, limit = 50) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = pageNum * limitNum;

  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(data.length / limitNum),
      totalItems: data.length,
      itemsPerPage: limitNum,
      hasNext: endIndex < data.length,
      hasPrev: pageNum > 1,
    },
  };
};

/**
 * Medicine name only search filter
 */
const searchFilter = (data, searchTerm) => {
  if (!searchTerm || searchTerm.trim().length === 0) return data;

  const terms = searchTerm.toLowerCase().trim().split(/\s+/);

  return data.filter((item) => {
    const medicineName = item.medicineName.toLowerCase();

    // Check if all search terms are found in the medicine name only
    return terms.every((term) => medicineName.includes(term));
  });
};

/**
 * Controller 1: Search and filter medicines (Medicine Name Only)
 * GET /api/medicines/search
 */
export const searchMedicines = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "medicineName",
      sortOrder = "asc",
      page = 1,
      limit = 50,
      letterCategory = "",
      minPrice = "",
      maxPrice = "",
    } = req.query;

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const medicineData = await loadMedicineData();

    // Apply search filter - ONLY on medicine name
    let filteredData = searchFilter(medicineData, search);

    // Filter by letter category
    if (letterCategory && letterCategory.trim()) {
      const categoryFilter = letterCategory.trim().toUpperCase();
      filteredData = filteredData.filter(
        (item) => item.letterCategory === categoryFilter
      );
    }

    // Filter by price range
    const minPriceNum = parseFloat(minPrice) || 0;
    const maxPriceNum = parseFloat(maxPrice) || Infinity;

    if (minPriceNum > 0 || maxPriceNum < Infinity) {
      filteredData = filteredData.filter((item) => {
        const price = item.price;
        return (
          price >= minPriceNum &&
          (maxPriceNum === Infinity || price <= maxPriceNum)
        );
      });
    }

    // Sort data
    const validSortFields = [
      "medicineName",
      "manufacturer",
      "price",
      "letterCategory",
      "composition",
    ];
    const sortField = validSortFields.includes(sortBy)
      ? sortBy
      : "medicineName";
    const order = sortOrder.toLowerCase() === "desc" ? "desc" : "asc";

    filteredData = _.orderBy(filteredData, [sortField], [order]);

    // Paginate results
    const result = paginate(filteredData, pageNum, limitNum);

    res.status(200).json({
      success: true,
      message: "Medicines retrieved successfully",
      searchNote: "Search performed on medicine name only",
      ...result,
      filters: {
        search: search || null,
        sortBy: sortField,
        sortOrder: order,
        letterCategory: letterCategory || null,
        priceRange: {
          min: minPriceNum > 0 ? minPriceNum : null,
          max: maxPriceNum < Infinity ? maxPriceNum : null,
        },
      },
    });
  } catch (error) {
    console.error("Search medicines error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search medicines",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Controller 2: Search and filter manufacturers
 * GET /api/medicines/manufacturers
 */
export const searchManufacturers = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "name",
      sortOrder = "asc",
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const medicineData = await loadMedicineData();

    // Group medicines by manufacturer and calculate statistics
    const manufacturerStats = _.chain(medicineData)
      .groupBy("manufacturer")
      .map((medicines, manufacturer) => {
        const prices = medicines.map((m) => m.price).filter((p) => p > 0);
        const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
        const minPrice = prices.length > 0 ? _.min(prices) : 0;
        const maxPrice = prices.length > 0 ? _.max(prices) : 0;

        return {
          name: manufacturer,
          medicineCount: medicines.length,
          avgPrice: Math.round(avgPrice * 100) / 100, // Round to 2 decimal places
          priceRange: {
            min: minPrice,
            max: maxPrice,
            minDisplay:
              medicines.find((m) => m.price === minPrice)?.mrpOriginal || "N/A",
            maxDisplay:
              medicines.find((m) => m.price === maxPrice)?.mrpOriginal || "N/A",
          },
          categories: _.uniq(medicines.map((m) => m.letterCategory))
            .filter(Boolean)
            .sort(),
          sampleMedicines: medicines.slice(0, 3).map((m) => ({
            name: m.medicineName,
            composition: m.composition,
            price: m.mrpOriginal,
          })),
        };
      })
      .value();

    // Apply search filter for manufacturers
    let filteredManufacturers = manufacturerStats;
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredManufacturers = manufacturerStats.filter((manufacturer) =>
        manufacturer.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort manufacturers
    const validSortFields = ["name", "medicineCount", "avgPrice"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "name";
    const order = sortOrder.toLowerCase() === "desc" ? "desc" : "asc";

    filteredManufacturers = _.orderBy(
      filteredManufacturers,
      [sortField],
      [order]
    );

    // Paginate results
    const result = paginate(filteredManufacturers, pageNum, limitNum);

    res.status(200).json({
      success: true,
      message: "Manufacturers retrieved successfully",
      ...result,
      filters: {
        search: search || null,
        sortBy: sortField,
        sortOrder: order,
      },
      summary: {
        totalManufacturers: manufacturerStats.length,
        averageMedicinesPerManufacturer:
          Math.round(_.meanBy(manufacturerStats, "medicineCount") * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Search manufacturers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search manufacturers",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Controller 3: Get medicines associated with specific manufacturers
 * GET /api/medicines/by-manufacturer
 */
export const getMedicinesByManufacturer = async (req, res) => {
  try {
    const {
      manufacturer = "",
      search = "",
      sortBy = "medicineName",
      sortOrder = "asc",
      page = 1,
      limit = 50,
      includeStats = "false",
    } = req.query;

    if (!manufacturer || manufacturer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Manufacturer parameter is required",
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const medicineData = await loadMedicineData();

    // Filter by manufacturer with flexible matching
    const manufacturerTerm = manufacturer.toLowerCase().trim();
    let filteredMedicines = medicineData.filter((medicine) =>
      medicine.manufacturer.toLowerCase().includes(manufacturerTerm)
    );

    if (filteredMedicines.length === 0) {
      // Suggest similar manufacturers
      const suggestions = _.uniq(medicineData.map((m) => m.manufacturer))
        .filter((m) => {
          const similarity = m.toLowerCase();
          return manufacturerTerm
            .split(" ")
            .some((term) => similarity.includes(term) && term.length > 2);
        })
        .slice(0, 10);

      return res.status(404).json({
        success: false,
        message: "No medicines found for the specified manufacturer",
        suggestions:
          suggestions.length > 0
            ? suggestions
            : ["No similar manufacturers found"],
      });
    }

    // Apply additional search filter within manufacturer's medicines
    if (search && search.trim()) {
      filteredMedicines = searchFilter(filteredMedicines, search);
    }

    // Sort medicines
    const validSortFields = [
      "medicineName",
      "price",
      "composition",
      "letterCategory",
      "packageInfo",
    ];
    const sortField = validSortFields.includes(sortBy)
      ? sortBy
      : "medicineName";
    const order = sortOrder.toLowerCase() === "desc" ? "desc" : "asc";

    filteredMedicines = _.orderBy(filteredMedicines, [sortField], [order]);

    // Paginate results
    const result = paginate(filteredMedicines, pageNum, limitNum);

    const response = {
      success: true,
      message: "Medicines by manufacturer retrieved successfully",
      ...result,
      filters: {
        manufacturer,
        search: search || null,
        sortBy: sortField,
        sortOrder: order,
      },
    };

    // Include statistics if requested
    if (includeStats.toLowerCase() === "true") {
      const allMedicinesForManufacturer = medicineData.filter((medicine) =>
        medicine.manufacturer.toLowerCase().includes(manufacturerTerm)
      );

      const prices = allMedicinesForManufacturer
        .map((m) => m.price)
        .filter((p) => p > 0);
      const avgPrice = prices.length > 0 ? _.mean(prices) : 0;
      const minPrice = prices.length > 0 ? _.min(prices) : 0;
      const maxPrice = prices.length > 0 ? _.max(prices) : 0;

      response.statistics = {
        totalMedicines: allMedicinesForManufacturer.length,
        averagePrice: Math.round(avgPrice * 100) / 100,
        priceRange: {
          min: minPrice,
          max: maxPrice,
          minDisplay:
            allMedicinesForManufacturer.find((m) => m.price === minPrice)
              ?.mrpOriginal || "N/A",
          maxDisplay:
            allMedicinesForManufacturer.find((m) => m.price === maxPrice)
              ?.mrpOriginal || "N/A",
        },
        categories: _.uniq(
          allMedicinesForManufacturer.map((m) => m.letterCategory)
        )
          .filter(Boolean)
          .sort(),
        topCompositions: _.chain(allMedicinesForManufacturer)
          .groupBy("composition")
          .map((medicines, composition) => ({
            composition: composition || "Unknown",
            count: medicines.length,
          }))
          .orderBy("count", "desc")
          .take(5)
          .value(),
        manufacturerVariations: _.uniq(
          allMedicinesForManufacturer.map((m) => m.manufacturer)
        ).sort(),
      };
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Get medicines by manufacturer error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get medicines by manufacturer",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

// Export the loadMedicineData function for use in routes

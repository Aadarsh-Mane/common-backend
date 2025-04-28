import upload from "../helpers/multer.js";
import Investigation from "../models/investigationSchema.js";
import { uploadToDrive } from "../services/uploader.js";
import mongoose from "mongoose";
export const getAllInvestigations = async (req, res) => {
  try {
    // Extract query parameters for filtering
    const {
      patientIdNumber,
      doctorId,
      doctorName,
      investigationType,
      status,
      priority,
      startDate,
      endDate,
      facility,
      isAbnormal,
      limit = 20,
      page = 1,
      sortBy = "orderDate",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Apply filters if provided
    if (patientIdNumber) {
      filter.patientIdNumber = patientIdNumber;
    }

    if (doctorId) {
      filter.doctorId = doctorId;
    }

    if (doctorName) {
      // Case-insensitive partial match for doctor name
      filter.doctorName = { $regex: doctorName, $options: "i" };
    }

    if (investigationType) {
      filter.investigationType = investigationType;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    // Date range filter for orderDate
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) {
        filter.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.orderDate.$lte = new Date(endDate);
      }
    }

    // Facility filter (if needed)
    if (facility) {
      filter["performedBy.facility"] = { $regex: facility, $options: "i" };
    }

    // Filter for abnormal results
    if (isAbnormal !== undefined) {
      filter["results.isAbnormal"] = isAbnormal === "true";
    }

    // Set up pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Determine sort direction
    const sortDirection = sortOrder.toLowerCase() === "asc" ? 1 : -1;

    // Create sort object
    const sort = {};
    sort[sortBy] = sortDirection;

    // Get total count for pagination
    const total = await Investigation.countDocuments(filter);

    // Execute query with pagination and sorting
    const investigations = await Investigation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("patientId", "name")
      .lean();

    // Add extra fields for UI
    const enhancedInvestigations = investigations.map((investigation) => {
      // Calculate days elapsed since order date
      const daysSinceOrdered = Math.floor(
        (new Date() - new Date(investigation.orderDate)) / (1000 * 60 * 60 * 24)
      );

      // Determine if the investigation is overdue based on priority and status
      let isOverdue = false;
      if (
        investigation.status === "Ordered" ||
        investigation.status === "Scheduled"
      ) {
        switch (investigation.priority) {
          case "STAT":
            isOverdue = daysSinceOrdered > 1;
            break;
          case "Urgent":
            isOverdue = daysSinceOrdered > 3;
            break;
          case "Routine":
            isOverdue = daysSinceOrdered > 7;
            break;
        }
      }

      return {
        ...investigation,
        daysSinceOrdered,
        isOverdue,
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));

    return res.status(200).json({
      success: true,
      count: total,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        pageSize: parseInt(limit),
        totalItems: total,
      },
      data: enhancedInvestigations,
    });
  } catch (error) {
    console.error("Error fetching investigations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch investigations",
      error: error.message,
    });
  }
};
export const uploadReportMiddleware = upload.single("reportFile");

/**
 * Controller to upload investigation report
 * @route POST /api/investigations/:id/upload-report
 * @access Public (since you mentioned it's not authenticated)
 */

export const uploadInvestigationReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      performerName,
      performerDesignation,
      facilityName,
      findings,
      impression,
      recommendations,
      isAbnormal,
      normalRanges,
      numericalResults,
      cost,
    } = req.body;

    // Validate request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload a report file.",
      });
    }

    if (!performerName || !performerDesignation) {
      return res.status(400).json({
        success: false,
        message: "Performer name and designation are required.",
      });
    }

    // Check if investigation exists
    const investigation = await Investigation.findById(id);
    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: "Investigation not found",
      });
    }

    // Make sure the investigation is in the right status
    if (
      investigation.status !== "Ordered" &&
      investigation.status !== "Scheduled"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot upload report for investigation with status '${investigation.status}'`,
      });
    }

    // Generate a unique filename
    const timestamp = new Date().getTime();
    const patientId = investigation.patientIdNumber;
    const investigationType = investigation.investigationType;
    const fileName = `${patientId}_${investigationType}_${timestamp}.pdf`;

    // Upload file to Google Drive
    const fileUrl = await uploadToDrive(
      req.file.buffer,
      fileName,
      "1MKYZ4fIUzERPyYzL_8I101agWemxVXts"
    );

    // Create attachment object
    const attachment = {
      fileName,
      fileType: "PDF",
      fileUrl,
      uploadDate: new Date(),
      description: `${investigationType} report uploaded by ${performerName}`,
    };

    // Add to investigation attachments
    investigation.attachments.push(attachment);

    // Update performer information
    investigation.performedBy = {
      name: performerName,
      designation: performerDesignation,
      facility: facilityName || "Not specified",
    };

    // Update investigation status to "Completed"
    investigation.status = "Completed";
    investigation.completionDate = new Date();

    // Critical fix: Using findByIdAndUpdate instead of .save() to avoid validation errors
    // with reviewedBy field - this method bypasses the document validation
    if (
      findings ||
      impression ||
      recommendations ||
      isAbnormal !== undefined ||
      normalRanges ||
      numericalResults
    ) {
      // Define the update operations
      const updateOperations = {
        status: "Results Available",
        "performedBy.name": performerName,
        "performedBy.designation": performerDesignation,
        "performedBy.facility": facilityName || "Not specified",
        completionDate: new Date(),
        $push: {
          attachments: attachment,
          notes: {
            text: `Investigation report uploaded by ${performerName} (${performerDesignation})${
              facilityName ? " from " + facilityName : ""
            }`,
            addedBy: {
              userId: new mongoose.Types.ObjectId(),
              userType: "Technician",
              name: performerName,
            },
            dateAdded: new Date(),
          },
        },
      };

      // Set results fields if provided
      if (findings) updateOperations["results.findings"] = findings;
      if (impression) updateOperations["results.impression"] = impression;
      if (recommendations)
        updateOperations["results.recommendations"] = recommendations;
      if (isAbnormal !== undefined)
        updateOperations["results.isAbnormal"] =
          isAbnormal === "true" || isAbnormal === true;

      if (normalRanges) {
        try {
          updateOperations["results.normalRanges"] = JSON.parse(normalRanges);
        } catch (e) {
          updateOperations["results.normalRanges"] = normalRanges;
        }
      }

      if (numericalResults) {
        try {
          updateOperations["results.numericalResults"] =
            JSON.parse(numericalResults);
        } catch (e) {
          updateOperations["results.numericalResults"] = numericalResults;
        }
      }

      // Update billing if cost provided
      if (cost) {
        updateOperations["billing.cost"] = parseFloat(cost);
      }

      // Execute the update
      await Investigation.findByIdAndUpdate(id, updateOperations, {
        new: true,
      });

      return res.status(200).json({
        success: true,
        message: "Investigation report uploaded successfully with results",
        data: {
          attachment,
          status: "Results Available",
          completionDate: new Date(),
        },
      });
    } else {
      // If no results provided, just save the attachment and status update
      await investigation.save();

      return res.status(200).json({
        success: true,
        message: "Investigation report uploaded successfully",
        data: {
          attachment,
          status: investigation.status,
          completionDate: investigation.completionDate,
        },
      });
    }
  } catch (error) {
    console.error("Error uploading investigation report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload investigation report",
      error: error.message,
    });
  }
};
export const getInvestigationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the investigation
    const investigation = await Investigation.findById(id).populate(
      "patientId",
      "name age gender"
    );

    if (!investigation) {
      return res.status(404).json({
        success: false,
        message: "Investigation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: investigation,
    });
  } catch (error) {
    console.error("Error fetching investigation details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch investigation details",
      error: error.message,
    });
  }
};

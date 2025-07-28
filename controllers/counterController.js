// controllers/patientCounterController.js

import PatientCounter from "../models/patientCounter.js";

/**
 * Get all patient counters with their current values
 * GET /api/patient-counters
 */
export const getAllPatientCounters = async (req, res) => {
  try {
    // Fetch all counters
    const counters = await PatientCounter.find({}).sort({ _id: 1 });

    // If no counters exist, create default ones
    if (counters.length === 0) {
      const defaultCounters = [
        {
          _id: "opdNumber",
          sequence_value: 0,
          resetPeriod: "yearly",
        },
        {
          _id: "ipdNumber",
          sequence_value: 0,
          resetPeriod: "yearly",
        },
      ];

      await PatientCounter.insertMany(defaultCounters);

      return res.status(200).json({
        success: true,
        message: "Default counters created successfully",
        data: {
          counters: defaultCounters,
          totalCounters: defaultCounters.length,
        },
      });
    }

    // Format response data
    const formattedCounters = counters.map((counter) => ({
      id: counter._id,
      name: counter._id === "opdNumber" ? "OPD Number" : "IPD Number",
      currentValue: counter.sequence_value,
      lastReset: counter.lastReset,
      resetPeriod: counter.resetPeriod,
      nextValue: counter.sequence_value + 1,
      createdAt: counter.createdAt,
      updatedAt: counter.updatedAt,
    }));

    res.status(200).json({
      success: true,
      message: "Patient counters retrieved successfully",
      data: {
        counters: formattedCounters,
        totalCounters: counters.length,
        summary: {
          opdCurrentValue:
            counters.find((c) => c._id === "opdNumber")?.sequence_value || 0,
          ipdCurrentValue:
            counters.find((c) => c._id === "ipdNumber")?.sequence_value || 0,
          opdNextValue:
            (counters.find((c) => c._id === "opdNumber")?.sequence_value || 0) +
            1,
          ipdNextValue:
            (counters.find((c) => c._id === "ipdNumber")?.sequence_value || 0) +
            1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching patient counters:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve patient counters",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Update/Modify specific patient counter values
 * PUT /api/patient-counters/:counterType
 * Body: { newValue: number, resetPeriod?: string }
 */
export const updatePatientCounter = async (req, res) => {
  try {
    const { counterType } = req.params;
    const { newValue } = req.body;
    const { userId, usertype } = req;
    const resetPeriod = "never";
    // Validate counter type
    if (!["opdNumber", "ipdNumber"].includes(counterType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid counter type. Must be 'opdNumber' or 'ipdNumber'",
      });
    }

    // Validate new value
    if (typeof newValue !== "number" || newValue < 0) {
      return res.status(400).json({
        success: false,
        message: "New value must be a non-negative number",
      });
    }

    // Validate reset period if provided
    if (resetPeriod && !["yearly", "monthly", "never"].includes(resetPeriod)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid reset period. Must be 'yearly', 'monthly', or 'never'",
      });
    }

    // Get current counter value for audit
    const currentCounter = await PatientCounter.findOne({ _id: counterType });
    const currentValue = currentCounter?.sequence_value || 0;

    // Update counter
    const updateData = {
      sequence_value: newValue,
      lastReset: new Date(),
    };

    if (resetPeriod) {
      updateData.resetPeriod = resetPeriod;
    }

    const updatedCounter = await PatientCounter.findOneAndUpdate(
      { _id: counterType },
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    // Log the counter change for audit purposes
    console.log(`Counter Update Audit:`, {
      counterType,
      previousValue: currentValue,
      newValue: newValue,
      changedBy: userId,
      userType: usertype,
      timestamp: new Date().toISOString(),
      resetPeriod: updatedCounter.resetPeriod,
    });

    res.status(200).json({
      success: true,
      message: `${counterType} counter updated successfully`,
      data: {
        counter: {
          id: updatedCounter._id,
          name:
            updatedCounter._id === "opdNumber" ? "OPD Number" : "IPD Number",
          previousValue: currentValue,
          currentValue: updatedCounter.sequence_value,
          nextValue: updatedCounter.sequence_value + 1,
          resetPeriod: updatedCounter.resetPeriod,
          lastReset: updatedCounter.lastReset,
          changedBy: userId,
          changedAt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Error updating patient counter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update patient counter",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Reset patient counter to a specific value (Admin only)
 * POST /api/patient-counters/:counterType/reset
 * Body: { resetValue?: number, resetPeriod?: string }
 */
export const resetPatientCounter = async (req, res) => {
  try {
    const { counterType } = req.params;
    const { resetValue = 0, resetPeriod } = req.body;
    const { userId, usertype } = req;

    // Validate counter type
    if (!["opdNumber", "ipdNumber"].includes(counterType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid counter type. Must be 'opdNumber' or 'ipdNumber'",
      });
    }

    // Only admins can reset counters
    if (usertype !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can reset patient counters",
      });
    }

    // Validate reset value
    if (typeof resetValue !== "number" || resetValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Reset value must be a non-negative number",
      });
    }

    // Get current counter for audit
    const currentCounter = await PatientCounter.findOne({ _id: counterType });
    const previousValue = currentCounter?.sequence_value || 0;

    // Reset counter
    const newSequenceValue = await PatientCounter.resetCounter(
      counterType,
      resetValue
    );

    // Update reset period if provided
    if (resetPeriod && ["yearly", "monthly", "never"].includes(resetPeriod)) {
      await PatientCounter.findOneAndUpdate(
        { _id: counterType },
        { resetPeriod: resetPeriod }
      );
    }

    // Log the counter reset for audit purposes
    console.log(`Counter Reset Audit:`, {
      counterType,
      previousValue,
      resetValue: newSequenceValue,
      resetBy: userId,
      userType: usertype,
      timestamp: new Date().toISOString(),
      resetPeriod: resetPeriod || currentCounter?.resetPeriod,
    });

    res.status(200).json({
      success: true,
      message: `${counterType} counter reset successfully`,
      data: {
        counter: {
          id: counterType,
          name: counterType === "opdNumber" ? "OPD Number" : "IPD Number",
          previousValue,
          currentValue: newSequenceValue,
          nextValue: newSequenceValue + 1,
          resetBy: userId,
          resetAt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("Error resetting patient counter:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset patient counter",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Get next available number for OPD or IPD
 * GET /api/patient-counters/:counterType/next
 */
export const getNextCounterValue = async (req, res) => {
  try {
    const { counterType } = req.params;

    // Validate counter type
    if (!["opdNumber", "ipdNumber"].includes(counterType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid counter type. Must be 'opdNumber' or 'ipdNumber'",
      });
    }

    // Get current value without incrementing
    const currentValue = await PatientCounter.getCurrentSequenceValue(
      counterType
    );
    const nextValue = currentValue + 1;

    res.status(200).json({
      success: true,
      message: `Next ${counterType} value retrieved successfully`,
      data: {
        counterType,
        currentValue,
        nextValue,
        formattedNext:
          counterType === "opdNumber"
            ? `OPD${nextValue.toString().padStart(4, "0")}`
            : `IPD${nextValue.toString().padStart(4, "0")}`,
      },
    });
  } catch (error) {
    console.error("Error getting next counter value:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get next counter value",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

/**
 * Batch update multiple counters
 * PUT /api/patient-counters/batch
 * Body: { counters: [{ type: string, value: number, resetPeriod?: string }] }
 */
export const batchUpdateCounters = async (req, res) => {
  try {
    const { counters } = req.body;
    const { userId, usertype } = req;

    // Check permissions
    if (!["admin", "reception"].includes(usertype)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to batch update counters",
      });
    }

    // Validate input
    if (!Array.isArray(counters) || counters.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Counters array is required and must not be empty",
      });
    }

    const updateResults = [];
    const errors = [];

    // Process each counter update
    for (const counter of counters) {
      try {
        const { type, value, resetPeriod } = counter;

        // Validate each counter
        if (!["opdNumber", "ipdNumber"].includes(type)) {
          errors.push(`Invalid counter type: ${type}`);
          continue;
        }

        if (typeof value !== "number" || value < 0) {
          errors.push(`Invalid value for ${type}: ${value}`);
          continue;
        }

        // Get current value for audit
        const currentCounter = await PatientCounter.findOne({ _id: type });
        const previousValue = currentCounter?.sequence_value || 0;

        // Update counter
        const updateData = {
          sequence_value: value,
          lastReset: new Date(),
        };

        if (
          resetPeriod &&
          ["yearly", "monthly", "never"].includes(resetPeriod)
        ) {
          updateData.resetPeriod = resetPeriod;
        }

        const updatedCounter = await PatientCounter.findOneAndUpdate(
          { _id: type },
          updateData,
          { new: true, upsert: true }
        );

        updateResults.push({
          type,
          previousValue,
          newValue: updatedCounter.sequence_value,
          resetPeriod: updatedCounter.resetPeriod,
          success: true,
        });
      } catch (counterError) {
        errors.push(`Error updating ${counter.type}: ${counterError.message}`);
      }
    }

    // Log batch update for audit
    console.log(`Batch Counter Update Audit:`, {
      updatedBy: userId,
      userType: usertype,
      timestamp: new Date().toISOString(),
      successfulUpdates: updateResults.length,
      errors: errors.length,
      results: updateResults,
    });

    res.status(200).json({
      success: errors.length === 0,
      message:
        errors.length === 0
          ? "All counters updated successfully"
          : "Some counters failed to update",
      data: {
        successful: updateResults,
        errors: errors,
        summary: {
          totalRequested: counters.length,
          successful: updateResults.length,
          failed: errors.length,
        },
      },
    });
  } catch (error) {
    console.error("Error in batch counter update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to batch update counters",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
};

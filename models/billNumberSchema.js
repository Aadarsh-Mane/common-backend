import mongoose from "mongoose";

// Bill Number Counter Schema for tracking sequential bill numbers
const billNumberCounterSchema = new mongoose.Schema({
  billType: {
    type: String,
    required: true,
    unique: true,
    enum: ["OPD", "IPD"],
  },
  currentNumber: {
    type: Number,
    required: true,
    default: 116, // Set to 116 so first increment gives 117
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to whoever generated the last bill
  },
});

// Add index for better query performance
billNumberCounterSchema.index({ billType: 1 });

// Static method to get next bill number
billNumberCounterSchema.statics.getNextBillNumber = async function (billType) {
  try {
    // First, try to find existing counter
    let counter = await this.findOne({ billType: billType.toUpperCase() });

    if (!counter) {
      // If no counter exists, create one with starting value 116
      counter = new this({
        billType: billType.toUpperCase(),
        currentNumber: 116,
        lastUpdated: new Date(),
      });
      await counter.save();
    }

    // Now increment the counter atomically
    const updatedCounter = await this.findOneAndUpdate(
      { billType: billType.toUpperCase() },
      {
        $inc: { currentNumber: 1 },
        $set: { lastUpdated: new Date() },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return updatedCounter.currentNumber;
  } catch (error) {
    console.error(`Error generating bill number for ${billType}:`, error);
    throw new Error(`Failed to generate ${billType} bill number`);
  }
};

// Static method to get current bill number without incrementing
billNumberCounterSchema.statics.getCurrentBillNumber = async function (
  billType
) {
  try {
    const counter = await this.findOne({ billType: billType.toUpperCase() });
    return counter ? counter.currentNumber : 116; // Return 116 if not found (next will be 117)
  } catch (error) {
    console.error(`Error getting current bill number for ${billType}:`, error);
    return 116;
  }
};

// Static method to reset bill number (admin only)
billNumberCounterSchema.statics.resetBillNumber = async function (
  billType,
  newNumber = 117
) {
  try {
    const counter = await this.findOneAndUpdate(
      { billType: billType.toUpperCase() },
      {
        currentNumber: newNumber - 1, // Set to newNumber - 1 so next will be newNumber
        lastUpdated: new Date(),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return counter.currentNumber + 1; // Return what the next number will be
  } catch (error) {
    console.error(`Error resetting bill number for ${billType}:`, error);
    throw new Error(`Failed to reset ${billType} bill number`);
  }
};

// Instance method to format bill number with prefix
billNumberCounterSchema.methods.getFormattedBillNumber = function () {
  return `${this.billType}${String(this.currentNumber).padStart(4, "0")}`;
};

// Pre-save middleware to validate bill type
billNumberCounterSchema.pre("save", function (next) {
  if (this.billType) {
    this.billType = this.billType.toUpperCase();
  }
  next();
});

// Virtual to get formatted bill number
billNumberCounterSchema.virtual("formattedNumber").get(function () {
  return `${this.billType}${String(this.currentNumber).padStart(4, "0")}`;
});

const BillNumberCounter = mongoose.model(
  "BillNumberCounter",
  billNumberCounterSchema
);

export default BillNumberCounter;

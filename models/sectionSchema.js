import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    totalBeds: {
      type: Number,
      required: true,
      min: 1,
    },
    availableBeds: {
      type: Number,
      default: function () {
        return this.totalBeds;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // createdBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
  },
  {
    timestamps: true,
  }
);

const Section = mongoose.model("Section", sectionSchema);

export default Section;

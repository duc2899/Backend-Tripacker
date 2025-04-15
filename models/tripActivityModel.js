const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    time: { type: String, default: "" }, // HH:mm
    type: {
      type: String,
      required: true,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    cost: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

const tripActivitySchema = new mongoose.Schema({
  date: { type: String, required: true },
  activities: [activitySchema],
  tepmplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "templates",
    required: true,
  },
});

const TripActivity = mongoose.model("tripActivities", tripActivitySchema);

module.exports = TripActivity;

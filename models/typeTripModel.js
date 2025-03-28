const mongoose = require("mongoose");

const tripTypeSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("tripTypes", tripTypeSchema);

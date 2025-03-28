const TripType = require("../models/typeTripModel"); // Import the TripType model
const throwError = require("../utils/throwError");

// Add a new trip type
exports.createTripType = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ message: "Name is required and cannot be empty" });
    }
    const newTripType = new TripType({ name });
    await newTripType.save();
    res
      .status(201)
      .json({ message: "Trip type added successfully", tripType: newTripType });
  } catch (error) {
    next(error);
  }
};

// Get all trip types
exports.getTripTypes = async (req, res, next) => {
  try {
    const tripTypes = await TripType.find();
    res.status(200).json({
      message: "Get type trip successfully",
      data: tripTypes,
    });
  } catch (error) {
    next(error);
  }
};

// Update a trip type
exports.updateTripType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || name.trim() === "") {
      throwError("Name is required and cannot be empty");
    }
    const updatedTripType = await TripType.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );
    if (!updatedTripType) {
      throwError("Trip type not found");
    }
    res.status(200).json({
      message: "Trip type updated successfully",
      data: updatedTripType,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a trip type
exports.deleteTripType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedTripType = await TripType.findByIdAndDelete(id);
    if (!deletedTripType) {
      throwError("Trip type not found");
    }
    res.status(200).json({ message: "Trip type deleted successfully" });
  } catch (error) {
    next(error);
  }
};

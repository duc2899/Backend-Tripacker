const {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
} = require("../schemas/tripActivity.schema");
const throwError = require("../utils/throwError");

const validateCreatedTripActivity = async (data) => {
  try {
    await createTripActivitySchema.validate(data);

    // custom logic nếu cần
  } catch (err) {
    throwError(err.message);
  }
};

const validateEditTripActivity = async (data) => {
  try {
    await editTripActivitySchema.validate(data);

    // custom logic nếu cần
  } catch (err) {
    throwError(err.message);
  }
};

const validateDeleteTripActivity = async (data) => {
  try {
    await deleteTripActivitySchema.validate(data);

    // custom logic nếu cần
  } catch (err) {
    throwError(err.message);
  }
};

module.exports = {
  validateCreatedTripActivity,
  validateEditTripActivity,
  validateDeleteTripActivity,
};

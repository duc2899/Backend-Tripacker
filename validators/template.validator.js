const { createTemplteSchema } = require("../schemas/template.schema");
const throwError = require("../utils/throwError");

const validateTemplateData = async (data) => {
  try {
    await createTemplteSchema.validate(data);
    // Logic phụ về ngày
    const { startDate, endDate } = data;
    if (startDate && endDate) {
      const [sM, sD, sY] = startDate.split("/");
      const [eM, eD, eY] = endDate.split("/");

      const start = new Date(`${sY}-${sM}-${sD}`);
      const end = new Date(`${eY}-${eM}-${eD}`);

      const now = new Date();
      const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      if (start < vnNow) {
        throw throwError("TEM-021");
      }
      if (start > end) {
        throw throwError("TEM-022");
      }
    }
    // custom logic nếu cần
  } catch (err) {
    throwError(err.message);
  }
};

module.exports = {
  validateTemplateData,
};

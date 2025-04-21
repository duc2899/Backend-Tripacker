const adminService = require("../services/adminService.service.js");

exports.clearCache = async (req, res, next) => {
  try {
    await adminService.clearCache();
    return res.status(200).json({
      status: true,
      message: "COMMON-003",
    });
  } catch (error) {
    next(error);
  }
};

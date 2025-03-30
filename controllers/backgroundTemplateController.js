const BackgroundTemplateService = require("../services/backgroundTemplate.service.js");

exports.fectchDataImageBackground = async (req, res, next) => {
  try {
    await BackgroundTemplateService.fetchImageFromExcel();
    return res.status(200).json({
      status: true,
      message: "Get data background succesfully",
    });
  } catch (error) {
    next(error);
  }
};
exports.getBackGroundByTripType = async (req, res, next) => {
  try {
    const reuslt = await BackgroundTemplateService.getBackgroundsByTripType(
      req.params.tripTypeId
    );
    return res.status(200).json({
      status: true,
      message: "BGTEM-001",
      data: reuslt,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllTripType = async (req, res, next) => {
  try {
    const result = await BackgroundTemplateService.getAllTripTypes();
    return res.status(200).json({
      status: true,
      message: "BGTEM-002",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

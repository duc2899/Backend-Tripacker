const BackgroundTemplateService = require("../services/backgroundTemplate.service");

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
      message: "Get data background succesfully",
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
      message: "Get all trip types successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

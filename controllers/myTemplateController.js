const myTemplateService = require("../services/myTemplate.service");

exports.getTripTimeLine = async (req, res, next) => {
  try {
    const result = await myTemplateService.getTripTimeLine(req);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTripTimeLine = async (req, res, next) => {
  try {
    const result = await myTemplateService.updateTripTimeLine(req);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSuggestActivity = async (req, res, next) => {
  try {
    const result = await myTemplateService.getSuggestActivityFromAI(req);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.createActivity = async (req, res, next) => {
  try {
    const result = await myTemplateService.createActivity(req);
    return res.status(201).json({
      message: "COMMON-001",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.editActivity = async (req, res, next) => {
  try {
    const result = await myTemplateService.editActivity(req);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteActivity = async (req, res, next) => {
  try {
    await myTemplateService.deleteActivity(req);
    return res.status(200).json({
      message: "COMMON-004",
    });
  } catch (error) {
    next(error);
  }
};

exports.checkPermission = async (req, res, next) => {
  try {
    await myTemplateService.middleCheckEditPermission(req, next);
  } catch (error) {
    next(error);
  }
};

exports.addMembers = async (req, res, next) => {
  try {
    const result = await myTemplateService.addMembers(req);
    return res.status(200).json({
      message: "TEM-034",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const myTemplateService = require("../services/myTemplate.service");

exports.getTripTimeLine = async (req, res, next) => {
  try {
    const result = await myTemplateService.getTripTimeLine(
      req.user,
      req.params.templateId
    );
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTripTimeLine = async (req, res, next) => {
  try {
    const result = await myTemplateService.updateTripTimeLine(
      req.user,
      req.body
    );
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateListMembers = async (req, res, next) => {
  try {
    const result = await myTemplateService.updateListMembers(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMembers = async (req, res, next) => {
  try {
    const result = await myTemplateService.deleteMembers(req.user, req.body);
    return res.status(200).json({
      message: "COMMON-004",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRoleMember = async (req, res, next) => {
  try {
    const result = await myTemplateService.updateRoleMember(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
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
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.createActivity = async (req, res, next) => {
  try {
    const result = await myTemplateService.createActivity(req.body);
    return res.status(201).json({
      message: "COMMON-001",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.editActivity = async (req, res, next) => {
  try {
    const result = await myTemplateService.editActivity(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteActivity = async (req, res, next) => {
  try {
    await myTemplateService.deleteActivity(req.body);
    return res.status(200).json({
      message: "COMMON-004",
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.checkPermission = async (req, res, next) => {
  try {
    await myTemplateService.middleCheckEditPermission(
      req.user,
      req.body.templateId
    );
    next();
  } catch (error) {
    next(error);
  }
};

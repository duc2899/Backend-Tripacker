const memberTaskService = require("../services/memberTask.service");

exports.createMemberTask = async (req, res, next) => {
  try {
    const result = await memberTaskService.createMemberTask(req.user, req.body);
    return res.status(201).json({
      message: "COMMON-002",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMemberTask = async (req, res, next) => {
  try {
    const result = await memberTaskService.getMemberTask(req.params.templateId);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberTask = async (req, res, next) => {
  try {
    const result = await memberTaskService.updateMemberTask(req.user, req.body);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.moveMemberTask = async (req, res, next) => {
  try {
    const result = await memberTaskService.moveMemberTask(req.user, req.body);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMemberTask = async (req, res, next) => {
  try {
    const result = await memberTaskService.deleteMemberTask(req.body);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.getListMemberTask = async (req, res, next) => {
  try {
    const result = await memberTaskService.getListMemberInTemplate(
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

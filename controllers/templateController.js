const templateService = require("../services/template.service");

exports.createTemplate = async (req, res, next) => {
  try {
    const result = await templateService.createTemplate(req.user, req.body);
    return res.status(201).json({
      message: "COMMON-001",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const result = await templateService.getTemplate(req.params.templateId);
    res.status(200).json({
      data: result,
      message: "TEM-003",
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCategoryPacks = async (req, res, next) => {
  try {
    const result = await templateService.updateCategoryPacks(
      req.body,
      req.user.userId
    );

    return res.status(200).json({
      message: "TEM-004",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.searchTemplates = async (req, res, next) => {
  try {
    const result = await templateService.searchTemplates(req.params);
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.searchUsersByEmail = async (req, res, next) => {
  try {
    const result = await templateService.searchUsersByEmail(
      req.user,
      req.params
    );
    return res.status(200).json({
      message: "COMMON-002",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

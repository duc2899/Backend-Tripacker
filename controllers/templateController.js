const templateService = require("../services/template.service");

exports.createTemplate = async (req, res, next) => {
  try {
    const result = await templateService.createTemplate(req.body, req.user);
    return res.status(201).json({
      message: "TEM-001",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSuggest = async (req, res, next) => {
  try {
    const result = await templateService.getSuggestAI(req.body);
    return res.status(200).json({
      data: result,
      message: "TEM-002",
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

exports.updateInforTemplate = async (req, res, next) => {
  try {
    const result = await templateService.updateInforTemplate(
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

exports.getSearchGoogle = async (req, res, next) => {
  try {
    const result = await templateService.getSearchGoogle();
    return res.status(200).json({
      message: "TEM-005",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

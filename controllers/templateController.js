const templateService = require("../services/template.service");

exports.createTemplate = async (req, res, next) => {
  try {
    const result = await templateService.createTemplate(req.body, req.user);
    return res.status(201).json({
      message: "Template created successfully",
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
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplate = async (req, res, next) => {
  try {
    const result = await templateService.getTemplate(req.params.templateId);
    res.status(200).json({
      message: "Template and Pack retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCategoryPacks = async (req, res, next) => {
  try {
    const result = await templateService.updateCategoryPacks(
      req.body,
      req.user
    );

    return res.status(200).json({
      message: "Pack updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInforTemplate = async (req, res, next) => {
  try {
    const result = await templateService(req.body, req.user);

    return res.status(200).json({
      message: "Template updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

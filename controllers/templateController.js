const TemplateService = require("../services/template.service");
const TripTimeLineService = require("../services/myTemplates/tripTimeLine.service");
const TripAsstitantService = require("../services/myTemplates/tripAsstitant.service");

exports.createTemplate = async (req, res, next) => {
  try {
    const result = await TemplateService.createTemplate(req.user, req.body);

    await TripTimeLineService.getSuggestActivityFromAI(req.user, {
      templateId: result._id,
      forceUpdate: true,
    });

    await TripAsstitantService.getSuggestPacksFromAI(result._id);

    await TripAsstitantService.getSuggestChecklist(result._id);

    return res.status(201).json({
      message: "COMMON-001",
      data: result,
      status: true,
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
      status: true,
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
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

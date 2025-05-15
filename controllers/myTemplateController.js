const TripTimeLineService = require("../services/myTemplates/tripTimeLine.service");
const TripAsstitantService = require("../services/myTemplates/tripAsstitant.service");

//--------------------- Trip Timeline -------------------------------

exports.getTripTimeLine = async (req, res, next) => {
  try {
    const result = await TripTimeLineService.getTripTimeLine(
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
    const result = await TripTimeLineService.updateTripTimeLine(req.body);
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
    const result = await TripTimeLineService.updateListMembers(req.body);
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
    const result = await TripTimeLineService.deleteMembers(req.user, req.body);
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
    const result = await TripTimeLineService.updateRoleMember(req.body);
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
    const result = await TripTimeLineService.getSuggestActivityFromAI(
      req.user,
      req.query
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

exports.createActivity = async (req, res, next) => {
  try {
    const result = await TripTimeLineService.createActivity(req.body);
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
    const result = await TripTimeLineService.editActivity(req.body);
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
    const result = await TripTimeLineService.deleteActivity(req.body);
    return res.status(200).json({
      message: "COMMON-004",
      status: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.reOrderActivity = async (req, res, next) => {
  try {
    const result = await TripTimeLineService.reOrderActivity(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      status: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//--------------------- Trip Asstitant -------------------------------

exports.getTripAsstitant = async (req, res, next) => {
  try {
    const result = await TripAsstitantService.getTripAsstitant(
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

exports.updateTripAssistant = async (req, res, next) => {
  try {
    const result = await TripAsstitantService.updateTripAssistant(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.managerCategory = async (req, res, next) => {
  try {
    const result = await TripAsstitantService.managerCategory(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.managerItemsCategory = async (req, res, next) => {
  try {
    const result = await TripAsstitantService.managerItemsCategory(req.body);
    return res.status(200).json({
      message: "COMMON-003",
      data: result,
      status: true,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSuggestChecklist = async (req, res, next) => {
  try {
    const result = await TripAsstitantService.getSuggestChecklistFromAI(
      req.query
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

exports.getWeatherForecast = async (req, res, next) => {
  try {
    const result = await TripAsstitantService.getWeatherForecast(
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

//--------------------- Template Common ------------------------------- ////

exports.checkPermission = (roles = ["edit"]) => {
  return async (req, res, next) => {
    try {
      const { templateId } = {
        ...req.params,
        ...req.body,
        ...req.query,
      };

      await TripTimeLineService.middleCheckPermission(
        req.user,
        templateId,
        roles // Sử dụng roles được truyền vào
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};

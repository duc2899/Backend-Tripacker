const userService = require("../services/user.service.js");

exports.updateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUser(req.user, req.body);

    return res.status(200).json({
      status: true,
      message: "COMMON-003",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserInformation = async (req, res, next) => {
  try {
    const user = await userService.getUserInformation(req.user);

    return res.status(200).json({
      status: true,
      message: "COMMON-002",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplateOwner = async (req, res, next) => {
  try {
    const user = await userService.getTemplateOwner(req.user);

    return res.status(200).json({
      status: true,
      message: "COMMON-002",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.upateAvatar = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateAvatar(req.user, req.file);

    return res.status(200).json({
      status: true,
      message: "COMMON-003",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTemplate = async (req, res, next) => {
  try {
    await userService.deleteTemplate(req.user, req.body.templateId);
    return res.status(200).json({
      status: true,
      message: "COMMON-003",
    });
  } catch (error) {
    next(error);
  }
};

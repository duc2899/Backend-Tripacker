const authServices = require("../services/auth.service.js");

exports.register = async (req, res, next) => {
  try {
    await authServices.register(req, res);
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    await authServices.verifyEmail(req, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authServices.login(req, res);

    return res.status(200).json({
      status: true,
      message: "AUTH-012",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await authServices.logout(req, res);

    return res.status(200).json({
      status: true,
      message: "AUTH-013",
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    await authServices.forgotPassword(req);

    return res.status(200).json({
      status: true,
      message: "AUTH-021",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    await authServices.resetPassword(req, res);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    await authServices.changePassword(req);

    return res.status(200).json({
      status: true,
      message: "AUTH-027",
    });
  } catch (error) {
    next(error);
  }
};

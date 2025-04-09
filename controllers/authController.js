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
    await authServices.verifyEmail(req.params.token, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authServices.login(req.body, res);

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
    await authServices.logout(req.user, res);

    return res.status(200).json({
      status: true,
      message: "AUTH-013",
    });
  } catch (error) {
    next(error);
  }
};

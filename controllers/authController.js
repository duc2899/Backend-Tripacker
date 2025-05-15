const authServices = require("../services/auth.service.js");

exports.register = async (req, res, next) => {
  try {
    const result = await authServices.register(req.body);
    return res.status(201).json({
      status: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const result = await authServices.verifyEmail(req.params);
    return res.redirect(result.url);
  } catch (error) {
    next(error);
  }
};

exports.loginNormal = async (req, res, next) => {
  try {
    const result = await authServices.loginNormal(req.body, res);
    return res.status(200).json({
      status: true,
      message: "AUTH-012",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.requestGoogle = async (req, res, next) => {
  try {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Referrer-Policy", "no-referrer");
    const reuslt = await authServices.requestGoogleLogin(res);
    return res.status(200).json({
      status: true,
      message: "COMMON-002",
      data: reuslt,
    });
  } catch (error) {
    next(error);
  }
};

exports.callBackGoogle = async (req, res, next) => {
  try {
    const result = await authServices.callBackGoogle(req.body, res);
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
    const result = await authServices.resetPassword(req.body);
    return res.status(200).json({
      status: true,
      message: result.url,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    await authServices.changePassword(req.user, req.body);

    return res.status(200).json({
      status: true,
      message: "AUTH-027",
    });
  } catch (error) {
    next(error);
  }
};

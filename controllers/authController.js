const authServices = require("../services/auth.service.js");

exports.register = async (req, res, next) => {
  try {
    await authServices.register(req);

    return res.status(201).json({
      success: true,
      message:
        "Account has been created. Please check email to verify this account",
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    await authServices.verifyEmail(req.params.token, res);

    return res.status(200).json({
      success: true,
      message: "Your account has been successfully verified!",
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authServices.login(req.body, res);

    return res.status(200).json({
      status: true,
      message: "Logged in successfully",
      data: {
        userId: result,
      },
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
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

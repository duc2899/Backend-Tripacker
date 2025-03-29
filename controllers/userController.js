const userService = require("../services/user.service.js");

exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    const updatedUser = await userService.updateUser(userId, updateData);

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      code: "USER-003",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await userService.getMe(req.user.userId);

    return res.status(200).json({
      status: true,
      message: "User retrieved successfully",
      code: "USER-004",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserInformation = async (req, res, next) => {
  try {
    const user = await userService.getUserInformation(req.user.userId);

    return res.status(200).json({
      status: true,
      message: "USER-005",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.upateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "USER-007" });
    }

    const updatedUser = await userService.updateAvatar(
      req.user.userId,
      req.file
    );

    return res.status(200).json({
      status: true,
      message: "USER-006",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

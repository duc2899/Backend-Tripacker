const userService = require("../services/user.service.js");

exports.updateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUser(req);

    return res.status(200).json({
      status: true,
      message: "USER-003",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// exports.getMe = async (req, res, next) => {
//   try {
//     const user = await userService.getMe(req.user.userId);

//     return res.status(200).json({
//       status: true,
//       message: "USER-004",
//       data: user,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.getUserInformation = async (req, res, next) => {
  try {
    const user = await userService.getUserInformation(req);

    return res.status(200).json({
      status: true,
      message: "USER-005",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTemplateOwner = async (req, res, next) => {
  try {
    const user = await userService.getTemplateOwner(req);

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

    const updatedUser = await userService.updateAvatar(req);

    return res.status(200).json({
      status: true,
      message: "USER-006",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

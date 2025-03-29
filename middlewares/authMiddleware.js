const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/userModel");
const redis = require("../config/redis");

dotenv.config({ path: "./.env" });

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.access_token; // Chỉ lấy token từ cookie

  if (!token) {
    return res.status(401).json({
      message: "Authorization token is missing",
      code: "AUTH-016",
      status: false,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(
      decoded.userId,
      "isDisabled name email"
    ).lean();

    if (!user) {
      return res
        .status(403)
        .json({ message: "User not found", code: "AUTH-014", status: false });
    }

    if (user.isDisabled) {
      return res.status(403).json({
        message: "User is disabled. Please contact the admin",
        code: "AUTH-015",
        status: false,
      });
    }

    // const isTokenRevoked = await redis.get(
    //   `TOKEN_BLACK_LIST_${decoded.userId}_${decoded.jit}`
    // );
    // if (isTokenRevoked) {
    //   return res
    //     .status(401)
    //     .json({ message: "Token revoked", code: "AUTH-018", status: false });
    // }

    req.user = {
      ...decoded,
      name: user.name,
      email: user.email,
    };
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ message: "Invalid token", code: "AUTH-017", status: false });
  }
};

module.exports = authMiddleware;

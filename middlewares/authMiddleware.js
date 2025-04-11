const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/userModel");
const redis = require("../config/redis");

dotenv.config({ path: "./.env" });

const authMiddleware = async (req, res, next) => {
  let token = req.cookies.access_token; // Lấy token từ cookie

  if (!token && req.headers.authorization) {
    // Nếu không có token trong cookie, thử lấy từ header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7, authHeader.length); // Loại bỏ "Bearer " để lấy token
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "AUTH-016",
      status: false,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(
      decoded.userId,
      "isDisabled verified fullName email"
    ).lean();

    if (!user) {
      return res.status(403).json({ message: "AUTH-014", status: false });
    }

    if (user.isDisabled) {
      return res.status(403).json({
        message: "AUTH-015",
        status: false,
      });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: "AUTH-020",
        status: false,
      });
    }

    // const isTokenRevoked = await redis.get(
    //   `TOKEN_BLACK_LIST_${decoded.userId}_${decoded.jit}`
    // );
    // if (isTokenRevoked) {
    //   return res
    //     .status(401)
    //     .json({ message: "Token revoked", message: "AUTH-018", status: false });
    // }

    req.user = {
      ...decoded,
      fullName: user.fullName,
      email: user.email,
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "AUTH-017", status: false });
  }
};

module.exports = authMiddleware;

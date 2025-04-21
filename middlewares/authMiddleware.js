const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/userModel");
const redis = require("../config/redis");

dotenv.config({ path: "./.env" });

const authMiddleware = (isCheckRoleAdmin = false) => {
  return async (req, res, next) => {
    try {
      let token = req.cookies.access_token;

      if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return res.status(401).json({
          message: "AUTH-016",
          status: false,
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(
        decoded.userId,
        "isDisabled verified fullName email role"
      ).lean();

      if (!user) {
        return res.status(403).json({ message: "AUTH-014", status: false });
      }

      if (isCheckRoleAdmin && user.role !== "admin") {
        return res.status(403).json({
          message: "Your role is not suitable. Please contact to admin",
          status: false,
        });
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

      req.user = {
        ...decoded,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      };

      return next(); // Thêm return ở đây
    } catch (err) {
      return res.status(403).json({
        message: "AUTH-017",
        error: err.message, // Thêm thông tin lỗi để debug
        status: false,
      });
    }
  };
};

module.exports = authMiddleware;

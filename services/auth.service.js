const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/userModel");
const verifyEmailTemplate = require("../templates/mail/verifyAccount");
const throwError = require("../utils/throwError");
const mailServices = require("../utils/sendEmail");
const redis = require("../config/redis.js");

const { EXPIRED_TIME_TOKEN, MAX_AGE_COOKIE } = require("../config/constant");

const isDevelopment = process.env.NODE_ENV === "development";

const UserService = {
  async register(req) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throwError(
        "Please provide all required information: name, email, and password.",
        400
      );
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser && !existingUser.verified) {
      throwError("Email already use", 400);
    }

    const user = new User({ name, email, password });
    const verifyToken = await user.createVerifyToken();
    await user.save();

    // Tạo link xác thực
    const verifyUrl = `${req.protocol}://${req.get(
      "host"
    )}/v1/api/auth/verify-email/${verifyToken}`;

    // Gửi email với template HTML
    mailServices.sendEmail({
      to: email,
      subject: "Xác thực tài khoản",
      html: verifyEmailTemplate(name, verifyUrl), // Sử dụng template
    });
  },

  async login(data, res) {
    const { identifier, password } = data;

    if (!identifier.trim() || !password.trim()) {
      throwError("Both identifier and password are required");
    }

    const userDoc = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    }).select("+password");

    if (!userDoc) {
      throwError("Identifier or Password is incorrect");
    }

    if (!(await userDoc.isCorrectPassword(password, userDoc.password))) {
      throwError("Identifier or Password is incorrect");
    }

    if (!userDoc.verified) {
      throwError("Account has not been verified");
    }

    if (userDoc.isDisabled) {
      throwError("Account has been disabled. Please contact the admin");
    }

    const token = signToken(userDoc._id, v4());

    // Lưu token vào HttpOnly Cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Chỉ gửi qua HTTPS khi ở môi trường production
      sameSite: isDevelopment ? "Strict" : "None",
      maxAge: MAX_AGE_COOKIE,
    });

    return userDoc._id;
  },

  async verifyEmail(data, res) {
    const verifyToken = crypto.createHash("sha256").update(data).digest("hex");

    const user = await User.findOne({
      verifyToken,
      verifyTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.redirect(
        "https://yourfrontend.com/email-verification?status=failed"
      );
    }

    // Update verification status
    user.verified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save({ validateModifiedOnly: true });
  },

  async logout(data, res) {
    const { userId, jit } = data;

    const userDoc = await User.findById(userId);
    if (!userDoc) throwError("User not found");

    // Đưa token vào danh sách đen trong Redis
    await redis.set(
      `TOKEN_BLACK_LIST_${userId}_${jit}`,
      1,
      "EX",
      7 * 24 * 60 * 60
    );

    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
  },
};

const options = {
  expiresIn: EXPIRED_TIME_TOKEN,
};

const signToken = (userId, jit) =>
  jwt.sign({ userId, jit }, process.env.JWT_SECRET, options);

module.exports = UserService;

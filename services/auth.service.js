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

const AuthService = {
  async register(req, res) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throwError("AUTH-001", 400);
    }
    if (/\s/.test(name)) {
      throwError("AUTH-002", 400);
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.verified) {
        // Kiểm tra nếu token xác thực còn hạn
        const isTokenValid =
          user.verifyTokenExpires && user.verifyTokenExpires > Date.now();

        if (isTokenValid) {
          throwError("AUTH-003", 400);
        }

        // Nếu token hết hạn, tạo lại token mới
        user.name = name;
        user.password = password;
        const verifyToken = await user.createVerifyToken();
        await user.save();

        // Gửi lại email xác thực
        const verifyUrl = `${req.protocol}://${req.get(
          "host"
        )}/v1/api/auth/verify-email/${verifyToken}`;

        mailServices.sendEmail({
          to: email,
          subject: "Xác thực tài khoản",
          html: verifyEmailTemplate(name, verifyUrl),
        });

        return res.status(200).json({
          status: true,
          message: "AUTH-004",
        });
      }

      throwError("AUTH-006", 400);
    }

    // Nếu không tìm thấy user, tạo mới
    user = new User({ name, email, password });
    const verifyToken = await user.createVerifyToken();
    await user.save();

    // Gửi email xác thực
    const verifyUrl = `${req.protocol}://${req.get(
      "host"
    )}/v1/api/auth/verify-email/${verifyToken}`;

    mailServices.sendEmail({
      to: email,
      subject: "Xác thực tài khoản",
      html: verifyEmailTemplate(name, verifyUrl),
    });

    return res.status(201).json({
      status: true,
      message: "AUTH-005",
    });
  },

  async login(data, res) {
    const { identifier, password } = data;

    if (!identifier.trim() || !password.trim()) {
      throwError("AUTH-007");
    }
    if (/\s/.test(identifier)) {
      throwError("AUTH-002");
    }

    const userDoc = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    }).select("+password");

    if (!userDoc) {
      throwError("AUTH-008");
    }

    if (!(await userDoc.isCorrectPassword(password, userDoc.password))) {
      throwError("AUTH-008");
    }

    if (!userDoc.verified) {
      throwError("AUTH-009");
    }

    if (userDoc.isDisabled) {
      throwError("AUTH-010");
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
        `${
          isDevelopment
            ? process.env.DEV_ALLOW_URL
            : process.env.PRODUCTION_ALLOW_URL
        }/auth/error`
      );
    }

    user.verified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save({
      validateModifiedOnly: true,
    });

    return res.redirect(
      `${
        isDevelopment
          ? process.env.DEV_ALLOW_URL
          : process.env.PRODUCTION_ALLOW_URL
      }/auth/login`
    );
  },

  async logout(data, res) {
    const { userId, jit } = data;

    // // Đưa token vào danh sách đen trong Redis
    // await redis.set(
    //   `TOKEN_BLACK_LIST_${userId}_${jit}`,
    //   1,
    //   "EX",
    //   7 * 24 * 60 * 60
    // );

    return res.clearCookie("access_token", {
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

module.exports = AuthService;

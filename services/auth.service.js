const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/userModel");
const verifyEmailTemplate = require("../templates/mail/verifyAccount");
const throwError = require("../utils/throwError");
const mailServices = require("../utils/sendEmail");
const redis = require("../config/redis.js");

const { EXPIRED_TIME_TOKEN, MAX_AGE_COOKIE } = require("../config/constant");
const { checkBirthDay } = require("../utils/index.js");

const isDevelopment = process.env.NODE_ENV === "development";

const AuthService = {
  async register(req, res) {
    const { fullName, email, password, birthDay } = req.body;

    if (!email || !password || !fullName) {
      throwError("AUTH-001", 400);
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.verified) {
        // Cập nhật thông tin người dùng
        user.fullName = fullName;
        user.password = password;

        if (birthDay) {
          if (checkBirthDay(birthDay)) {
            user.birthDay = birthDay;
          }
        }

        // Xử lý verify token
        const isTokenValid =
          user.verifyTokenExpires && user.verifyTokenExpires > Date.now();
        const verifyToken = isTokenValid
          ? user.verifyToken
          : await user.createVerifyToken();

        await user.save();

        // Gửi lại email nếu token mới
        if (!isTokenValid) {
          const verifyUrl = `${req.protocol}://${req.get(
            "host"
          )}/v1/api/auth/verify-email/${verifyToken}`;
          mailServices.sendEmail({
            to: email,
            subject: "Xác thực tài khoản",
            html: verifyEmailTemplate(fullName, verifyUrl),
          });
        }

        return res.status(200).json({
          status: true,
          message: isTokenValid ? "AUTH-003" : "AUTH-004",
        });
      }
      throwError("AUTH-006", 400);
    }

    // Validate birthDay cho user mới
    if (birthDay) {
      checkBirthDay(birthDay); // Sử dụng hàm chung
    }

    // Tạo user mới
    user = new User({ fullName, email, password });
    if (birthDay) {
      user.birthDay = birthDay;
    }
    const verifyToken = await user.createVerifyToken();
    await user.save();

    // Gửi email xác thực
    const verifyUrl = `${req.protocol}://${req.get(
      "host"
    )}/v1/api/auth/verify-email/${verifyToken}`;
    mailServices.sendEmail({
      to: email,
      subject: "Xác thực tài khoản",
      html: verifyEmailTemplate(fullName, verifyUrl),
    });

    return res.status(201).json({
      status: true,
      message: "AUTH-005",
    });
  },

  async login(data, res) {
    const { email, password } = data;

    if (!email.trim() || !password.trim()) {
      throwError("AUTH-007");
    }
    if (/\s/.test(email)) {
      throwError("AUTH-002");
    }

    const userDoc = await User.findOne({
      email: email,
    }).select("+password +_id");

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

    return {
      _id: userDoc._id,
      access_token: token,
    };
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

const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/userModel");
const verifyEmailTemplate = require("../templates/mail/verifyAccount");
const resetPasswordTemplate = require("../templates/mail/resetPassword");
const throwError = require("../utils/throwError");
const mailServices = require("../utils/sendEmail");
const redis = require("../config/redis.js");

const {
  EXPIRED_TIME_TOKEN_NOT_REMENBER,
  MAX_AGE_COOKIE,
  EXPIRED_TIME_TOKEN_REMENBER,
  TIME_CHANGE_PASSWORD,
  TIME_VERIFY_ACCOUNT,
} = require("../config/constant");
const { checkBirthDay, sanitizeAndValidate } = require("../utils/index.js");

const isDevelopment = process.env.NODE_ENV === "development";

const AuthService = {
  async register(req, res) {
    const { fullName, email, password, birthDay } = sanitizeAndValidate(
      req.body,
      ["email", "password", "fullName"],
      {
        trim: true,
        removeNull: true,
      }
    );

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
          await mailServices.sendEmail({
            to: email,
            subject: "Xác thực tài khoản",
            html: verifyEmailTemplate(fullName, verifyUrl, TIME_VERIFY_ACCOUNT),
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
      html: verifyEmailTemplate(fullName, verifyUrl, TIME_VERIFY_ACCOUNT),
    });

    return res.status(201).json({
      status: true,
      message: "AUTH-005",
    });
  },

  async login(req, res) {
    const { email, password, rememberMe } = sanitizeAndValidate(
      req.body,
      ["email", "password"],
      {
        trim: true,
        removeNull: true,
      }
    );

    if (rememberMe && typeof rememberMe !== "boolean") {
      throwError("AUTH-019");
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

    const token = signToken(userDoc._id, v4(), rememberMe);

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

  async verifyEmail(req, res) {
    const { token } = sanitizeAndValidate(req.params, ["token"], {
      trim: true,
      removeNull: true,
    });
    const verifyToken = crypto.createHash("sha256").update(token).digest("hex");

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
      }`
    );
  },

  async logout(req, res) {
    const { userId, jit } = sanitizeAndValidate(req.user, ["userId", "jit"], {
      trim: true,
      removeNull: true,
    });

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

  async forgotPassword(req) {
    const { email } = sanitizeAndValidate(req.body, ["email"], {
      trim: true,
      removeNull: true,
    });
    const user = await User.findOne({ email: email });

    if (!user) {
      throwError("AUTH-014");
    }
    if (!user.verified) {
      throwError("AUTH-020");
    }
    if (user.isDisabled) {
      throwError("AUTH-010");
    }
    if (user.passwordResetExpires && user.passwordResetExpires > Date.now()) {
      throwError("AUTH-023");
    }

    const resetToken = await user.createPasswordResetToken();

    await user.save({ validateModifiedOnly: true });

    const verifyUrl = `${
      isDevelopment
        ? process.env.DEV_ALLOW_URL
        : process.env.PRODUCTION_ALLOW_URL
    }/change-password/?token=${resetToken}`;

    // Send Email
    await mailServices.sendEmail({
      to: email,
      subject: "Thay đổi mật khẩu",
      html: resetPasswordTemplate(
        user.fullName,
        verifyUrl,
        TIME_CHANGE_PASSWORD
      ),
    });
    return;
  },

  async resetPassword(req, res) {
    const { token, password } = sanitizeAndValidate(
      req.body,
      ["token", "password"],
      { trim: true, removeNull: true }
    );

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throwError("AUTH-022");
    }
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateModifiedOnly: true });

    return res.redirect(
      `${
        isDevelopment
          ? process.env.DEV_ALLOW_URL
          : process.env.PRODUCTION_ALLOW_URL
      }`
    );
  },

  async changePassword(req) {
    const { userId } = req.user;
    const { oldPassword, newPassword } = sanitizeAndValidate(
      req.body,
      ["oldPassword", "newPassword"],
      { trim: true, removeNull: true }
    );
    if (oldPassword === newPassword) {
      throwError("AUTH-025");
    }
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throwError("AUTH-014", 404);
    }

    if (!(await user.isCorrectPassword(oldPassword, user.password))) {
      throwError("AUTH-029");
    }

    user.password = newPassword;
    await user.save({ validateModifiedOnly: true });
  },
};

const signToken = (userId, jit, rememberMe = false) => {
  const expiresIn = rememberMe
    ? EXPIRED_TIME_TOKEN_REMENBER
    : EXPIRED_TIME_TOKEN_NOT_REMENBER;
  return jwt.sign({ userId, jit }, process.env.JWT_SECRET, { expiresIn });
};
module.exports = AuthService;

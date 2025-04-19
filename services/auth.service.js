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
const {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  logoutchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../validators/auth.validator.js");

const isDevelopment = process.env.NODE_ENV === "development";

const AuthService = {
  async register(data) {
    try {
      const { fullName, email, password, birthDay } = data;

      await registerSchema.validate(data);
      let user = await User.findOne({ email });

      if (user) {
        if (!user.verified) {
          // Cập nhật thông tin người dùng
          user.fullName = fullName;
          user.password = password;

          if (birthDay) {
            checkBirthDay(birthDay);
            user.birthDay = birthDay;
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
              html: verifyEmailTemplate(
                fullName,
                verifyUrl,
                TIME_VERIFY_ACCOUNT
              ),
            });
          }
          return { message: isTokenValid ? "AUTH-003" : "AUTH-004" };
        }
        throwError("AUTH-006", 409);
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
      const verifyUrl = `${
        isDevelopment
          ? process.env.DEV_ALLOW_URL
          : process.env.PRODUCTION_ALLOW_URL
      }/v1/api/auth/verify-email/${verifyToken}`;
      mailServices.sendEmail({
        to: email,
        subject: "Xác thực tài khoản",
        html: verifyEmailTemplate(fullName, verifyUrl, TIME_VERIFY_ACCOUNT),
      });

      return {
        message: "AUTH-005",
      };
    } catch (error) {
      throwError(error.message);
    }
  },

  async login(data, res) {
    try {
      const { email, password, rememberMe } = data;

      await loginSchema.validate(data);

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
        status: true,
        message: "AUTH-032",
      };
    } catch (error) {
      throwError(error.message);
    }
  },

  async verifyEmail(data) {
    try {
      const { token } = data;

      await verifyEmailSchema.validate(data);

      const verifyToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const user = await User.findOne({
        verifyToken,
        verifyTokenExpires: { $gt: Date.now() },
      });

      if (!user) {
        return {
          url: `${
            isDevelopment
              ? process.env.DEV_ALLOW_URL
              : process.env.PRODUCTION_ALLOW_URL
          }/auth/error`,
        };
      }

      user.verified = true;
      user.verifyToken = undefined;
      user.verifyTokenExpires = undefined;
      await user.save({
        validateModifiedOnly: true,
      });

      return {
        url: `${
          isDevelopment
            ? process.env.DEV_ALLOW_URL
            : process.env.PRODUCTION_ALLOW_URL
        }`,
      };
    } catch (error) {
      throwError(error.message);
    }
  },

  async logout(reqUser, res) {
    try {
      const { userId, jit } = reqUser;

      await logoutchema.validate(reqUser);

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
    } catch (error) {
      throwError(error.message);
    }
  },

  async forgotPassword(data) {
    try {
      const { email } = data;

      await forgotPasswordSchema.validate(data);

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
    } catch (error) {
      throwError(error.message);
    }
  },

  async resetPassword(data, res) {
    try {
      const { token, password } = data;

      await resetPasswordSchema.validate(data);

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

      return {
        url: `${
          isDevelopment
            ? process.env.DEV_ALLOW_URL
            : process.env.PRODUCTION_ALLOW_URL
        }`,
      };
    } catch (error) {
      throwError(error.message);
    }
  },

  async changePassword(reqUser, data) {
    try {
      const { userId } = reqUser;
      const { oldPassword, newPassword } = data;

      await changePasswordSchema(data);

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
    } catch (error) {
      throwError(error.message);
    }
  },
};

const signToken = (userId, jit, rememberMe = false) => {
  const expiresIn = rememberMe
    ? EXPIRED_TIME_TOKEN_REMENBER
    : EXPIRED_TIME_TOKEN_NOT_REMENBER;
  return jwt.sign({ userId, jit }, process.env.JWT_SECRET, { expiresIn });
};
module.exports = AuthService;

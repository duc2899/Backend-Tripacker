const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { TIME_VERIFY_ACCOUNT } = require("../config/constant");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: (props) => `Email (${props.value}) is invalid!`,
      },
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      url: { type: String, default: "" },
      id: { type: String, default: "" },
    },
    about: {
      type: String,
      trim: true,
      maxLength: [140, "About must be less than 140 characters"],
      default: "",
    },
    socialNetwork: [
      {
        type: String,
      },
    ],
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    birthDay: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: true,
      minLength: [3, "Password must be greater than 3 characters"],
      maxLength: [15, "Password must be less than 15 characters"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    verifyToken: String, // Mã xác thực
    verifyTokenExpires: Date, // Thời gian hết hạn mã xác thực
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      default: "user",
      enum: ["admin", "user"],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // Chỉ hash nếu mật khẩu bị thay đổi
  if (!this.isModified("password") || !this.password) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

userSchema.methods.isCorrectPassword = async function (
  candidatePassword,
  userPassword
) {
  if (!userPassword || !candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Tạo mã xác thực email
userSchema.methods.createVerifyToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.verifyToken = crypto.createHash("sha256").update(token).digest("hex");
  this.verifyTokenExpires = Date.now() + TIME_VERIFY_ACCOUNT;
  return token;
};

const User = mongoose.model("Users", userSchema);

module.exports = User;

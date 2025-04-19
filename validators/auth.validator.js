const yup = require("yup");
const mongoose = require("mongoose");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerSchema = yup.object().shape({
  fullName: yup
    .string()
    .typeError("AUTH-030")
    .max(30, "USER-014")
    .nullable()
    .trim(),
  email: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .trim()
    .test("is-valid-email", "TEM-024", function (value) {
      return emailRegex.test(value);
    }),
  birthDay: yup.string().typeError("AUTH-030").nullable().trim(),
  password: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .min(3, "AUTH-031")
    .max(15, "AUTH-031")
    .trim(),
});

const verifyEmailSchema = yup.object().shape({
  token: yup.string().typeError("AUTH-030").required("AUTH-026").trim(),
});

const loginSchema = yup.object().shape({
  email: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .trim()
    .test("is-valid-email", "TEM-024", function (value) {
      return emailRegex.test(value);
    }),
  password: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .min(3, "AUTH-031")
    .max(15, "AUTH-031")
    .trim(),
  rememberMe: yup.boolean().typeError("AUTH-030").nullable(),
});

const logoutchema = yup.object().shape({
  userId: yup
    .string()
    .required("AUTH-026")
    .test("is-object-id", "AUTH-030", (value) => {
      if (!value) return false;
      // Kiểm tra độ dài 24 và chỉ chứa ký tự hex
      return (
        mongoose.Types.ObjectId.isValid(value) &&
        /^[0-9a-fA-F]{24}$/.test(value)
      );
    }),

  jit: yup.string().typeError("AUTH-030").required("AUTH-001").trim(),
});

const forgotPasswordSchema = yup.object().shape({
  email: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .trim()
    .test("is-valid-email", "TEM-024", function (value) {
      return emailRegex.test(value);
    }),
});

const resetPasswordSchema = yup.object().shape({
  token: yup.string().typeError("AUTH-030").required("AUTH-026").trim(),
  password: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .min(3, "AUTH-031")
    .max(15, "AUTH-031")
    .trim(),
});

const changePasswordSchema = yup.object().shape({
  newPassword: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .min(3, "AUTH-031")
    .max(15, "AUTH-031")
    .trim(),
  oldPassword: yup
    .string()
    .typeError("AUTH-030")
    .required("AUTH-001")
    .min(3, "AUTH-031")
    .max(15, "AUTH-031")
    .trim(),
});

module.exports = {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  logoutchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};

const mongoose = require("mongoose");
const yup = require("yup");

const objectIdSchema = yup
  .string()
  .required("COMMON-006")
  .test("is-object-id", "COMMON-007", (value) => {
    if (!value) return false;
    // Kiểm tra độ dài 24 và chỉ chứa ký tự hex
    return (
      mongoose.Types.ObjectId.isValid(value) && /^[0-9a-fA-F]{24}$/.test(value)
    );
  });

const updateUserSchema = yup.object().shape({
  fullName: yup
    .string()
    .typeError("COMMON-007")
    .max(30, "USER-014")
    .nullable()
    .trim(),
  about: yup
    .string()
    .typeError("COMMON-007")
    .max(140, "USER-014")
    .nullable()
    .trim(),
  socialNetwork: yup
    .array()
    .typeError("COMMON-007")
    .of(yup.string().url("USER-002"))
    .max(3, "USER-001")
    .nullable(),
  gender: yup
    .string()
    .typeError("COMMON-007")
    .oneOf(["male", "female", "other"], "USER-015")
    .required("COMMON-006"),
  birthDay: yup.string().typeError("COMMON-007").nullable().trim(),
  phoneNumber: yup.string().typeError("COMMON-007").nullable().trim(),
});

const deleteTemplateSchema = yup.object().shape({
  templateId: objectIdSchema,
});

module.exports = { updateUserSchema, deleteTemplateSchema };

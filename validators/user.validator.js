const mongoose = require("mongoose");
const yup = require("yup");

const objectIdSchema = yup
  .string()
  .required("AUTH-026")
  .test("is-object-id", "AUTH-030", (value) => {
    if (!value) return false;
    // Kiểm tra độ dài 24 và chỉ chứa ký tự hex
    return (
      mongoose.Types.ObjectId.isValid(value) && /^[0-9a-fA-F]{24}$/.test(value)
    );
  });

const updateUserSchema = yup.object().shape({
  fullName: yup
    .string()
    .typeError("AUTH-030")
    .max(30, "USER-014")
    .nullable()
    .trim(),
  about: yup
    .string()
    .typeError("AUTH-030")
    .max(140, "USER-014")
    .nullable()
    .trim(),
  socialNetwork: yup
    .array()
    .typeError("AUTH-030")
    .of(yup.string().url("USER-002"))
    .max(3, "USER-001")
    .nullable(),
  gender: yup
    .string()
    .typeError("AUTH-030")
    .oneOf(["male", "female", "other"], "USER-015")
    .required("AUTH-026"),
  birthDay: yup.string().typeError("AUTH-030").nullable().trim(),
  phoneNumber: yup.string().typeError("AUTH-030").nullable().trim(),
});

const deleteTemplateSchema = yup.object().shape({
  templateId: objectIdSchema,
});

module.exports = { updateUserSchema, deleteTemplateSchema };

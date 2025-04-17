const yup = require("yup");

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

module.exports = { updateUserSchema };

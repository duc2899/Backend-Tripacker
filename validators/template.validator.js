const mongoose = require("mongoose");
const yup = require("yup");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const locationSchema = yup
  .object({
    destination: yup.string().nullable(),
    lat: yup.number().nullable(),
    lon: yup.number().nullable(),
  })
  .test("location-fields", "AUTH-026", function (value) {
    if (!value) return true;
    const { destination, lat, lon } = value;
    const isAnyFieldFilled = destination || lat || lon;
    const isAllFieldsValid =
      typeof destination === "string" &&
      destination.trim() !== "" &&
      typeof lat === "number" &&
      typeof lon === "number";
    return !isAnyFieldFilled || isAllFieldsValid;
  });

const roleSchema = yup
  .string()
  .typeError("AUTH-030")
  .oneOf(["edit", "view"], "AUTH-030")
  .required("AUTH-026");

const listMembersSchema = yup
  .array()
  .of(
    yup.object().shape({
      email: yup
        .string()
        .typeError("AUTH-030")
        .nullable()
        .notRequired()
        .test("is-valid-email-or-empty", "TEM-024", function (value) {
          if (!value || value.trim() === "") return true;
          return emailRegex.test(value);
        }),
      name: yup.string().typeError("AUTH-030").required("AUTH-026"),
      role: roleSchema,
    })
  )
  .test("unique-emails", "TEM-023", (list) => {
    if (!list) return true;
    const emails = list
      .map((item) => item.email)
      .filter((email) => email && email.trim() !== "");
    return new Set(emails).size === emails.length;
  });

const baseTripSchema = {
  from: locationSchema,
  to: locationSchema,
  title: yup.string().typeError("AUTH-030").max(100).default("").nullable(),
  startDate: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .nullable(),
  endDate: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .nullable(),
  budget: yup.number().typeError("AUTH-030").positive("AUTH-030").nullable(),
  tripType: yup.string().typeError("AUTH-030").nullable(),
  vihicle: yup.string().typeError("AUTH-030").max(50).default("").nullable(),
  members: yup.number().typeError("AUTH-030").min(1, "TEM-017").nullable(),
  listMembers: listMembersSchema,
  background: yup.string().typeError("AUTH-030").nullable(),
  healthNotes: yup
    .string()
    .typeError("AUTH-030")
    .max(100)
    .default("")
    .nullable(),
  description: yup
    .string()
    .typeError("AUTH-030")
    .max(200)
    .default("")
    .nullable(),
};

const createTemplteSchema = yup.object().shape({
  ...baseTripSchema,
  from: yup.object({
    destination: yup.string().typeError("AUTH-030").required("AUTH-026"),
    lat: yup.number().typeError("AUTH-030").required("AUTH-026"),
    lon: yup.number().typeError("AUTH-030").required("AUTH-026"),
  }),
  to: yup.object({
    destination: yup.string().typeError("AUTH-030").required("AUTH-026"),
    lat: yup.number().typeError("AUTH-030").required("AUTH-026"),
    lon: yup.number().typeError("AUTH-030").required("AUTH-026"),
  }),
  startDate: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .required("AUTH-026"),
  endDate: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .required("AUTH-026"),
  budget: yup
    .number()
    .typeError("AUTH-030")
    .positive("AUTH-030")
    .required("AUTH-026"),
  tripType: yup.string().typeError("AUTH-030").required("TEM-003"),
  background: yup.string().typeError("AUTH-030").required("TEM-004"),
});

const updateTripTimeLineSchema = yup.object().shape({
  ...baseTripSchema,
  templateId: objectIdSchema,
});

const updateListMembersSchema = yup.object().shape({
  listMembers: yup
    .array()
    .of(
      yup.object().shape({
        email: yup
          .string()
          .typeError("AUTH-030")
          .nullable()
          .notRequired()
          .test("is-valid-email-or-empty", "TEM-024", function (value) {
            if (!value || value.trim() === "") return true;
            return emailRegex.test(value);
          }),
        name: yup.string().typeError("AUTH-030").required("AUTH-026"),
        role: roleSchema,
      })
    )
    .min(1, "AUTH-030")
    .test("unique-emails", "TEM-023", (list) => {
      if (!list) return true;
      const emails = list
        .map((item) => item.email)
        .filter((email) => email && email.trim() !== "");
      return new Set(emails).size === emails.length;
    }),
  templateId: objectIdSchema,
});

const updateRoleSchema = yup.object().shape({
  role: roleSchema,
  _id: objectIdSchema,
  templateId: objectIdSchema,
});

const deleteMembersSchema = yup.object().shape({
  listMembers: yup
    .array()
    .of(
      objectIdSchema // ⬅️ Không đúng ObjectId thì báo lỗi
    )
    .required("TEM-026")
    .min(1, "AUTH-030"), // Không cho rỗng

  templateId: objectIdSchema,
});

const middleCheckPermissionSchema = objectIdSchema;

module.exports = {
  createTemplteSchema,
  updateTripTimeLineSchema,
  updateListMembersSchema,
  updateRoleSchema,
  deleteMembersSchema,
  middleCheckPermissionSchema,
};

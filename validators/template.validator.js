const mongoose = require("mongoose");
const yup = require("yup");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const objectIdNullAbleSchema = yup
  .string()
  .nullable()
  .test("is-valid-object-id", "COMMON-007", (value) => {
    if (!value || value === "") return true; // Cho phép null hoặc chuỗi rỗng
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
  .test("location-fields", "COMMON-006", function (value) {
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
  .typeError("COMMON-007")
  .oneOf(["edit", "view"], "COMMON-007")
  .required("COMMON-006");

const typeSchema = yup
  .string()
  .typeError("COMMON-007")
  .oneOf(["create", "delete", "update"], "COMMON-007")
  .required("COMMON-006");

const listMembersSchema = yup
  .array()
  .nullable()
  .of(
    yup.object().shape({
      email: yup
        .string()
        .typeError("COMMON-007")
        .nullable()
        .notRequired()
        .test("is-valid-email-or-empty", "TEM-024", function (value) {
          if (!value || value.trim() === "") return true;
          return emailRegex.test(value);
        }),
      name: yup.string().typeError("COMMON-007").required("COMMON-006"),
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
  title: yup.string().typeError("COMMON-007").max(100).default("").nullable(),
  startDate: yup
    .string()
    .typeError("COMMON-007")
    .matches(dateRegex, "COMMON-006")
    .nullable(),
  endDate: yup
    .string()
    .typeError("COMMON-007")
    .matches(dateRegex, "COMMON-006")
    .nullable(),
  budget: yup
    .number()
    .typeError("COMMON-007")
    .positive("COMMON-007")
    .nullable(),
  tripType: yup.string().typeError("COMMON-007").nullable(),
  vihicle: yup.string().typeError("COMMON-007").max(50).default("").nullable(),
  members: yup.number().typeError("COMMON-007").min(1, "TEM-017").nullable(),
  listMembers: listMembersSchema,
  background: yup.string().typeError("COMMON-007").nullable(),
  healthNotes: yup
    .string()
    .typeError("COMMON-007")
    .max(100)
    .default("")
    .nullable(),
  description: yup
    .string()
    .typeError("COMMON-007")
    .max(200)
    .default("")
    .nullable(),
};

const createTemplteSchema = yup.object().shape({
  ...baseTripSchema,
  from: yup
    .object({
      destination: yup.string().typeError("COMMON-007").required("COMMON-006"),
      lat: yup.number().typeError("COMMON-007").required("COMMON-006"),
      lon: yup.number().typeError("COMMON-007").required("COMMON-006"),
    })
    .required("COMMON-006"),
  to: yup
    .object({
      destination: yup.string().typeError("COMMON-007").required("COMMON-006"),
      lat: yup.number().typeError("COMMON-007").required("COMMON-006"),
      lon: yup.number().typeError("COMMON-007").required("COMMON-006"),
    })
    .required("COMMON-006"),
  startDate: yup
    .string()
    .typeError("COMMON-007")
    .matches(dateRegex, "COMMON-006")
    .required("COMMON-006"),
  endDate: yup
    .string()
    .typeError("COMMON-007")
    .matches(dateRegex, "COMMON-006")
    .required("COMMON-006"),
  budget: yup
    .number()
    .typeError("COMMON-007")
    .positive("COMMON-007")
    .required("COMMON-006"),
  tripType: yup.string().typeError("COMMON-007").required("TEM-003"),
  background: yup.string().typeError("COMMON-007").required("TEM-004"),
});

const updateTripTimeLineSchema = yup.object().shape({
  ...baseTripSchema,
  templateId: objectIdSchema,
  title: yup.string().typeError("COMMON-007").max(100).default("").nullable(),
  from: yup
    .object({
      destination: yup.string().typeError("COMMON-007").nullable(),
      lat: yup.number().typeError("COMMON-007").nullable(),
      lon: yup.number().typeError("COMMON-007").nullable(),
    })
    .nullable()
    .default({}),
  to: yup
    .object({
      destination: yup.string().typeError("COMMON-007").nullable(),
      lat: yup.number().typeError("COMMON-007").nullable(),
      lon: yup.number().typeError("COMMON-007").nullable(),
    })
    .nullable()
    .default({}),
});

const updateListMembersSchema = yup.object().shape({
  listMembers: yup
    .array()
    .of(
      yup.object().shape({
        email: yup
          .string()
          .typeError("COMMON-007")
          .nullable()
          .notRequired()
          .test("is-valid-email-or-empty", "TEM-024", function (value) {
            if (!value || value.trim() === "") return true;
            return emailRegex.test(value);
          }),
        name: yup.string().typeError("COMMON-007").required("COMMON-006"),
        role: roleSchema,
      })
    )
    .min(1, "COMMON-007")
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
    .min(1, "COMMON-007"), // Không cho rỗng

  templateId: objectIdSchema,
});

const getSuggestAISchema = yup.object().shape({
  forceUpdate: yup.string().typeError("COMMON-007").nullable(),
  templateId: objectIdSchema,
});

const getSuggestPacksFromAISchema = yup.object().shape({
  templateId: objectIdSchema,
  forceUpdate: yup.boolean().typeError("COMMON-007").nullable(),
});

const updateTripAssistantSchema = yup.object().shape({
  categories: yup
    .array()
    .of(
      yup.object().shape({
        _id: objectIdSchema,
        category: yup.string().typeError("COMMON-007").nullable(),
        items: yup
          .array()
          .of(
            yup.object().shape({
              _id: objectIdSchema,
              name: yup.string().typeError("COMMON-007").required("COMMON-006"),
              isCheck: yup
                .boolean()
                .typeError("COMMON-007")
                .required("COMMON-006"),
            })
          )
          .nullable(),
      })
    )
    .nullable(),
  healthNotes: yup.string().typeError("COMMON-007").nullable(),
  templateId: objectIdSchema,
});

const managerCategorySchema = yup.object().shape({
  templateId: objectIdSchema,
  packId: objectIdSchema,
  categoryId: objectIdNullAbleSchema,
  categoryName: yup.string().typeError("COMMON-007").nullable(),
  type: typeSchema,
});

const managerItemsCategorySchema = yup.object().shape({
  templateId: objectIdSchema,
  categoryId: objectIdNullAbleSchema,
  packId: objectIdSchema,
  itemId: objectIdNullAbleSchema,
  itemName: yup.string().typeError("COMMON-007").nullable(),
  isCheck: yup.boolean().typeError("COMMON-007").nullable(),
  type: typeSchema,
});

const updateTripAsstitantSchema = yup.object().shape({
  healthNotes: yup.string().typeError("COMMON-007").required("COMMON-006"),
});

const middleCheckPermissionSchema = objectIdSchema;

const getWeatherForecastSchema = yup.object().shape({
  templateId: objectIdSchema,
});

module.exports = {
  createTemplteSchema,
  updateTripTimeLineSchema,
  updateListMembersSchema,
  updateRoleSchema,
  deleteMembersSchema,
  middleCheckPermissionSchema,
  getSuggestAISchema,
  getSuggestPacksFromAISchema,
  updateTripAssistantSchema,
  getWeatherForecastSchema,
  managerCategorySchema,
  managerItemsCategorySchema,
  updateTripAsstitantSchema,
};

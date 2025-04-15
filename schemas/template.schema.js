const yup = require("yup");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const locationSchema = yup
  .object({
    destination: yup.string().nullable(),
    lat: yup.number().nullable(),
    lon: yup.number().nullable(),
  })
  .test("location-fields", "AUTH-026", function (value) {
    if (!value) return true;

    const { destination, lat, lon } = value;

    const isAnyFieldFilled =
      destination !== undefined || lat !== undefined || lon !== undefined;

    const isAllFieldsValid =
      typeof destination === "string" &&
      destination.trim() !== "" &&
      typeof lat === "number" &&
      typeof lon === "number";

    if (isAnyFieldFilled && !isAllFieldsValid) {
      return this.createError({ message: "AUTH-026" });
    }

    return true;
  });

const createTemplteSchema = yup.object().shape({
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

  title: yup.string().typeError("AUTH-030").max(100).default("").nullable(),

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

  vihicle: yup.string().typeError("AUTH-030").max(50).default("").nullable(),

  members: yup.number().typeError("AUTH-030").min(1, "TEM-017").nullable(),

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
            if (!value || value.trim() === "") return true; // Cho phép chuỗi rỗng
            return emailRegex.test(value); // Nếu có nội dung thì phải hợp lệ
          }),
        name: yup.string().typeError("AUTH-030").nullable(),
      })
    )
    .test("unique-emails", "TEM-023", (list) => {
      if (!list) return true;
      const emails = list
        .map((item) => item.email)
        .filter((email) => email && email.trim() !== ""); // Bỏ qua email rỗng
      return new Set(emails).size === emails.length;
    }),

  background: yup.string().typeError("AUTH-030").required("TEM-004"),

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
});

const updateTripTimeLineSchema = yup.object().shape({
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
            if (!value || value.trim() === "") return true; // Cho phép chuỗi rỗng
            return emailRegex.test(value); // Nếu có nội dung thì phải hợp lệ
          }),
        name: yup.string().typeError("AUTH-030").nullable(),
      })
    )
    .test("unique-emails", "TEM-023", (list) => {
      if (!list) return true;
      const emails = list
        .map((item) => item.email)
        .filter((email) => email && email.trim() !== ""); // Bỏ qua email rỗng
      return new Set(emails).size === emails.length;
    }),

  background: yup.string().typeError("AUTH-030").nullable(),
  templateId: yup.string().typeError("AUTH-030").required("AUTH-026"),
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
});

module.exports = { createTemplteSchema, updateTripTimeLineSchema };

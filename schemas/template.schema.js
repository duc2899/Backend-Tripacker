const yup = require("yup");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const commonFields = {
  from: yup.object({
    destination: yup.string().trim().typeError("AUTH-030"),
    lat: yup.number().typeError("AUTH-030"),
    lon: yup.number().typeError("AUTH-030"),
  }),
  to: yup.object({
    destination: yup.string().trim().typeError("AUTH-030"),
    lat: yup.number().typeError("AUTH-030"),
    lon: yup.number().typeError("AUTH-030"),
  }),
  title: yup
    .string()
    .trim()
    .typeError("AUTH-030")
    .max(100)
    .default("")
    .nullable(),
  startDate: yup
    .string()
    .trim()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026"),
  endDate: yup
    .string()
    .trim()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026"),
  budget: yup.number().typeError("AUTH-030").positive("AUTH-030"),
  tripType: yup.string().trim().typeError("AUTH-030"),
  vihicle: yup
    .string()
    .trim()
    .typeError("AUTH-030")
    .max(50)
    .default("")
    .nullable(),
  members: yup.number().typeError("AUTH-030").min(1, "TEM-017").nullable(),
  listMembers: yup
    .array()
    .of(
      yup.object().shape({
        email: yup
          .string()
          .trim()
          .typeError("AUTH-030")
          .matches(emailRegex, "TEM-024"),
        name: yup.string().trim().typeError("AUTH-030"),
      })
    )
    .test("unique-emails", "TEM-023", (list) => {
      if (!list) return true;
      const emails = list.map((item) => item.email);
      return new Set(emails).size === emails.length;
    }),
  background: yup.string().trim().typeError("AUTH-030"),
  healthNotes: yup
    .string()
    .trim()
    .typeError("AUTH-030")
    .max(100)
    .default("")
    .nullable(),
  description: yup
    .string()
    .trim()
    .typeError("AUTH-030")
    .max(200)
    .default("")
    .nullable(),
};

const buildSchema = (mode = "create") => {
  return yup.object().shape({
    from:
      mode === "create"
        ? commonFields.from.required("AUTH-026")
        : commonFields.from.nullable(),
    to:
      mode === "create"
        ? commonFields.to.required("AUTH-026")
        : commonFields.to.nullable(),
    title: commonFields.title,
    startDate:
      mode === "create"
        ? commonFields.startDate.required("AUTH-026")
        : commonFields.startDate.nullable(),
    endDate:
      mode === "create"
        ? commonFields.endDate.required("AUTH-026")
        : commonFields.endDate.nullable(),
    budget:
      mode === "create"
        ? commonFields.budget.required("AUTH-026")
        : commonFields.budget.nullable(),
    tripType: commonFields.tripType.required("TEM-003"),
    vihicle: commonFields.vihicle,
    members: commonFields.members,
    listMembers: commonFields.listMembers,
    background:
      mode === "create"
        ? commonFields.background.required("AUTH-026")
        : commonFields.background.nullable(),
    healthNotes: commonFields.healthNotes,
    description: commonFields.description,
  });
};

const createTemplteSchema = buildSchema("create");

const updateTripTimeLineSchema = buildSchema("update");

module.exports = { createTemplteSchema, updateTripTimeLineSchema };

const yup = require("yup");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const baseSchema = {
  title: yup.string().typeError("AUTH-030"),
  time: yup.string().typeError("AUTH-030").matches(timeRegex, "AUTH-026"),
  icon: yup.string().typeError("AUTH-030").nullable(),
  location: yup.string().typeError("AUTH-030").nullable(),
  cost: yup.number().typeError("AUTH-030").positive("AUTH-030").nullable(),
  type: yup.string().typeError("AUTH-030"),
};

const createTripActivitySchema = yup.object().shape({
  ...baseSchema,
  title: baseSchema.title.required("AUTH-026"),
  time: baseSchema.time.required("AUTH-026"),
  templateId: yup.string().typeError("AUTH-030").required("AUTH-026"),
  date: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .required("AUTH-026"),
});

const editTripActivitySchema = yup.object().shape({
  activityId: yup.string().typeError("AUTH-030").required("AUTH-026"),
  tripActivityId: yup.string().typeError("AUTH-030").required("AUTH-026"),
  templateId: yup.string().typeError("AUTH-030").required("AUTH-026"),
  ...baseSchema,
});

const deleteTripActivitySchema = yup.object().shape({
  activityId: yup.string().typeError("AUTH-030").required("AUTH-026"),
  tripActivityId: yup.string().typeError("AUTH-030").required("AUTH-026"),
});

module.exports = {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
};

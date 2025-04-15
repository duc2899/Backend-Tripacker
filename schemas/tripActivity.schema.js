const yup = require("yup");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const createTripActivitySchema = yup.object().shape({
  title: yup.string().typeError("AUTH-030").required("AUTH-26"),
  time: yup
    .string()
    .typeError("AUTH-030")
    .matches(timeRegex, "AUTH-026")
    .required("AUTH-26"),
  templateId: yup.string().typeError("AUTH-030").required("AUTH-26"),
  icon: yup.string().typeError("AUTH-030").nullable(),
  location: yup.string().typeError("AUTH-030").nullable(),
  cost: yup.number().typeError("AUTH-030").positive("AUTH-030").nullable(),
  type: yup.string().typeError("AUTH-030").required("AUTH-26"),
  date: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .required("AUTH-26"),
});

const editTripActivitySchema = yup.object().shape({
  activityId: yup.string().typeError("AUTH-030").required("AUTH-26"),
  tripActivityId: yup.string().typeError("AUTH-030").required("AUTH-26"),
  title: yup.string().typeError("AUTH-030").nullable(),
  time: yup
    .string()
    .typeError("AUTH-030")
    .matches(timeRegex, "AUTH-026")
    .nullable(),
  templateId: yup.string().typeError("AUTH-030").required("AUTH-26"),
  icon: yup.string().typeError("AUTH-030").nullable(),
  location: yup.string().typeError("AUTH-030").nullable(),
  cost: yup.number().typeError("AUTH-030").positive("AUTH-030").nullable(),
  type: yup.string().typeError("AUTH-030").nullable(),
});

const deleteTripActivitySchema = yup.object().shape({
  activityId: yup.string().typeError("AUTH-030").required("AUTH-26"),
  tripActivityId: yup.string().typeError("AUTH-030").required("AUTH-26"),
});

module.exports = {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
};

const yup = require("yup");
const mongoose = require("mongoose");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

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

const baseSchema = {
  title: yup.string().typeError("AUTH-030"),
  time: yup.string().typeError("AUTH-030").matches(timeRegex, "AUTH-026"),
  icon: yup.string().typeError("AUTH-030").nullable(),
  cost: yup.number().typeError("AUTH-030").positive("AUTH-030").nullable(),
  type: yup.string().typeError("AUTH-030"),
  location: yup
    .object({
      destination: yup.string().typeError("AUTH-030").required("AUTH-026"),
      lat: yup.number().typeError("AUTH-030").required("AUTH-026"),
      lon: yup.number().typeError("AUTH-030").required("AUTH-026"),
    })
    .typeError("AUTH-030")
    .required("AUTH-026"),
};

const createTripActivitySchema = yup.object().shape({
  ...baseSchema,
  title: baseSchema.title.required("AUTH-026"),
  time: baseSchema.time.required("AUTH-026"),
  templateId: objectIdSchema,
  date: yup
    .string()
    .typeError("AUTH-030")
    .matches(dateRegex, "AUTH-026")
    .required("AUTH-026"),
});

const editTripActivitySchema = yup.object().shape({
  ...baseSchema,
  activityId: objectIdSchema,
  tripActivityId: objectIdSchema,
  templateId: objectIdSchema,
  location: yup
    .object({
      destination: yup.string().typeError("AUTH-030").nullable(),
      lat: yup.number().typeError("AUTH-030").nullable(),
      lon: yup.number().typeError("AUTH-030").nullable(),
    })
    .typeError("AUTH-030")
    .nullable(),
});

const deleteTripActivitySchema = yup.object().shape({
  activityId: yup.string().typeError("AUTH-030").required("AUTH-026"),
  tripActivityId: yup.string().typeError("AUTH-030").required("AUTH-026"),
});

const reOrderTripActivitySchema = yup.object().shape({
  tripActivityId: objectIdSchema,
  activities: yup
    .array()
    .of(
      yup.object().shape({
        _id: objectIdSchema,
        order: yup.number().required("AUTH-026").min(1),
      })
    )
    .required("AUTH-026")
    .min(1, "AUTH-026"),
});

module.exports = {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
  reOrderTripActivitySchema,
};

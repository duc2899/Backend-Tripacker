const yup = require("yup");
const mongoose = require("mongoose");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

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

const baseSchema = {
  note: yup.string().typeError("COMMON-007"),
  time: yup.string().typeError("COMMON-007").matches(timeRegex, "COMMON-006"),
  cost: yup.number().typeError("COMMON-007").positive("COMMON-007").nullable(),
  type: yup.string().typeError("COMMON-007"),
  location: yup
    .object({
      destination: yup.string().typeError("COMMON-007").required("COMMON-006"),
      lat: yup.number().typeError("COMMON-007").required("COMMON-006"),
      lon: yup.number().typeError("COMMON-007").required("COMMON-006"),
    })
    .typeError("COMMON-007")
    .required("COMMON-006"),
};

const createTripActivitySchema = yup.object().shape({
  ...baseSchema,
  time: baseSchema.time.required("COMMON-006"),
  templateId: objectIdSchema,
  date: yup
    .string()
    .typeError("COMMON-007")
    .matches(dateRegex, "COMMON-006")
    .required("COMMON-006"),
});

const editTripActivitySchema = yup.object().shape({
  ...baseSchema,
  activityId: objectIdSchema,
  tripActivityId: objectIdSchema,
  templateId: objectIdSchema,
  completed: yup.boolean().typeError("COMMON-007").nullable(),
  location: yup
    .object({
      destination: yup.string().typeError("COMMON-007").nullable(),
      lat: yup.number().typeError("COMMON-007").nullable(),
      lon: yup.number().typeError("COMMON-007").nullable(),
    })
    .typeError("COMMON-007")
    .nullable(),
});

const deleteTripActivitySchema = yup.object().shape({
  activityId: yup.string().typeError("COMMON-007").required("COMMON-006"),
  tripActivityId: yup.string().typeError("COMMON-007").required("COMMON-006"),
});

const reOrderTripActivitySchema = yup.object().shape({
  tripActivityId: objectIdSchema,
  activities: yup
    .array()
    .of(
      yup.object().shape({
        _id: objectIdSchema,
        order: yup.number().required("COMMON-006").min(1),
      })
    )
    .required("COMMON-006")
    .min(1, "COMMON-006"),
});

module.exports = {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
  reOrderTripActivitySchema,
};

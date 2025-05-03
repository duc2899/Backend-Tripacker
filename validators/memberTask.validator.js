const yup = require("yup");
const mongoose = require("mongoose");

const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

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

const createMemberTaskSchema = yup.object().shape({
  templateId: objectIdSchema,
  memberTask: yup
    .object()
    .typeError("COMMON-007")
    .shape({
      title: yup.string().required("COMMON-006"),
      status: yup
        .string()
        .oneOf(["Empty", "InProgress"], "COMMON-007")
        .default("Empty"),
      priority: yup
        .string()
        .oneOf(["high", "medium", "low"], "COMMON-007")
        .default("high"),
      assignee: yup
        .string()
        .nullable()
        .test("is-object-id", "COMMON-007", (value) => {
          if (value === null || value === undefined || value === "")
            return true; // Cho phép null, undefined, ""
          return (
            mongoose.Types.ObjectId.isValid(value) &&
            /^[0-9a-fA-F]{24}$/.test(value)
          );
        }),
      dueDate: yup
        .string()
        .typeError("COMMON-007")
        .matches(dateRegex, "COMMON-006")
        .nullable(),
    }),
});

const updateMemberTaskSchema = yup.object().shape({
  memberTaskId: objectIdSchema,
  templateId: objectIdSchema,
  updates: yup.object().shape({
    title: yup.string().nullable(),
    priority: yup
      .string()
      .oneOf(["high", "medium", "low"], "COMMON-007")
      .nullable(),
    dueDate: yup.string().matches(dateRegex, "COMMON-006").nullable(),
    assignee: yup
      .string()
      .nullable()
      .test("is-object-id", "COMMON-007", (value) => {
        if (value === null || value === undefined || value === "") return true;
        return (
          mongoose.Types.ObjectId.isValid(value) &&
          /^[0-9a-fA-F]{24}$/.test(value)
        );
      }),
  }),
});

const moveMemberTaskSchema = yup.object().shape({
  memberTaskId: objectIdSchema,
  templateId: objectIdSchema,
  newStatus: yup
    .string()
    .oneOf(["Empty", "InProgress", "Done", "Deleted"], "COMMON-007")
    .nullable(),
  newPosition: yup.number().nullable(),
});

const deleteMemberTaskSchema = yup.object().shape({
  memberTaskId: objectIdSchema,
  templateId: objectIdSchema,
});

module.exports = {
  createMemberTaskSchema,
  updateMemberTaskSchema,
  moveMemberTaskSchema,
  deleteMemberTaskSchema,
};

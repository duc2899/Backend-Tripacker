const mongoose = require("mongoose");

const memberTaskSchema = new mongoose.Schema(
  {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "templates", // Reference to the Template model
    },
    memberTasks: [
      {
        title: {
          type: String,
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
          default: "high",
        },
        isEdit: {
          type: Boolean,
          default: false,
        },
        assignee: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Users",
          required: true,
        },
        dueDate: {
          type: String,
          default: "",
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MemberTask = mongoose.model("memberTasks", memberTaskSchema);

module.exports = MemberTask;

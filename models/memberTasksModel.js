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
        status: {
          type: String,
          enum: ["Empty", "InProgress", "Done", "Deleted"],
          default: "Empty",
        },
        position: {
          type: Number,
          default: 0,
        },
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
          default: "high",
        },
        lastEditedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
        },
        assignee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
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

const mongoose = require("mongoose");

const templatesSchema = new mongoose.Schema(
  {
    pack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Packs",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    title: {
      type: String,
      maxlength: 100,
      default: "", // Added maxlength
    },
    startDate: {
      type: String,
      require: true,
    },
    endDate: {
      type: String,
      require: true,
    },
    budget: {
      type: Number,
      require: true,
    },
    tripType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tripTypes",
      required: true,
    },
    vihicle: {
      type: String,
      maxlength: 50,
      default: "", // Added maxlength
    },
    destination: {
      type: String,
      maxlength: 100,
      default: "", // Added maxlength
    },
    members: Number,
    listMembers: [
      {
        email: {
          type: String,
          validate: {
            validator: function (email) {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: (props) => `Email (${props.value}) is invalid!`,
          },
        },
        name: {
          type: String,
          maxlength: 50, // Added maxlength
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    background: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bgTemplate",
      required: true,
    },
    healthNotes: {
      type: String,
      maxlength: 100,
      default: "",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    description: {
      type: String,
      maxlength: 200,
      default: "", // Added maxlength
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("templates", templatesSchema);

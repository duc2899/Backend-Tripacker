const mongoose = require("mongoose");

const templatesSchema = new mongoose.Schema(
  {
    pack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Packs",
      required: true,
    },
    from: {
      destination: { type: String, required: true },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    to: {
      destination: { type: String, required: true },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    distanceKm: Number,
    owner: {
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
        isRegistered: { type: Boolean, default: false },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Users",
        },
        role: {
          type: String,
          enum: ["edit", "view"],
          default: "view",
        },
        name: String,
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
const Template = mongoose.model("templates", templatesSchema);
module.exports = Template;

const mongoose = require("mongoose");

const templatesSchema = new mongoose.Schema(
  {
    packId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Packs",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    title: {
      type: String,
      maxlength: 100, // Added maxlength
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
      type: String,
      maxlength: 50, // Added maxlength
    },
    vihicle: {
      type: String,
      maxlength: 50, // Added maxlength
    },
    destination: {
      type: String,
      maxlength: 100, // Added maxlength
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
    previewImage: {
      id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    healthNotes: {
      type: String,
      maxlength: 100,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("templates", templatesSchema);

const mongoose = require("mongoose");

const packSchema = new mongoose.Schema({
  categories: {
    type: [
      {
        category: { type: String, required: true, unique: true, maxlength: 50 },
        items: [
          {
            name: { type: String, required: true, maxlength: 50 },
            isCheck: { type: Boolean, default: false },
          },
        ],
        isDefault: { type: Boolean, default: false },
      },
    ],
    validate: [arrayLimit, "{PATH} exceeds the limit of 100"], // Giới hạn số lượng categories
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "templates",
    required: true,
  },
});

function arrayLimit(val) {
  return val.length <= 100;
}

const Pack = mongoose.model("Packs", packSchema);
module.exports = Pack;

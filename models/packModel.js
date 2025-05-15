const mongoose = require("mongoose");

const packSchema = new mongoose.Schema({
  categories: {
    type: [
      {
        category: { type: String, required: true, unique: true, maxlength: 50 },
        items: {
          type: [
            {
              name: { type: String, required: true, maxlength: 50 },
              isCheck: { type: Boolean, default: false },
            },
          ],
          validate: [arrayLimitItem, "{PATH} exceeds the limit of 15"], // Giới hạn số lượng items
        },
        isDefault: { type: Boolean, default: false },
      },
    ],
    validate: [arrayLimitCategory, "{PATH} exceeds the limit of 6"], // Giới hạn số lượng categories
  },
});

function arrayLimitCategory(val) {
  return val.length <= 6;
}

function arrayLimitItem(val) {
  return val.length <= 15;
}

const Pack = mongoose.model("Packs", packSchema);
module.exports = Pack;

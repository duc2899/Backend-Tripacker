const mongoose = require("mongoose");

const packSchema = new mongoose.Schema({
  categories: [
    {
      category: { type: String, required: true }, // VD: "Quần áo", "Phụ kiện"
      items: [
        {
          name: { type: String, required: true }, // VD: "Áo khoác", "Kính râm"
          isCheck: { type: Boolean, default: false }, // Trạng thái riêng của user
        },
      ],
      isDefault: { type: Boolean, default: false }, // Xác định đây có phải item mặc định không
    },
  ],
});

module.exports = mongoose.model("Packs", packSchema);

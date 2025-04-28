const mongoose = require("mongoose");
const backgroundTemplateSchema = new mongoose.Schema({
  tripTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "tripTypes",
    required: true,
  },
  background: {
    url: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
  },
});
module.exports = mongoose.model("bgTemplate", backgroundTemplateSchema);

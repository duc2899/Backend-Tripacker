const mongoose = require("mongoose");
const backgroundTemplateSchema = new mongoose.Schema({
  tripType: { type: String, required: true, unique: true },
  backgrounds: [
    {
      url: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model("bgTemplate", backgroundTemplateSchema);

const { google } = require("googleapis");
const { auth } = require("google-auth-library");

const cloudinary = require("../config/cloudinary");
const backgroundTemplateModel = require("../models/backgroundTemplateModel");
const throwError = require("../utils/throwError");

const BackgroundTemplateService = {
  async fetchImageFromExcel() {
    const spreadsheetId = "1oLeBl0mwr0GnkwywkO6dxQ8rYQkTmAudK-WGWiQoZvY";
    const sheetNames = await getTripType(spreadsheetId);

    for (const sheetName of sheetNames) {
      await getDataImageAndSave(spreadsheetId, sheetName);
    }
  },

  async getBackgroundsByTripType(id) {
    if (!id) {
      throwError("BGTEM-003");
    }
    const bgTemplate = await backgroundTemplateModel.findById(id).lean();
    if (!bgTemplate) {
      throwError(`BGTEM-004`);
    }

    // Shuffle the backgrounds array
    const shuffledBackgrounds = bgTemplate.backgrounds.sort(
      () => Math.random() - 0.5
    );

    // Return the first 10 items
    return shuffledBackgrounds.slice(0, 10);
  },

  async getAllTripTypes() {
    const tripTypes = await backgroundTemplateModel
      .find({}, "tripType _id")
      .lean();
    return tripTypes.map((item) => ({
      tripType: item.tripType,
      _id: item._id,
    }));
  },
};

const getTripType = async (spreadsheetId) => {
  const client = auth.fromJSON(require("../credentials.json"));
  client.scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
  const sheets = google.sheets({ version: "v4", auth: client });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `!B2:B`, // Cột B chứa chủ đề
    });

    const tripType = [...new Set(response.data.values.flat())]; // Loại bỏ trùng lặp
    console.log("✅ tripType:", tripType);
    return tripType;
  } catch (err) {
    console.error("❌ Lỗi khi lấy topics:", err);
    return [];
  }
};

const getDataImageAndSave = async (spreadsheetId, sheetName) => {
  const client = auth.fromJSON(require("../credentials.json"));
  client.scopes = ["https://www.googleapis.com/auth/spreadsheets"];

  const sheets = google.sheets({ version: "v4", auth: client });

  try {
    // 1. Lấy dữ liệu từ Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:C`, // Giả sử A = Index, B = Link, C = Status
    });

    const rows = response.data.values;
    if (!rows.length) return console.log("Không có dữ liệu!");

    // 2. Kiểm tra nếu tất cả Status = "Old" thì không làm gì cả
    let hasNewImage = rows.some(([_, __, status]) => status === "New");

    if (!hasNewImage) {
      console.log(`🚫 Không có ảnh nào mới để upload cho ${sheetName}.`);
      return;
    }

    // 3. Nếu chưa có tripType, chuẩn bị dữ liệu mới
    let trip = await backgroundTemplateModel.findOne({ tripType: sheetName });
    let newBackgrounds = [];

    let updates = [];
    for (let i = 0; i < rows.length; i++) {
      let [index, imageUrl, status] = rows[i];

      if (status === "New") {
        try {
          console.log(`📤 Uploading image: ${imageUrl}`);

          // 4. Upload ảnh lên Cloudinary
          const result = await cloudinary.uploader.upload(imageUrl, {
            folder: "backgrounds",
          });

          console.log(`✅ Uploaded: ${result.secure_url}`);

          let imageId = result.public_id;
          let cloudinaryUrl = result.secure_url;

          // 5. Thêm ảnh mới vào danh sách
          newBackgrounds.push({ url: cloudinaryUrl, id: imageId });

          // 6. Đánh dấu cần cập nhật `Status` thành `Old`
          updates.push({ range: `${sheetName}!C${i + 2}`, values: [["Old"]] });
        } catch (uploadErr) {
          console.error(`❌ Lỗi upload ảnh: ${uploadErr.message}`);
        }
      }
    }

    // 7. Nếu chưa có tripType, tạo mới với danh sách ảnh vừa upload
    if (!trip) {
      trip = new backgroundTemplateModel({
        tripType: sheetName,
        backgrounds: newBackgrounds,
      });
    } else {
      // Nếu đã có tripType, chỉ cần thêm ảnh vào backgrounds
      trip.backgrounds.push(...newBackgrounds);
    }

    // 8. Lưu cập nhật vào MongoDB
    await trip.save();
    console.log("✅ Đã lưu backgrounds vào MongoDB!");

    // 9. Cập nhật trạng thái thành "Old" trên Google Sheets
    if (updates.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          data: updates,
          valueInputOption: "RAW",
        },
      });
      console.log("✅ Cập nhật trạng thái thành Old trên Google Sheets!");
    }
  } catch (err) {
    console.error("❌ Lỗi khi xử lý:", err);
  }
};

module.exports = BackgroundTemplateService;

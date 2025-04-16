const { google } = require("googleapis");
const { auth } = require("google-auth-library");

const cloudinary = require("../config/cloudinary");
const backgroundTemplateModel = require("../models/backgroundTemplateModel");
const tripTypeModel = require("../models/tripTypeModel");
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
    const bgTemplates = await backgroundTemplateModel
      .find({
        tripTypeId: id,
      })
      .lean();

    if (!bgTemplates || bgTemplates.length === 0) {
      return {};
    }

    const randomIndex = Math.floor(Math.random() * bgTemplates.length);
    const randomBackground = bgTemplates[randomIndex];

    return { _id: randomBackground._id, url: randomBackground.background.url };
  },

  async getAllTripTypes() {
    const tripTypes = await tripTypeModel
      .find()
      .select("-createdAt -updatedAt -__v")
      .lean();

    // Lấy danh sách background images cho mỗi trip type
    const tripTypesWithBackgrounds = await Promise.all(
      tripTypes.map(async (tripType) => {
        const backgroundImages = await backgroundTemplateModel
          .find({ tripTypeId: tripType._id })
          .lean();

        if (backgroundImages.length === 0) {
          return { ...tripType, backgroundImage: null, backgroundId: null };
        }

        // Get a random background image
        const randomIndex = Math.floor(Math.random() * backgroundImages.length);
        const randomBackgroundImage = backgroundImages[randomIndex];

        return {
          ...tripType,
          backgroundImage: {
            url: randomBackgroundImage.background.url,
            _id: randomBackgroundImage._id,
          },
        };
      })
    );

    return tripTypesWithBackgrounds;
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

    const tripTypeNames = [...new Set(response.data.values.flat())]; // Loại bỏ trùng lặp
    console.log("✅ tripTypeNames:", tripTypeNames);

    // Tạo hoặc lấy các tripType từ database
    const tripTypes = await Promise.all(
      tripTypeNames.map(async (name) => {
        let tripType = await tripTypeModel.findOne({ name });
        if (!tripType) {
          tripType = new tripTypeModel({ name });
          await tripType.save();
        }
        return { name: tripType.name, _id: tripType._id };
      })
    );

    console.log("✅ tripTypes:", tripTypes);
    return tripTypes;
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
      range: `${sheetName.name}!A2:C`, // Giả sử A = Index, B = Link, C = Status
    });

    const rows = response.data.values;
    if (!rows.length) return console.log("Không có dữ liệu!");

    // 2. Kiểm tra nếu tất cả Status = "Old" thì không làm gì cả
    let hasNewImage = rows.some(([_, __, status]) => status === "New");

    if (!hasNewImage) {
      console.log(`🚫 Không có ảnh nào mới để upload cho ${sheetName.name}.`);
      return;
    }

    let updates = [];

    for (let i = 0; i < rows.length; i++) {
      let [index, imageUrl, status] = rows[i];

      if (status === "New") {
        try {
          console.log(`📤 Uploading image: ${imageUrl}`);

          // 3. Upload ảnh lên Cloudinary
          const result = await cloudinary.uploader.upload(imageUrl, {
            folder: "backgrounds",
          });

          console.log(`✅ Uploaded: ${result.secure_url}`);

          let imageId = result.public_id;
          let cloudinaryUrl = result.secure_url;

          // 4. Tạo bản ghi mới trong MongoDB (Mỗi ảnh là 1 bản ghi)
          const newBackground = new backgroundTemplateModel({
            tripTypeId: sheetName._id,
            background: {
              url: cloudinaryUrl,
              id: imageId,
            },
          });

          await newBackground.save();
          console.log("✅ Đã lưu background vào MongoDB!");

          // 5. Đánh dấu cần cập nhật `Status` thành `Old`
          updates.push({
            range: `${sheetName.name}!C${i + 2}`,
            values: [["Old"]],
          });
        } catch (uploadErr) {
          console.error(`❌ Lỗi upload ảnh: ${uploadErr.message}`);
        }
      }
    }

    // 6. Cập nhật trạng thái thành "Old" trên Google Sheets
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

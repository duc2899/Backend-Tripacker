const PackModel = require("../models/packModel");
const TemplateModel = require("../models/templatesModel");
const DefaultItemModel = require("../models/defaultItemsModel");
const backgroundsTemplateModel = require("../models/backgroundTemplateModel");
const tripTypeModel = require("../models/tripTypeModel");
const { isValidEmail } = require("../utils/validateEmail");
const { callAI } = require("./getSuggestAI");
const throwError = require("../utils/throwError");

const TemplateService = {
  async getTemplate(templateId) {
    const template = await TemplateModel.findById(templateId)
      .populate("pack")
      .lean();
    if (!template) {
      throwError("TEM-005");
    }

    const responseTemplate = await getTemplateDetails(template);

    return responseTemplate;
  },

  async createTemplate(templateData, reqUser) {
    const { userId, email, name } = reqUser;
    const {
      background,
      tripType,
      title,
      startDate,
      endDate,
      budget,
      members,
      vihicle,
      destination,
      listMembers,
      healthNotes,
      description,
    } = templateData;

    // Thêm người tạo vào danh sách thành viên
    templateData.listMembers = templateData.listMembers || [];
    templateData.listMembers.push({ email, name });

    // Kiểm tra background có tồn tại trong model không
    const backgroundTemplate = await backgroundsTemplateModel.findById(
      background
    );
    if (!backgroundTemplate) {
      throwError("TEM-025");
    }

    // Kiểm tra tripType có tồn tại trong model không
    const tripTypeTemplate = await tripTypeModel.findById(tripType);
    if (!tripTypeTemplate) {
      throwError("TEM-026");
    }
    // Kiểm tra dữ liệu
    validateTemplateData(templateData, true);

    // Lấy danh sách items mặc định
    const defaultItems = await DefaultItemModel.find().lean();
    const pack = new PackModel({
      categories: defaultItems.map((category) => ({
        category: category.category,
        items: category.items.map((item) => ({ name: item, isCheck: false })),
        isDefault: true,
      })),
    });
    await pack.save();

    // Tạo template mới
    const newTemplate = await TemplateModel.create({
      title,
      startDate,
      endDate,
      budget,
      members,
      vihicle,
      tripType,
      destination,
      listMembers,
      healthNotes,
      background,
      pack: pack._id,
      description,
      user: userId,
    });

    // Lấy thông tin chi tiết template
    const responseTemplate = await getTemplateDetails(newTemplate.toObject());
    responseTemplate.pack = pack.toObject();
    return responseTemplate;
  },

  async getSuggestAI(data) {
    const { tripName, budget, weathers, days, transport, items, location } =
      data;

    const prompt = `
          Tôi chuẩn bị đi chuyến ${tripName} tại ${location}, 
          - Kéo dài ${days} ngày.
          - Ngân sách: ${budget} VND.
          - Phương tiện di chuyển: ${transport}.
          - Dự báo thời tiết những ngày như sau: \n\n${JSON.stringify(
            { weathers },
            null,
            2
          )}
          Tôi đã có sẵn các đồ sau: ${items.join(", ")}.
          
          1 Bạn xem những món đồ quan trọng mà tôi quên check không vào muc noti_important?
          2 Có lưu ý nào đặc biệt về thời tiết hoặc hành lý không?
          3 Gợi ý trang phục phù hợp cho thời tiết gày đó?
          4 Bạn có thể gợi ý cho tôi món đồ tôi có thể cần không (vài món thôi)? 
      
           Vui lòng trả lời dưới dạng JSON, ví dụ:
            {
              "noti_important": [...],
              "suggest_items": [...],
              "weather_notes": "...",
              "outfit_suggestions": "..."
            }
          Viết cho tôi ngắn gọn nhưng đủ ý nhé.
        `;
    // await listAvailableModels();
    const aiResponse = await callAI(prompt);
    const cleanedResponse = aiResponse.replace(/```json|```/g, "").trim();

    // Chuyển đổi chuỗi JSON thành đối tượng JavaScript
    return JSON.parse(cleanedResponse);
  },

  async updateCategoryPacks(data, userId) {
    const { packId, packItems, templateId, categoryId } = data;
    if (!packId) {
      throwError("TEM-007");
    }

    if (!Array.isArray(packItems) || packItems.length === 0) {
      throwError("TEM-008");
    }

    for (const item of packItems) {
      if (!item.name || typeof item.name !== "string") {
        throwError("TEM-009");
      }
      if (typeof item.isCheck !== "boolean") {
        throwError("TEM-010");
      }
    }

    if (!templateId) {
      throwError("TEM-011");
    }

    const template = await TemplateModel.findOne({
      _id: templateId,
      userId,
    }).lean();
    if (!template) {
      throwError("TEM-012");
    }

    const pack = await PackModel.findById(packId);
    if (!pack) {
      throwError("TEM-013");
    }

    const category = pack.categories.find(
      (cat) => cat._id.toString() === categoryId
    );

    if (!category) {
      throwError("TEM-014");
    }

    const updatedItems = packItems.map((newItem) => {
      const existingItem = category.items.find(
        (item) => item._id && item._id.toString() === newItem._id
      );
      if (existingItem) {
        // Update existing item
        return { ...existingItem, ...newItem };
      } else {
        // Add new item
        return { ...newItem, _id: undefined }; // Remove _id for new items
      }
    });

    category.items = updatedItems;

    await pack.save();
    return pack;
  },

  async updateInforTemplate(data, userId) {
    const { templateId, updateData } = data;
    // Kiểm tra template có tồn tại không
    const template = await TemplateModel.findOne({ _id: templateId, userId });
    if (!template) {
      throwError("TEM-015");
    }

    // Kiểm tra và validate dữ liệu
    validateTemplateData(updateData);

    // Cập nhật template với những trường có dữ liệu
    Object.keys(updateData).forEach((key) => {
      if (
        updateData[key] !== undefined &&
        key !== "packId" &&
        key !== "userId" &&
        key !== "tripTypeId" &&
        key !== "backgroundId"
      ) {
        template[key] = updateData[key];
      }
    });

    await template.save();
    const responseTemplate = await getTemplateDetails(template.toObject());

    return { template: responseTemplate };
  },
};

const validateTemplateData = (data, isCreate = false) => {
  const {
    title,
    destination,
    background,
    tripType,
    members = 1,
    vihicle,
    startDate,
    endDate,
    budget,
    listMembers,
  } = data;

  if (
    isCreate &&
    (!title ||
      !startDate ||
      !endDate ||
      !budget ||
      !vihicle ||
      !destination ||
      !background ||
      !tripType)
  ) {
    throwError("TEM-016");
  }
  if (members <= 0) {
    throwError("TEM-017");
  }

  if (budget !== undefined && budget <= 0) {
    throwError("TEM-018");
  }

  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (startDate && !dateRegex.test(startDate)) {
    throwError("TEM-019");
  }
  if (endDate && !dateRegex.test(endDate)) {
    throwError("TEM-020");
  }

  if (startDate && endDate) {
    const now = new Date();
    const vietnamTimezoneOffset = 7 * 60;
    const vietnamNow = new Date(
      now.getTime() + vietnamTimezoneOffset * 60 * 1000
    );

    if (new Date(startDate) < vietnamNow) {
      throwError("TEM-021");
    }
    if (new Date(startDate) > new Date(endDate)) {
      throwError("TEM-022");
    }
  }

  if (listMembers) {
    const emails = listMembers.map((member) => member.email);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      throwError("TEM-023");
    }

    for (const member of listMembers) {
      if (!isValidEmail(member.email)) {
        throwError(`TEM-024`);
      }
    }
  }
};

// Hàm dùng chung để lấy thông tin chi tiết của template
const getTemplateDetails = async (template) => {
  if (!template) {
    throwError("TEM-005");
  }

  // Lấy thông tin tripType
  const tripTypeData = await tripTypeModel.findById(template.tripType).lean();
  if (!tripTypeData) {
    throwError("TEM-026");
  }

  // Lấy thông tin background
  const backgroundTemplateData = await backgroundsTemplateModel
    .findById(template.background)
    .lean();
  if (!backgroundTemplateData) {
    throwError("TEM-025");
  }

  // Tạo bản sao mới của template để response
  const responseTemplate = {
    ...template, // Sao chép dữ liệu từ template gốc
    tripType: {
      _id: tripTypeData._id,
      name: tripTypeData.name,
    },
    background: {
      _id: backgroundTemplateData._id,
      url: backgroundTemplateData.background.url,
      id: backgroundTemplateData.background.id,
    },
  };

  // Xóa các field không cần thiết
  delete responseTemplate.backgroundId;
  delete responseTemplate.tripTypeId;
  delete responseTemplate.packId;

  return responseTemplate;
};

module.exports = TemplateService;

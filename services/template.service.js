const PackModel = require("../models/packModel");
const UserModel = require("../models/userModel");
const TemplateModel = require("../models/templatesModel");
const DefaultItemModel = require("../models/defaultItemsModel");
const BackgroundsTemplateModel = require("../models/backgroundTemplateModel");
const TripTypeModel = require("../models/tripTypeModel");
const { callAI } = require("./getSuggestAI");
const throwError = require("../utils/throwError");
const { createTemplteSchema } = require("../validators/template.validator");
const {
  handleCreateListMembers,
  handleCheckExitBackground,
  handleCheckExitTripType,
  handleCaculatorDistance,
} = require("../logics/template.logic");
const { MAX_TEMPLATES_PER_USER } = require("../config/constant");

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

  async createTemplate(reqUser, data) {
    try {
      const { userId, email, fullName } = reqUser;
      const {
        background,
        tripType,
        title,
        startDate,
        endDate,
        budget,
        members,
        vihicle,
        listMembers,
        healthNotes,
        description,
        from,
        to,
      } = data;

      const user = await UserModel.findById(userId);

      if (user.countTemplates >= MAX_TEMPLATES_PER_USER) {
        throwError("TEM-035");
      }

      // Kiểm tra dữ liệu
      await createTemplteSchema.validate(data);

      const membersToAdd = await handleCreateListMembers(
        listMembers || [],
        email,
        fullName,
        userId
      );

      await handleCheckExitBackground(background);
      await handleCheckExitTripType(tripType);

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
        distanceKm: handleCaculatorDistance(from, to),
        listMembers: membersToAdd,
        healthNotes,
        background,
        pack: pack._id,
        description,
        owner: userId,
        from,
        to,
      });

      user.countTemplates++;
      user.save({ validateModifiedOnly: true });

      return newTemplate._id;
    } catch (error) {
      throwError(error.message);
    }
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
    // Remove markdown formatting (nếu có)
    const cleaned = aiResponse.replace(/```json|```/g, "").trim();

    // Cố gắng parse JSON từ đầu chuỗi, cắt dần từng ký tự cuối nếu gặp lỗi
    let lastValidJSON = null;
    for (let i = cleaned.length; i > 0; i--) {
      const slice = cleaned.slice(0, i);
      try {
        lastValidJSON = JSON.parse(slice);
        break; // thành công thì dừng
      } catch (err) {
        continue; // nếu parse lỗi thì tiếp tục cắt bớt
      }
    }

    if (!lastValidJSON) {
      throwError("AI-002", 500, "FAILED_TO_PARSE_AI_JSON");
    }

    return lastValidJSON;
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
      user: userId,
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

  async searchTemplates(data) {
    const { page = 1, limit = 10, query } = data;
    const skip = (page - 1) * limit;

    const pipeline = [];

    if (query) {
      pipeline.push(
        {
          $search: {
            index: "search_name",
            text: {
              query: query,
              path: "to.name",
              fuzzy: {},
            },
          },
        },
        {
          $match: {
            isPublic: true,
          },
        }
      );
    } else {
      pipeline.push({
        $match: {
          isPublic: true,
        },
      });
    }

    pipeline.push(
      { $sort: { "to.name": 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const countPipeline = query
      ? [
          {
            $search: {
              index: "search_name",
              text: {
                query: query,
                path: "to.name",
                fuzzy: {},
              },
            },
          },
          { $match: { isPublic: true } },
          { $count: "total" },
        ]
      : [{ $match: { isPublic: true } }, { $count: "total" }];

    const [templates, countResult] = await Promise.all([
      TemplateModel.aggregate(pipeline),
      TemplateModel.aggregate(countPipeline),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    return {
      data: templates,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      isLastPage: page * limit >= total,
    };
  },

  async searchUsersByEmail(reqUser, data) {
    const { email } = reqUser;
    const { query } = data;

    const pipeline = [];

    if (query) {
      pipeline.push({
        $match: {
          email: { $regex: query, $options: "i" },
        },
      });
    } else {
      return {
        data: [],
      };
    }

    pipeline.push({
      $project: {
        _id: 0,
        email: 1,
        fullName: 1,
        avatar: {
          $ifNull: ["$avatar.url", ""],
        },
      },
    });

    const users = await UserModel.aggregate(pipeline);
    const newListUser = users.filter((user) => user.email !== email);

    return {
      data: newListUser,
    };
  },
};

// Hàm dùng chung để lấy thông tin chi tiết của template
const getTemplateDetails = async (template) => {
  if (!template) {
    throwError("TEM-005");
  }

  // Lấy thông tin tripType
  const tripTypeData = await TripTypeModel.findById(template.tripType).lean();
  if (!tripTypeData) {
    throwError("TEM-026");
  }

  // Lấy thông tin background
  const backgroundTemplateData = await BackgroundsTemplateModel.findById(
    template.background
  ).lean();
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

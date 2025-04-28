const PackModel = require("../models/packModel");
const UserModel = require("../models/userModel");
const TemplateModel = require("../models/templatesModel");
const DefaultItemModel = require("../models/defaultItemsModel");
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

      const countTemplates = await TemplateModel.countDocuments({
        owner: userId,
      }).lean();

      if (countTemplates >= MAX_TEMPLATES_PER_USER) {
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

module.exports = TemplateService;

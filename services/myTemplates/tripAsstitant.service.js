const PackModel = require("../../models/packModel");
const TemplateModel = require("../../models/templatesModel");
const throwError = require("../../utils/throwError");
const { callAI } = require("../getSuggestAI");
const { getCache, setCache } = require("../../utils/redisHelper");
const {
  updateTripAssistantSchema,
} = require("../../validators/template.validator");

const TripAsstitantService = {
  async getTripAsstitant(reqUser, templateId) {
    const { email, userId, fullName } = reqUser;

    // Try to get from cache first
    const cacheKey = `trip_assistant:${templateId}:${userId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const template = await TemplateModel.findById(templateId)
      .populate("pack tripType")
      .select(
        "pack healthNotes listMembers to startDate tripType endDate budget members vihicle hasAppliedAISuggestions"
      );

    if (!template) {
      throwError("TEM-012");
    }

    const member = template.listMembers.find(
      (member) => member.email && member.email === email
    );

    if (!member) {
      throwError("TEM-029", 403);
    }

    // Cập nhật thông tin user nếu chưa có
    if (!member.user) {
      member.user = userId;
      member.name = fullName;
      member.isRegistered = true;
      await template.save(); // Save luôn thay vì gọi lại findById
    }

    // Get checklist suggestions
    const checklistSuggestions = await this.getSuggestChecklist(templateId);

    const result = {
      _id: template._id,
      packs: template.pack.categories,
      healthNotes: template.healthNotes,
      checklistSuggestions,
    };

    // Cache the result for 1 hour
    await setCache(cacheKey, result, 3600);

    return result;
  },

  async getSuggestPacksFromAI(templateId) {
    const template = await TemplateModel.findById(templateId).populate(
      "pack tripType"
    );

    if (!template) {
      throwError("TEM-012");
    }

    try {
      const { to, startDate, endDate, budget, members, vihicle } = template;
      const tripType = template.tripType.name;

      const prompt = `
          Toi se di ${
            to.destination
          } tu ${startDate} den ${endDate}, ngan sach ${budget}đ cho ${members} nguoi.  
          Loai chuyen: ${tripType}, phuong tien: ${vihicle}.  
          Voi Packs ${JSON.stringify(
            template.pack.categories
          )} do nhu nay thi ban danh dau cho toi do nao can thiet nhe(isCheck=true)
          LUU Y QUAN TRONG
           - Tra ve voi toan bo danh sach ban dau
           - Giu nguyen cau truc va dung dang JSON
           - Chi tra ve JSON, khong co text nao khac
          `.trim();

      const aiResponse = await callAI(prompt);

      // Loại bỏ tất cả các ký tự không phải JSON
      const cleaned = aiResponse
        .replace(/```json|```/g, "") // Loại bỏ markdown
        .replace(/[\n\r]/g, "") // Loại bỏ newline
        .trim();

      try {
        // Tìm JSON trong chuỗi
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!jsonMatch) {
          return template.pack.categories;
        }

        const result = JSON.parse(jsonMatch[0]);

        // Kiểm tra cấu trúc kết quả
        if (!Array.isArray(result)) {
          console.log("Kết quả không phải là mảng");
          return template.pack.categories;
        }

        // Only update the pack with AI-suggested items if it hasn't been done before
        if (!template.hasAppliedAISuggestions) {
          // Lấy instance của PackModel
          const pack = await PackModel.findById(template.pack._id);
          if (!pack) {
            throwError("TEM-013");
          }

          // Cập nhật categories
          pack.categories = result;
          await pack.save();

          // Cập nhật trạng thái đã apply AI suggestions
          template.hasAppliedAISuggestions = true;
          await template.save();

          return result;
        } else {
          return template.pack.categories;
        }
      } catch (err) {
        return template.pack.categories;
      }
    } catch (error) {
      return template.pack.categories;
    }
  },

  async getSuggestChecklist(templateId) {
    // Try to get from cache first
    const cacheKey = `suggest_checklist:${templateId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const template = await TemplateModel.findById(templateId).populate(
      "tripType"
    );

    if (!template) {
      throwError("TEM-012");
    }
    const { budget, weathers, startDate, endDate, vihicle, to } = template;

    const tripType = template.tripType.name;

    const prompt = `
          Toi chuan bi di chuyen ${tripType} tai ${
      to.destination
    }, Keo dai tu ${startDate} den ${endDate} ngay. Ngan sach: ${budget} VND. Phuong tien di chuyen: ${vihicle}.
          - Du bao thoi tiet nhung ngay nhu sau: \n\n${JSON.stringify(
            { weathers },
            null,
            2
          )}
          
          1 Dua cho toi nhung luu y quan trong ve thoi tiet va hanh ly.
          2 Goi y cho toi trang phuc phu hop voi thoi tiet.
          3 Goi y cho toi tip du lich nhe
    
           Vui lòng trả lời dưới dạng JSON, ví dụ:
            {
              "note_important": [...],
              "outfit_suggestions": [...],
              "travel_tips": "..."
            }
          Viet cho toi ngam gon nhung du duoc y nghia
        `;

    const aiResponse = await callAI(prompt);
    const cleaned = aiResponse.replace(/```json|```/g, "").trim();

    let lastValidJSON = null;
    for (let i = cleaned.length; i > 0; i--) {
      const slice = cleaned.slice(0, i);
      try {
        lastValidJSON = JSON.parse(slice);
        break;
      } catch (err) {
        continue;
      }
    }

    if (!lastValidJSON) {
      throwError("AI-002", 500, "FAILED_TO_PARSE_AI_JSON");
    }

    await setCache(cacheKey, lastValidJSON);

    return lastValidJSON;
  },

  async updateTripAssistant(data) {
    try {
      await updateTripAssistantSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId);
      if (!template) {
        throwError("TEM-012");
      }

      // Get the pack associated with the template
      const pack = await PackModel.findById(template.pack);
      if (!pack) {
        throwError("TEM-013");
      }

      // Create a map of existing categories by ID for quick lookup
      const existingCategoriesMap = new Map(
        pack.categories.map((cat) => [cat._id.toString(), cat])
      );

      if (data.categories) {
        // Process each category from the input data
        data.categories.forEach((newCategory) => {
          const existingCategory = existingCategoriesMap.get(newCategory._id);

          if (existingCategory) {
            // Only update category and isDefault if it's not a default category
            if (!existingCategory.isDefault) {
              existingCategory.category = newCategory.category;
            }

            // Create a map of existing items by ID for quick lookup
            const existingItemsMap = new Map(
              existingCategory.items.map((item) => [item._id.toString(), item])
            );

            // Process each item from the input data
            newCategory.items.forEach((newItem) => {
              const existingItem = existingItemsMap.get(newItem._id);

              if (existingItem) {
                // Update item properties
                existingItem.name = newItem.name;
                existingItem.isCheck = newItem.isCheck;
              }
            });
          }
        });
      }

      // Update health notes if provided
      if (data.healthNotes !== undefined) {
        template.healthNotes = data.healthNotes;
      }

      await pack.save();
      await template.save();

      return {
        _id: template._id,
        packs: pack.categories,
        healthNotes: template.healthNotes,
      };
    } catch (error) {
      throwError(error.message);
    }
  },
};

module.exports = TripAsstitantService;

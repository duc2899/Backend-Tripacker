const axios = require("axios");
const mongoose = require("mongoose");

const PackModel = require("../../models/packModel");
const TemplateModel = require("../../models/templatesModel");
const throwError = require("../../utils/throwError");
const { callAI } = require("../getSuggestAI");
const { getCache, setCache } = require("../../utils/redisHelper");
const {
  getSuggestPacksFromAISchema,
  getWeatherForecastSchema,
  managerCategorySchema,
  managerItemsCategorySchema,
  updateTripAsstitantSchema,
} = require("../../validators/template.validator");
const {
  handleResetCountCallSuggest,
  handleUpdateCountCallSuggest,
  caculateDays,
} = require("../../logics/template.logic");
const { MAX_CALL_SUGGEST } = require("../../config/constant");

const CACHE_PREFIX = "trip_assistant:";

const TripAsstitantService = {
  async getTripAsstitant(reqUser, templateId) {
    const { email, userId, fullName } = reqUser;

    // Try to get from cache first
    const cacheKey = `${CACHE_PREFIX}:${templateId}`;
    const cachedData = await getCache(cacheKey);

    const cacheKeyTripTimeline = `trip_timeline:${templateId}`;
    const cachedDataTripTimeline = await getCache(cacheKeyTripTimeline);

    if (cachedDataTripTimeline?.infor && cachedData) {
      // Kiểm tra xem user có trong listMembers không
      const member = cachedDataTripTimeline.infor.listMembers.find(
        (member) => member.email && member.email === email
      );
      if (!member) {
        throwError("TEM-029", 403);
      }
      return cachedData;
    }

    const template = await TemplateModel.findById(templateId)
      .populate("pack tripType")
      .select(
        "pack healthNotes listMembers to startDate tripType endDate budget members vihicle"
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
    const checklistSuggestions = await this.getSuggestChecklistFromAI({
      templateId,
      forceUpdate: false,
    });

    const result = {
      _id: template._id,
      packs: template.pack.categories,
      healthNotes: template.healthNotes,
      checklistSuggestions,
      infor: cachedDataTripTimeline?.infor,
    };

    await setCache(cacheKey, result);

    return result;
  },

  async getSuggestPacksFromAI(data, firstCall = false) {
    const { templateId, forceUpdate } = data;

    // Validate data first
    try {
      await getSuggestPacksFromAISchema.validate(data);
    } catch (error) {
      throwError(error.message, 400);
    }

    try {
      const template = await TemplateModel.findById(templateId).populate(
        "pack tripType"
      );

      if (!template) {
        throwError("TEM-012");
      }

      await handleResetCountCallSuggest(template);

      // Try to get from cache first
      const cacheKey = `${CACHE_PREFIX}:${templateId}`;
      const cachedData = await getCache(cacheKey);

      // Early return if we have cached data and no force update
      if (
        cachedData &&
        !forceUpdate &&
        template.countCallSuggest <= MAX_CALL_SUGGEST
      ) {
        return cachedData.packs || template.pack.categories;
      }

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
      const cleaned = aiResponse
        .replace(/```json|```/g, "")
        .replace(/[\n\r]/g, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        return cachedData?.packs || template.pack.categories;
      }

      const result = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(result)) {
        return cachedData?.packs || template.pack.categories;
      }

      const pack = await PackModel.findById(template.pack._id);
      if (!pack) {
        throwError("TEM-013");
      }

      pack.categories = result;
      await pack.save();

      // Update cache with new result
      const updatedCache = {
        ...cachedData,
        packs: result,
      };
      await setCache(cacheKey, updatedCache);

      if (!firstCall) {
        await handleUpdateCountCallSuggest(template);
      }

      return result;
    } catch (error) {
      const cacheKey = `${CACHE_PREFIX}:${templateId}`;
      const cachedData = await getCache(cacheKey);
      return cachedData?.packs || template?.pack?.categories || [];
    }
  },

  async getSuggestChecklistFromAI(data, firstCall = false) {
    const { templateId, forceUpdate } = data;

    // Validate data first
    try {
      await getSuggestPacksFromAISchema.validate(data);
    } catch (error) {
      throwError(error.message, 400);
    }

    try {
      const template = await TemplateModel.findById(templateId).populate(
        "tripType"
      );

      if (!template) {
        throwError("TEM-012");
      }

      await handleResetCountCallSuggest(template);

      const cacheKey = `${CACHE_PREFIX}:${templateId}`;
      const cachedData = await getCache(cacheKey);

      const defaultTripAssistant = {
        checklistSuggestions: {
          note_important: [],
          outfit_suggestions: [],
          travel_tips: [],
        },
      };

      if (forceUpdate === "false") {
        return (
          cachedData?.checklistSuggestions ||
          defaultTripAssistant.checklistSuggestions
        );
      }

      if (
        forceUpdate === "true" &&
        cachedData &&
        template.countCallSuggest >= MAX_CALL_SUGGEST
      ) {
        return (
          cachedData.checklistSuggestions ||
          defaultTripAssistant.checklistSuggestions
        );
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
              "travel_tips": [...]
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
        return (
          cachedData?.checklistSuggestions ||
          defaultTripAssistant.checklistSuggestions
        );
      }

      if (!firstCall) {
        await handleUpdateCountCallSuggest(template);
      }

      const updatedCache = {
        ...cachedData,
        checklistSuggestions: lastValidJSON,
      };
      await setCache(cacheKey, updatedCache);

      return lastValidJSON;
    } catch (error) {
      const cacheKey = `${CACHE_PREFIX}:${templateId}`;
      const cachedData = await getCache(cacheKey);
      return (
        cachedData?.checklistSuggestions ||
        defaultTripAssistant.checklistSuggestions
      );
    }
  },

  async updateTripAssistant(data) {
    try {
      await updateTripAsstitantSchema.validate(data);
      const { healthNotes, templateId } = data;
      const template = await TemplateModel.findOneAndUpdate(
        {
          _id: templateId,
        },
        {
          $set: { healthNotes: healthNotes }, // cập nhật category name
        },
        { new: true }
      );

      if (!template) {
        throwError("COMMON-005");
      }

      // Get current cache and update both packs and healthNotes
      const tripAssistantCacheKey = `${CACHE_PREFIX}:${templateId}`;
      const currentCache = await getCache(tripAssistantCacheKey);

      if (currentCache) {
        currentCache.healthNotes = template.healthNotes;
        await setCache(tripAssistantCacheKey, currentCache);
      }

      return template.healthNotes;
    } catch (error) {
      throwError(error.message);
    }
  },

  async managerCategory(data) {
    try {
      await managerCategorySchema.validate(data);
      const { categoryName, type, templateId, categoryId } = data;

      let result;

      switch (type) {
        case "create":
          if (!categoryName) {
            throwError("COMMON-006");
          }
          const newCategory = {
            category: categoryName,
            items: [],
            isDefault: false,
            _id: new mongoose.Types.ObjectId(),
          };
          const newListCategories = await PackModel.findOneAndUpdate(
            {
              template: templateId,
              "categories.category": { $ne: newCategory.category },
            },
            { $push: { categories: newCategory } },
            { new: true }
          );

          if (!newListCategories) {
            throwError("TEM-039");
          }
          result = newListCategories;
          break;
        case "update":
          if (!categoryName) {
            throwError("COMMON-006");
          }
          const pack = await PackModel.findOne({
            template: templateId,
          });

          if (!pack) {
            throwError("TEM-039");
          }

          // 2. Kiểm tra xem categoryName đã tồn tại chưa
          const isDuplicate = pack.categories.some(
            (cat) => cat.category === categoryName
          );

          if (isDuplicate) {
            throwError("TEM-039");
          }

          const updatedPack = await PackModel.findOneAndUpdate(
            {
              template: templateId,
              "categories._id": categoryId, // ID của category con trong mảng
            },
            {
              $set: { "categories.$.category": categoryName }, // cập nhật category name
            },
            { new: true }
          );

          result = updatedPack;
          break;
        case "delete":
          const deletedPack = await PackModel.findOneAndUpdate(
            { template: templateId },
            { $pull: { categories: { _id: categoryId } } },
            { new: true }
          );

          if (!deletedPack) {
            throwError("TEM-042"); // Không tìm thấy pack hoặc không xóa được
          }
          result = deletedPack;
          break;
        default:
          throwError("TEM-044");
          break;
      }
      // Get current cache and update both packs and healthNotes
      const tripAssistantCacheKey = `${CACHE_PREFIX}:${data.templateId}`;
      const currentCache = await getCache(tripAssistantCacheKey);

      if (currentCache) {
        currentCache.packs = result;
        await setCache(tripAssistantCacheKey, currentCache);
      }

      return result;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error (nếu unique index hoạt động)
        throwError("TEM-039");
      }
      throwError(error.message);
    }
  },

  async managerItemsCategory(data) {
    try {
      await managerItemsCategorySchema.validate(data);
      const { itemName, isCheck, type, templateId, categoryId, itemId } = data;

      const pack = await PackModel.findOne({ template: templateId });
      if (!pack) throwError("TEM-042"); // Không tìm thấy pack

      const category = pack.categories.id(categoryId);
      if (!category) throwError("TEM-043"); // Không tìm thấy category

      switch (type) {
        case "create":
          if (!itemName) {
            throwError("COMMON-006");
          }

          const isDuplicate = category.items.some(
            (item) => item.name === itemName
          );
          if (isDuplicate) throwError("TEM-040"); // Tên item đã tồn tại

          category.items.push({ name: itemName, isCheck: false });
          break;

        case "update":
          if (!itemName) {
            throwError("COMMON-006");
          }
          const itemToUpdate = category.items.id(itemId);
          if (!itemToUpdate) throwError("TEM-041"); // Không tìm thấy item

          itemToUpdate.name = itemName;
          itemToUpdate.isCheck = isCheck;
          break;

        case "delete":
          const itemIndex = category.items.findIndex(
            (i) => i._id.toString() === itemId
          );
          if (itemIndex === -1) throwError("TEM-041"); // Không tìm thấy item

          category.items.splice(itemIndex, 1);
          break;

        default:
          throwError("TEM-044");
      }

      await pack.save();

      const tripAssistantCacheKey = `${CACHE_PREFIX}:${data.templateId}`;
      const currentCache = await getCache(tripAssistantCacheKey);

      if (currentCache) {
        currentCache.packs = pack;
        await setCache(tripAssistantCacheKey, currentCache);
      }
      return pack;
    } catch (error) {
      throwError(error.message);
    }
  },

  async getWeatherForecast(templateId) {
    try {
      await getWeatherForecastSchema.validate({ templateId });
      const template = await TemplateModel.findById(templateId)
        .select("to startDate endDate")
        .lean();

      const { startDate, endDate, to } = template;
      const days = caculateDays(startDate, endDate);

      const cacheKey = `weather_forecast:${to.destination}:${days}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      const response = await axios.get(
        `https://api.weatherapi.com/v1/forecast.json`,
        {
          params: {
            key: process.env.WEATHER_API_KEY,
            q: to.destination,
            days: days > 10 ? 10 : days,
            aqi: "no",
            alerts: "no",
          },
        }
      );

      await setCache(cacheKey, response.data);

      return {
        location: response.data.location,
        current: response.data.current,
        forecast: response.data.forecast,
      };
    } catch (error) {
      throwError(error.message);
    }
  },
};

module.exports = TripAsstitantService;

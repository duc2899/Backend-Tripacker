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
const {
  MAX_CALL_SUGGEST,
  MAX_CATEGORY_PER_TEMPLATE,
  MAX_ITEM_PER_CATEGORY,
} = require("../../config/constant");
const {
  CACHE_WEATHER_FORECAST,
  CACHE_TEMPLATE_TRIP_ASSTIANT,
} = require("../../config/cache");

const TripAsstitantService = {
  async getTripAsstitant(reqUser, templateId) {
    const { email, userId, fullName } = reqUser;

    // Try to get from cache first
    const cacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
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
      pack: {
        _id: template.pack._id,
        categories: template.pack.categories,
      },
      healthNotes: template.healthNotes,
      checklistSuggestions,
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
      const cacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
      const cachedData = await getCache(cacheKey);

      // Early return if we have cached data and no force update
      if (
        cachedData &&
        !forceUpdate &&
        template.countCallSuggest <= MAX_CALL_SUGGEST
      ) {
        return cachedData.pack || template.pack.categories;
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
        return cachedData?.pack || template.pack.categories;
      }

      const result = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(result)) {
        return cachedData?.pack || template.pack.categories;
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
        pack: {
          _id: pack._id,
          categories: result,
        },
      };
      await setCache(cacheKey, updatedCache);

      if (!firstCall) {
        await handleUpdateCountCallSuggest(template);
      }

      return result;
    } catch (error) {
      const cacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
      const cachedData = await getCache(cacheKey);
      return cachedData?.pack || [];
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

      const cacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
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
          format ngay la: MM/DD/YY
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
      const cacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
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
      const tripAssistantCacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
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
      const { categoryName, type, templateId, categoryId, packId } = data;

      const pack = await PackModel.findById(packId).lean();

      if (!pack) throwError("TEM-042");

      if (pack.categories.length >= MAX_CATEGORY_PER_TEMPLATE) {
        throwError("TEM-045");
      }

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
              _id: packId,
              "categories.category": { $ne: newCategory.category },
            },
            { $push: { categories: newCategory } },
            {
              new: true,
              runValidators: true,
            }
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
          const pack = await PackModel.findById(packId);

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
              _id: packId,
              "categories._id": categoryId, // ID của category con trong mảng
            },
            {
              $set: { "categories.$.category": categoryName }, // cập nhật category name
            },
            { new: true, runValidators: true }
          );

          result = updatedPack;
          break;
        case "delete":
          const deletedPack = await PackModel.findOneAndUpdate(
            { _id: packId },
            { $pull: { categories: { _id: categoryId } } },
            { new: true, runValidators: true }
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
      const tripAssistantCacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
      const currentCache = await getCache(tripAssistantCacheKey);

      if (currentCache) {
        currentCache.pack = {
          _id: result._id,
          categories: result.categories,
        };
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
      const {
        itemName,
        isCheck,
        type,
        templateId,
        categoryId,
        itemId,
        packId,
      } = data;

      const pack = await PackModel.findById(packId);
      if (!pack) throwError("TEM-042"); // Không tìm thấy pack

      const category = pack.categories.id(categoryId);

      if (!category) throwError("TEM-043"); // Không tìm thấy category

      if (category.items.length >= MAX_ITEM_PER_CATEGORY) {
        throwError("TEM-045");
      }

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
          if (!itemName && isCheck === undefined) {
            throwError("COMMON-006");
          }
          const itemToUpdate = category.items.id(itemId);
          if (!itemToUpdate) throwError("TEM-041"); // Không tìm thấy item
          if (itemName) {
            const isDuplicate = category.items.some(
              (item) => item.name === itemName
            );
            if (isDuplicate) throwError("TEM-040"); // Tên item đã tồn tại
            itemToUpdate.name = itemName;
          }
          if (isCheck !== undefined) {
            itemToUpdate.isCheck = isCheck;
          }
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

      const tripAssistantCacheKey = `${CACHE_TEMPLATE_TRIP_ASSTIANT}:${templateId}`;
      const currentCache = await getCache(tripAssistantCacheKey);

      if (currentCache) {
        currentCache.pack = {
          _id: pack._id,
          categories: pack.categories,
        };
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

      const cacheKey = `${CACHE_WEATHER_FORECAST}:${to.destination}:${days}`;
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

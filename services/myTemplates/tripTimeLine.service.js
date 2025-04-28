const axios = require("axios");
const mongoose = require("mongoose");

const TemplateModel = require("../../models/templatesModel");
const TripActivityModel = require("../../models/tripActivityModel");
const throwError = require("../../utils/throwError");
const { callAI } = require("../getSuggestAI");
const {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
  reOrderTripActivitySchema,
} = require("../../validators/tripActivity.validator");
const {
  updateTripTimeLineSchema,
  updateListMembersSchema,
  updateRoleSchema,
  middleCheckPermissionSchema,
  deleteMembersSchema,
  getSuggestAISchema,
} = require("../../validators/template.validator");
const {
  handleCaculatorDistance,
  handleCheckExitBackground,
  handleCheckExitTripType,
  handleCheckStartAndEndDate,
  handleUpdateListMembers,
} = require("../../logics/template.logic");

const { getCache, setCache } = require("../../utils/redisHelper");
const { MAX_CALL_SUGGEST } = require("../../config/constant");

const TripTimeLineService = {
  // ------------------------ Trip Time Line =====------------------ //
  async getTripTimeLine(reqUser, templateId) {
    const { email, userId, fullName } = reqUser;

    // Try to get from cache first
    const cacheKey = `trip_timeline:${templateId}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      // Kiểm tra xem user có trong listMembers không
      const member = cachedData.infor.listMembers.find(
        (member) => member.email && member.email === email
      );
      if (!member) {
        throwError("TEM-029", 403);
      }
      return cachedData;
    }

    const template = await TemplateModel.findById(templateId)
      .populate("owner tripType background")
      .select(
        "owner from to title startDate endDate budget tripType vihicle listMembers background description distanceKm isPublic members"
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
      await template.save();
    }

    const activities = await TripActivityModel.find({
      template: templateId,
    }).lean();

    const sortedActivities = () => {
      return activities.map((trip) => ({
        ...trip,
        activities: trip.activities?.sort((a, b) => {
          if (a.completed === b.completed) {
            return (a.order ?? 0) - (b.order ?? 0);
          }
          return a.completed ? 1 : -1;
        }),
      }));
    };

    const suggestActivity = await this.getSuggestActivityFromAI(reqUser, {
      templateId: templateId,
      forceUpdate: false,
    });

    const resulttData = {
      infor: {
        ...template.toObject(),
        owner: template.owner.email,
        tripType: template.tripType.name,
        background: template.background?.background?.url || null,
        role: member?.role,
      },
      tripActivities: sortedActivities(),
      suggestActivity: suggestActivity.activities,
    };

    // Cache the result for 1 hour
    await setCache(cacheKey, resulttData, 3600);

    return resulttData;
  },

  async updateTripTimeLine(reqUser, updateData) {
    try {
      // Kiểm tra template có tồn tại không
      const template = await TemplateModel.findById(
        updateData.templateId
      ).populate("background tripType");
      if (!template) {
        throwError("TEM-012");
      }
      // 2. Kiểm tra và validate dữ liệu
      await updateTripTimeLineSchema.validate(updateData);

      if (updateData?.to?.lat && updateData?.from?.lat) {
        template.distanceKm = handleCaculatorDistance(
          updateData.from,
          updateData.to
        );
        template.from = updateData.from;
        template.to = updateData.to;
      }

      if (updateData?.startDate && updateData?.endDate) {
        await handleCheckStartAndEndDate(
          updateData.startDate,
          updateData.endDate
        );
        template.startDate = updateData.startDate;
        template.endDate = updateData.endDate;
      }

      await handleCheckExitBackground(updateData.background);
      await handleCheckExitTripType(updateData.tripType);

      const fieldsToUpdate = [
        "tripType",
        "title",
        "background",
        "budget",
        "members",
        "vihicle",
        "startDate",
        "endDate",
        "from",
        "to",
        "description",
      ];

      fieldsToUpdate.forEach((key) => {
        if (updateData[key]) {
          template[key] = updateData[key];
        }
      });

      await template.save();
      const responseTemplate = await template.toObject();

      // Cập nhật cache
      const cacheKey = `trip_timeline:${updateData.templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData.infor = {
          ...cachedData.infor,
          ...responseTemplate,
          owner: template.owner.email,
          tripType: template.tripType.name,
          background: template.background?.background?.url || null,
        };
        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData;
    } catch (error) {
      throwError(error.message);
    }
  },

  async updateListMembers(data) {
    try {
      await updateListMembersSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId).select(
        "listMembers"
      );

      const newListMembers = await handleUpdateListMembers(
        data.listMembers,
        template.listMembers
      );

      template.listMembers = [...template.listMembers, ...newListMembers];
      await template.save();

      // Cập nhật cache
      const cacheKey = `trip_timeline:${data.templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData.infor.listMembers = template.listMembers;
        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData.infor.listMembers;
    } catch (error) {
      throwError(error);
    }
  },

  async updateRoleMember(data) {
    try {
      await updateRoleSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId).select(
        "listMembers"
      );

      const member = template.listMembers.find(
        (mem) => mem._id.toString() === data._id
      );
      if (!member) {
        throwError("COMMON-005");
      }
      member.role = data.role;
      await template.save();

      // Cập nhật cache
      const cacheKey = `trip_timeline:${data.templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        const memberIndex = cachedData.infor.listMembers.findIndex(
          (mem) => mem._id.toString() === data._id
        );
        if (memberIndex !== -1) {
          cachedData.infor.listMembers[memberIndex].role = data.role;
          await setCache(cacheKey, cachedData, 3600);
        }
      }

      return cachedData.infor.listMembers;
    } catch (error) {
      throwError(error);
    }
  },

  async deleteMembers(reqUser, data) {
    try {
      const { email } = reqUser;
      await deleteMembersSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId).select(
        "listMembers"
      );

      // Lọc ra các thành viên không nằm trong danh sách bị xoá
      template.listMembers = template.listMembers.filter((member) => {
        // Nếu member nằm trong danh sách cần xoá
        const shouldDelete = data.listMembers.includes(member._id.toString());

        // Nếu là chính mình thì không cho xoá
        if (shouldDelete && member.email === email) {
          throwError("TEM-030"); // Không thể tự xoá mình
        }

        // Giữ lại nếu không nằm trong danh sách xoá
        return !shouldDelete;
      });

      await template.save();

      // Cập nhật cache
      const cacheKey = `trip_timeline:${data.templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData.infor.listMembers = template.listMembers;
        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData.infor.listMembers;
    } catch (error) {
      throwError(error.message);
    }
  },

  async createActivity(data) {
    try {
      const { note, time, templateId, location, cost, type, date } = data;
      await createTripActivitySchema.validate(data);
      // Find the template
      const template = await TemplateModel.findById(templateId)
        .select("permissions startDate endDate")
        .lean();

      // Convert date strings to Date objects for comparison
      const startDate = new Date(template.startDate);
      const endDate = new Date(template.endDate);
      const activityDate = new Date(date);

      // Check if the activity date is within the template's start and end dates
      if (activityDate < startDate || activityDate > endDate) {
        throwError("AUTH-030");
      }

      // Create a new trip activity
      let tripActivity = await TripActivityModel.findOne({
        template: templateId,
        date,
      });

      if (!tripActivity) {
        tripActivity = new TripActivityModel({
          template: templateId,
          date,
          activities: [],
        });
      }

      const isAlreadyExitTime = tripActivity.activities.some(
        (activity) => activity.time === time
      );
      if (isAlreadyExitTime) {
        throwError("TEM-030");
      }

      let maxOrder = tripActivity.activities.reduce(
        (max, activity) => Math.max(max, activity.order ?? 0),
        0
      );
      maxOrder++;

      const newActivity = {
        note,
        time,
        location,
        cost,
        type,
        order: maxOrder,
      };

      tripActivity.activities.push(newActivity);
      await tripActivity.save();

      const result = tripActivity.toObject();
      result.activities = handelSortedActivities(result.activities);

      // Cập nhật cache
      const cacheKey = `trip_timeline:${templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        // Tìm hoặc tạo mới ngày trong tripActivities
        let dayActivity = cachedData.tripActivities.find(
          (trip) => trip.date === date
        );

        if (!dayActivity) {
          dayActivity = {
            _id: tripActivity._id,
            template: templateId,
            date,
            activities: [],
          };
          cachedData.tripActivities.push(dayActivity);
        }

        // Thêm activity mới vào ngày
        dayActivity.activities.push(newActivity);
        dayActivity.activities = handelSortedActivities(dayActivity.activities);

        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData.tripActivities;
    } catch (error) {
      throwError(error.message);
    }
  },

  async editActivity(data) {
    try {
      const { activityId, tripActivityId } = data;

      await editTripActivitySchema.validate(data);

      const tripActivity = await TripActivityModel.findById(tripActivityId);

      if (!tripActivity) {
        throwError("TEM-031");
      }

      const activityIndex = tripActivity.activities.findIndex(
        (activity) => activity._id.toString() === activityId
      );

      if (activityIndex === -1) {
        throwError("TEM-031");
      }

      const fields = ["note", "time", "location", "cost", "type", "completed"];

      fields.forEach((field) => {
        if (data[field] !== undefined) {
          tripActivity.activities[activityIndex][field] = data[field];
        }
      });

      await tripActivity.save();
      const result = tripActivity.toObject();
      result.activities = handelSortedActivities(result.activities);

      // Cập nhật cache
      const cacheKey = `trip_timeline:${tripActivity.template}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        // Tìm activity trong cache và cập nhật
        for (const dayActivity of cachedData.tripActivities) {
          const activityIndex = dayActivity.activities.findIndex(
            (activity) => activity._id.toString() === activityId
          );
          if (activityIndex !== -1) {
            fields.forEach((field) => {
              if (data[field] !== undefined) {
                dayActivity.activities[activityIndex][field] = data[field];
              }
            });
            dayActivity.activities = handelSortedActivities(
              dayActivity.activities
            );
            break;
          }
        }
        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData.tripActivities;
    } catch (error) {
      throwError(error);
    }
  },

  async reOrderActivity(data) {
    try {
      const { activities, tripActivityId } = data;

      await reOrderTripActivitySchema.validate(data);

      const tripActivity = await TripActivityModel.findOne({
        _id: tripActivityId,
      });

      activities.forEach(({ _id, order }) => {
        const act = tripActivity.activities.id(
          new mongoose.Types.ObjectId(_id)
        );
        if (act) {
          act.order = order;
        }
      });

      await tripActivity.save();
      const result = tripActivity.toObject();
      result.activities = handelSortedActivities(result.activities);

      // Cập nhật cache
      const cacheKey = `trip_timeline:${tripActivity.template}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        // Cập nhật order trong cache
        for (const dayActivity of cachedData.tripActivities) {
          activities.forEach(({ _id, order }) => {
            const activity = dayActivity.activities.find(
              (act) => act._id.toString() === _id
            );
            if (activity) {
              activity.order = order;
            }
          });
          dayActivity.activities = handelSortedActivities(
            dayActivity.activities
          );
        }
        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData.tripActivities;
    } catch (error) {
      throwError(error.message);
    }
  },

  async deleteActivity(data) {
    try {
      const { activityId, tripActivityId } = data;

      await deleteTripActivitySchema.validate(data);

      const tripActivity = await TripActivityModel.findById(tripActivityId);

      if (!tripActivity) {
        throwError("TEM-031");
      }

      const activityIndex = tripActivity.activities.findIndex(
        (activity) => activity._id.toString() === activityId
      );

      if (activityIndex === -1) {
        throwError("TEM-031");
      }

      tripActivity.activities.splice(activityIndex, 1);

      await tripActivity.save();

      const result = tripActivity.toObject();
      result.activities = handelSortedActivities(result.activities);

      // Cập nhật cache
      const cacheKey = `trip_timeline:${tripActivity.template}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        // Xóa activity trong cache
        for (const dayActivity of cachedData.tripActivities) {
          const activityIndex = dayActivity.activities.findIndex(
            (activity) => activity._id.toString() === activityId
          );
          if (activityIndex !== -1) {
            dayActivity.activities.splice(activityIndex, 1);
            dayActivity.activities = handelSortedActivities(
              dayActivity.activities
            );
            break;
          }
        }
        await setCache(cacheKey, cachedData, 3600);
      }

      return cachedData.tripActivities;
    } catch (error) {
      throwError(error);
    }
  },

  async middleCheckEditPermission(reqUser, templateId) {
    try {
      const { userId } = reqUser;

      await middleCheckPermissionSchema.validate(templateId);

      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();
      if (!template) {
        throwError("TEM-012");
      }
      if (!checkEditPermission(userId, template.listMembers, "edit")) {
        throwError("TEM-029");
      }
    } catch (error) {
      throwError(error.message);
    }
  },

  async getSuggestActivityFromAI(reqUser, data) {
    const { userId } = reqUser;
    const { templateId, forceUpdate } = data;

    await getSuggestAISchema.validate(data);

    const template = await TemplateModel.findOne({
      _id: templateId,
      owner: userId,
    }).populate("tripType");

    if (!template) {
      throwError("TEM-015");
    }

    // Kiểm tra qua ngày mới để reset count
    const now = new Date();
    const lastCallDate = template.lastCallSuggest
      ? new Date(template.lastCallSuggest).toDateString()
      : null;

    if (lastCallDate !== now.toDateString()) {
      template.countCallSuggest = 0;
      template.lastCallSuggest = now;
      await template.save();
    }

    const cacheKey = `ai_suggestions_timeLine:template:${templateId}`;

    // Thử lấy từ cache trước khi call AI (để có thể fallback sau này)
    const cachedData = await getCache(cacheKey);

    if (
      !forceUpdate ||
      forceUpdate !== "true" ||
      template.countCallSuggest > MAX_CALL_SUGGEST
    ) {
      if (cachedData) {
        return cachedData;
      }
    }

    try {
      const { to, startDate, endDate, budget, members, vihicle } = template;
      const tripType = template.tripType.name;

      const prompt = `
      Toi se di ${to.destination} tu ${startDate} den ${endDate}, ngan sach ${budget}đ cho ${members} nguoi.  
      Loai chuyen: ${tripType}, phuong tien: ${vihicle}.  
      Hay goi y 10 dia diem: Cac hoat dong/dia diem tham quan noi tieng phu hop.
      Tra ve JSON dung dinh dang sau: Trong locaiton tra ve lat, lon, name
      {
        "activities": [
          { "location": "", "description": "", "cost": 10VND }
        ],
      }
      `.trim();

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
        // Thử lấy từ cache nếu có
        if (cachedData) {
          return cachedData;
        }
        // Nếu không có cache, throw error
        result = {
          activities: [],
        };
      }

      const activitiesWithImages = await Promise.all(
        lastValidJSON.activities.map(async (activity) => {
          try {
            const images = await searchImagesByLocation(activity.location.name);
            return {
              ...activity,
              image: images[0] || null,
            };
          } catch (err) {
            console.error(
              `Lỗi khi tìm ảnh cho ${activity.location}:`,
              err.message
            );
            return {
              ...activity,
              image: null,
            };
          }
        })
      );

      const result = {
        activities: activitiesWithImages,
      };

      template.countCallSuggest++;
      template.lastCallSuggest = now;
      await template.save();

      await setCache(cacheKey, result);
      return result;
    } catch (error) {
      if (cachedData) {
        return cachedData;
      }
      result = {
        activities: [],
      };
    }
  },
};

const checkEditPermission = (userId, permissions, role) => {
  const hasEditPermission = permissions.some(
    (permission) =>
      permission.user &&
      permission.user.toString() === userId &&
      permission.role === role
  );

  return hasEditPermission;
};

const searchImagesByLocation = async (location) => {
  const response = await axios.get(
    "https://www.googleapis.com/customsearch/v1",
    {
      params: {
        key: "AIzaSyCu6nKAdOInwMCqj31SYGW5ba2bPsFX-Vs",
        cx: "60d157b69ec4a4aee",
        q: location,
        searchType: "image",
        fileType: "webp", // Bắt buộc để tìm ảnh
        num: 3,
        imgSize: "large",
      },
    }
  );

  const images = response.data.items.map((item) => item.link);
  return images;
};

const handelSortedActivities = (activities) => {
  return activities?.sort((a, b) => {
    // Nếu cả 2 đều completed hoặc chưa completed thì sắp xếp theo order
    if (a.completed === b.completed) {
      return (a.order ?? 0) - (b.order ?? 0);
    }
    // Đẩy completed xuống cuối
    return a.completed ? 1 : -1;
  });
};

module.exports = TripTimeLineService;

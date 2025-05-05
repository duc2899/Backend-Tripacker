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
  handleResetCountCallSuggest,
  handleUpdateCountCallSuggest,
  handleGetListMembers,
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

    if (cachedData?.infor) {
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
      .populate("owner", "avatar")
      .populate("tripType")
      .populate("listMembers.user", "avatar")
      .populate("background")
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

    const suggestActivity = await this.getSuggestActivityFromAI({
      templateId: templateId,
      forceUpdate: true,
    });

    const listMembers = handleGetListMembers(template, true);

    const resulttData = {
      infor: {
        ...template.toObject(),
        owner: template.owner.email,
        tripType: template.tripType.name,
        background: template.background?.background?.url || null,
        role: member?.role,
        listMembers: listMembers,
      },
      tripActivities: sortedActivities(),
      suggestActivity: suggestActivity.activities,
    };

    await setCache(cacheKey, resulttData);

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
      let cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData.infor = {
          ...cachedData.infor,
          ...responseTemplate,
          owner: template.owner.email,
          tripType: template.tripType.name,
          background: template.background?.background?.url || null,
        };
        await setCache(cacheKey, cachedData);
        return cachedData;
      } else {
        // Nếu chưa có cache, tạo mới cache từ dữ liệu vừa update
        const newCache = {
          infor: {
            ...responseTemplate,
            owner: template.owner.email,
            tripType: template.tripType.name,
            background: template.background?.background?.url || null,
          },
          // Có thể bổ sung các trường khác nếu cần
        };
        await setCache(cacheKey, newCache);
        return newCache;
      }
    } catch (error) {
      throwError(error.message);
    }
  },

  async updateListMembers(data) {
    try {
      await updateListMembersSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId)
        .populate({
          path: "listMembers.user",
          select: "avatar",
        })
        .select("listMembers");

      const newListMembers = await handleUpdateListMembers(
        data.listMembers,
        template.listMembers
      );

      template.listMembers = [...template.listMembers, ...newListMembers];
      await template.save();

      // Cập nhật cache
      const cacheKey = `trip_timeline:${data.templateId}`;

      const listMembers = handleGetListMembers(template, true);

      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData.infor.listMembers = listMembers;
        await setCache(cacheKey, cachedData);
      }

      return listMembers;
    } catch (error) {
      throwError(error);
    }
  },

  async updateRoleMember(data) {
    try {
      await updateRoleSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId)
        .populate({
          path: "listMembers.user",
          select: "avatar",
        })
        .select("listMembers");

      const member = template.listMembers.find(
        (mem) => mem._id.toString() === data._id
      );
      if (!member) {
        throwError("COMMON-005");
      }
      member.role = data.role;
      await template.save();

      const listMembers = handleGetListMembers(template, true);
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

      return listMembers;
    } catch (error) {
      throwError(error);
    }
  },

  async deleteMembers(reqUser, data) {
    try {
      const { email } = reqUser;
      await deleteMembersSchema.validate(data);

      const template = await TemplateModel.findById(data.templateId)
        .populate({
          path: "listMembers.user",
          select: "avatar",
        })
        .select("listMembers");

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

      const listMembers = handleGetListMembers(template, true);
      // Cập nhật cache
      const cacheKey = `trip_timeline:${data.templateId}`;
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        cachedData.infor.listMembers = listMembers;
        await setCache(cacheKey, cachedData, 3600);
      }

      return listMembers;
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
        throwError("COMMON-007");
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

        await setCache(cacheKey, cachedData);
      }

      return tripActivity.activities;
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

      return tripActivity.activities;
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

      return tripActivity.activities;
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

      return tripActivity.activities;
    } catch (error) {
      throwError(error);
    }
  },

  async middleCheckPermission(reqUser, templateId, roles) {
    try {
      const { userId } = reqUser;

      await middleCheckPermissionSchema.validate(templateId);

      const template = await TemplateModel.findById(templateId)
        .select("listMembers")
        .lean();
      if (!template) {
        throwError("TEM-012");
      }

      if (!checkPermission(userId, template.listMembers, roles)) {
        throwError("TEM-029");
      }
    } catch (error) {
      throwError(error.message);
    }
  },

  async getSuggestActivityFromAI(data, firstCall = false) {
    const { templateId, forceUpdate } = data;

    // Validate data first
    try {
      await getSuggestAISchema.validate(data);
    } catch (error) {
      throwError(error.message);
    }

    try {
      const template = await TemplateModel.findById(templateId).populate(
        "tripType"
      );

      if (!template) {
        throwError("TEM-015");
      }

      await handleResetCountCallSuggest(template);

      const cacheKey = `trip_timeline:${templateId}`;
      const cachedData = await getCache(cacheKey);

      if (forceUpdate === "false") {
        return cachedData?.suggestActivity || { activities: [] };
      }

      if (
        forceUpdate === "true" &&
        cachedData &&
        template.countCallSuggest >= MAX_CALL_SUGGEST
      ) {
        return cachedData.suggestActivity || { activities: [] };
      }

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
        return cachedData?.suggestActivity || { activities: [] };
      }

      // Process activities with images
      const activitiesWithImages = await Promise.all(
        lastValidJSON.activities.map(async (activity) => {
          const images = await searchImagesByLocation(activity.location.name);
          return {
            ...activity,
            image: images[0] || null,
          };
        })
      );

      const result = {
        activities: activitiesWithImages,
      };

      // Only update count if not first call
      if (!firstCall) {
        await handleUpdateCountCallSuggest(template);
      }

      // Update cache
      const updatedCache = {
        ...cachedData,
        suggestActivity: result,
      };
      await setCache(cacheKey, updatedCache);

      return result;
    } catch (error) {
      // Handle other errors (database, AI, etc.)
      console.error("Error in getSuggestActivityFromAI:", error);
      const cacheKey = `trip_timeline:${templateId}`;
      const cachedData = await getCache(cacheKey);
      return cachedData?.suggestActivity || { activities: [] };
    }
  },
};

const checkPermission = (userId, permissions, roles) => {
  const hasPermission = permissions.some(
    (permission) =>
      permission.user &&
      permission.user.toString() === userId &&
      roles.includes(permission.role)
  );

  return hasPermission;
};

let retryCount = 0;
const maxRetries = 3;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const searchImagesByLocation = async (location) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/customsearch/v1",
      {
        params: {
          key: "AIzaSyAmogaot9ydugb4pB_TBmZwM0kS13cv9NM",
          cx: "60d157b69ec4a4aee",
          q: location,
          searchType: "image",
          fileType: "webp", // Bắt buộc để tìm ảnh
          num: 3,
          imgSize: "large",
        },
      }
    );
    retryCount = 0; // Reset nếu thành công
    return response.data.items.map((item) => item.link);
  } catch (error) {
    if (error.response?.status === 429 && retryCount < maxRetries) {
      retryCount++;
      await delay(2000 * retryCount); // Chờ tăng dần (2s, 4s, 6s...)
      return searchImagesByLocation(location); // Retry
    }
    throw error; // Nếu vẫn lỗi sau maxRetries
  }
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

const axios = require("axios");

const TemplateModel = require("../models/templatesModel");
const TripActivityModel = require("../models/tripActivityModel");
const throwError = require("../utils/throwError");
const { callAI } = require("./getSuggestAI");
const {
  createTripActivitySchema,
  editTripActivitySchema,
  deleteTripActivitySchema,
} = require("../validators/tripActivity.validator");
const {
  validateUpdateTripTimeLine,
  updateListMembersSchema,
  updateRoleSchema,
  middleCheckPermissionSchema,
  deleteMembersSchema,
} = require("../validators/template.validator");
const {
  handleCaculatorDistance,
  handleCheckExitBackground,
  handleCheckExitTripType,
  handleCheckStartAndEndDate,
  handleUpdateListMembers,
} = require("../logics/template.logic");

const MyTemplateService = {
  async getTripTimeLine(reqUser, templateId) {
    const { email, userId, fullName } = reqUser;

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
      await template.save(); // Save luôn thay vì gọi lại findById
    }

    const activities = await TripActivityModel.find({
      tepmplate: templateId,
    }).lean();

    const resulttData = {
      infor: {
        ...template.toObject(),
        owner: template.owner.email,
        tripType: template.tripType.name,
        background: template.background.background,
        role: member?.role,
      },
      tripActivities: activities,
      memberTaks: [],
    };

    return resulttData;
  },

  async updateTripTimeLine(reqUser, updateData) {
    // Kiểm tra template có tồn tại không
    const template = await TemplateModel.findById(updateData.templateId);

    // 2. Kiểm tra và validate dữ liệu
    await validateUpdateTripTimeLine(updateData);

    if (updateData.to.lat && updateData.from.lat) {
      template.distanceKm = handleCaculatorDistance(
        updateData.from,
        updateData.to
      );
      template.from = updateData.from;
      template.to = updateData.to;
    }

    if (updateData.startDate && updateData.endDate) {
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
      "location",
      "background",
      "budget",
      "tripType",
      "members",
      "vihicle",
      "healthNotes",
      "description",
    ];

    fieldsToUpdate.forEach((key) => {
      if (updateData[key]) {
        template[key] = updateData[key];
      }
    });
    await template.save();
    const responseTemplate = await template.toObject();

    return { template: responseTemplate };
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
      return template.toObject();
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
      return template.toObject();
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
      return template.toObject();
    } catch (error) {
      throwError(error.message);
    }
  },

  async createActivity(data) {
    try {
      const { title, time, templateId, icon, location, cost, type, date } =
        data;
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
        tepmplate: templateId,
        date,
      });

      if (!tripActivity) {
        tripActivity = new TripActivityModel({
          tepmplate: templateId,
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
      tripActivity.activities.push({
        title,
        time,
        location,
        cost,
        type,
        icon,
      });

      const newActivity = tripActivity;
      // Save the activity
      await newActivity.save();

      return newActivity;
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

      const oldActivity = tripActivity.activities[activityIndex];
      const fields = ["title", "time", "location", "cost", "type", "icon"];

      const updatedActivity = { _id: activityId };

      fields.forEach((field) => {
        updatedActivity[field] =
          req.body[field] !== undefined ? req.body[field] : oldActivity[field];
      });

      tripActivity.activities[activityIndex] = updatedActivity;
      await tripActivity.save();

      return tripActivity;
    } catch (error) {
      throwError(error);
    }
  },

  async deleteActivity(data) {
    try {
      const { activityId, tripActivityId } = data;
      await deleteTripActivitySchema(data);

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
    } catch (error) {
      throwError(error);
    }
  },

  async middleCheckEditPermission(reqUser, templateId) {
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
  },

  async getSuggestActivityFromAI(req) {
    const { userId } = req.user;
    const { templateId } = req.params;
    const template = await TemplateModel.findOne({
      _id: templateId,
      owner: userId,
    })
      .populate("tripType")
      .lean();

    if (!template) {
      throwError("TEM-015");
    }

    const { to, startDate, endDate, budget, members, vihicle } = template;
    const tripType = template.tripType.name;

    const prompt = `
    Toi se di ${to.destination} tu ${startDate} den ${endDate}, ngan sach ${budget}đ cho ${members} nguoi.  
    Loai chuyen: ${tripType}, phuong tien: ${vihicle}.  
    Hay goi y 10 dia diem: Cac hoat dong/dia diem tham quan noi tieng phu hop.
    Tra ve JSON dung dinh dang sau:
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
      throwError("AI-002", 500, "FAILED_TO_PARSE_AI_JSON");
    }

    // Tìm ảnh cho từng location
    const activitiesWithImages = await Promise.all(
      lastValidJSON.activities.map(async (activity) => {
        try {
          const images = await searchImagesByLocation(activity.location);
          return {
            ...activity,
            image: images[0] || null, // lấy 1 ảnh đầu tiên
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

    return {
      activities: activitiesWithImages,
    };
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

module.exports = MyTemplateService;

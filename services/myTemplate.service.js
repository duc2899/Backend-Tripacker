const axios = require("axios");

const PackModel = require("../models/packModel");
const TemplateModel = require("../models/templatesModel");
const DefaultItemModel = require("../models/defaultItemsModel");
const TripActivityModel = require("../models/tripActivityModel");
const MemberTasksModel = require("../models/memberTasksModel");
const TripTypeModel = require("../models/tripTypeModel");
const throwError = require("../utils/throwError");
const { sanitizeAndValidate } = require("../utils");
const { callAI } = require("./getSuggestAI");
const { isValidEmail } = require("../utils/validateEmail");
const UserModel = require("../models/userModel");
const {
  validateCreatedTripActivity,
  validateEditTripActivity,
  validateDeleteTripActivity,
} = require("../validators/tripActivity.validator");
const {
  validateUpdateTripTimeLine,
} = require("../validators/template.validator");
const {
  handleListMembersUpdate,
  handleCaculatorDistance,
  handleCheckExitBackground,
  handleCheckExitTripType,
} = require("../validators/logic/template.logic");

const MyTemplateService = {
  async getTripTimeLine(req) {
    const { userId } = req.user;
    const { templateId } = req.params;

    const template = await TemplateModel.findById(templateId)
      .populate("owner tripType background")
      .select(
        "owner from to title startDate endDate budget tripType vihicle listMembers background description distanceKm isPublic"
      )
      .lean();

    const hasPermission = template.listMembers.some(
      (permission) => permission.user && permission.user.toString() === userId
    );

    if (!template) {
      throwError("TEM-012");
    }

    if (!hasPermission) {
      throwError("TEM-029");
    }

    const activities = await TripActivityModel.find({
      tepmplate: templateId,
    }).lean();

    const resulttData = {
      infor: {},
      tripActivities: [],
      memberTaks: [],
    };

    // --------------- Get Infor ----------------
    resulttData.infor = {
      ...template,
      owner: template.owner.email,
      tripType: template.tripType.name,
      background: template.background.background,
    };

    // ----------------- Get tripActivities ---------------
    resulttData.tripActivities = activities;
    return resulttData;
    // -------------------- Get memberTaks -----------------
  },

  async updateTripTimeLine(req) {
    const { email } = req.user;
    const { templateId } = req.body;
    // Kiểm tra template có tồn tại không
    const template = await TemplateModel.findById(templateId);
    const updateData = req.body;

    // 2. Kiểm tra và validate dữ liệu
    await validateUpdateTripTimeLine(updateData);

    // 3. Xử lý listMembers (nếu có)
    let membersToAdd = [];
    if (updateData.listMembers) {
      membersToAdd = await handleListMembersUpdate(
        updateData.listMembers,
        template.listMembers,
        email
      );
      template.listMembers = template.listMembers.concat(membersToAdd);
    }

    if (updateData.to && updateData.from) {
      template.distanceKm = handleCaculatorDistance(
        updateData.from,
        updateData.to
      );
    }

    await handleCheckExitBackground(updateData.background);
    await handleCheckExitTripType(updateData.tripType);

    const fieldsToUpdate = [
      "tripType",
      "title",
      "location",
      "startDate",
      "endDate",
      "budget",
      "members",
      "vihicle",
      "healthNotes",
      "description",
      "from",
      "to",
    ];

    fieldsToUpdate.forEach((key) => {
      if (updateData[key]) {
        template[key] = updateData[key];
      }
    });
    return template;
    await template.save();
    const responseTemplate = await template.toObject();

    return { template: responseTemplate };
  },

  async createActivity(req) {
    const { title, time, templateId, icon, location, cost, type, date } =
      req.body;
    await validateCreatedTripActivity(req.body);
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
  },

  async editActivity(req) {
    const { activityId, tripActivityId } = req.body;
    await validateEditTripActivity(req.body);
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
  },

  async deleteActivity(req) {
    const { activityId, tripActivityId } = req.body;
    await validateDeleteTripActivity(req.body);

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
  },

  async middleCheckEditPermission(req, next) {
    const { userId } = req.user;
    const { templateId } = sanitizeAndValidate(
      req.body,
      ["templateId"],
      {
        trim: true,
        removeNull: false,
      },
      {
        templateId: "string",
      }
    );

    const template = await TemplateModel.findById(templateId)
      .select("listMembers")
      .lean();
    if (!template) {
      throwError("TEM-012");
    }
    if (!checkEditPermission(userId, template.listMembers, "edit")) {
      throwError("TEM-029");
    }
    next();
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

  async addMembers(req) {
    const { listMembers, templateId } = sanitizeAndValidate(
      req.body,
      ["listMembers", "templateId"],
      {
        trim: true,
        removeNull: true,
      },
      {
        listMembers: "object",
        templateId: "string",
      }
    );

    const template = await TemplateModel.findById(templateId).select(
      "listMembers"
    );

    const existingEmails = new Set(template.listMembers.map((m) => m.email));
    const newEmails = listMembers.map((m) => m.email);

    // Kiểm tra duplicate trong list gửi lên
    const newEmailSet = new Set(newEmails);
    if (newEmails.length !== newEmailSet.size) throwError("TEM-023"); // Trùng trong request

    // Kiểm tra email hợp lệ và có bị trùng không
    const invalidEmails = newEmails.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) throwError("TEM-024");

    const duplicatedEmails = newEmails.filter((email) =>
      existingEmails.has(email)
    );
    if (duplicatedEmails.length > 0) throwError("TEM-023");

    // Thêm vào template
    template.listMembers.push(...listMembers);
    await template.save({ validateModifiedOnly: true });

    // Trả về list member mới nhất
    return (
      await TemplateModel.findById(templateId).select("listMembers").lean()
    ).listMembers;
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

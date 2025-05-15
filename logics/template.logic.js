const haversine = require("haversine-distance");

const UserModel = require("../models/userModel");
const BackgroundTemplateModel = require("../models/backgroundTemplateModel");
const throwError = require("../utils/throwError");
const TripTypeModel = require("../models/tripTypeModel");

/**
 * Tạo danh sách thành viên từ listMembers gửi lên + thêm người tạo (owner)
 * @param {Array} listMembers - Danh sách thành viên từ FE [{ email, name }]
 * @param {String} creatorEmail - Email người tạo
 * @param {String} creatorName - Tên người tạo
 * @param {String} creatorUserId - ID user của người tạo
 * @returns {Array} Danh sách thành viên đã chuẩn hoá
 */
const handleCreateListMembers = async (
  listMembers = [],
  creatorEmail,
  creatorName,
  creatorUserId
) => {
  // Bỏ người tạo ra khỏi listMembers gửi lên nếu có
  const filteredListMembers = listMembers.filter(
    (member) => member.email !== creatorEmail
  );

  // Check trùng email trong request
  const emailSet = new Set();
  for (const member of filteredListMembers) {
    if (member.email && emailSet.has(member.email)) {
      throwError("TEM-023"); // Trùng email trong listMembers
    }
    if (member.email) {
      emailSet.add(member.email);
    }
  }

  // Tìm các user đã đăng ký
  const existingUsers = await UserModel.find({
    email: { $in: filteredListMembers.map((m) => m.email) },
  }).select("_id email");

  const emailToUserMap = new Map();
  existingUsers.forEach((user) => {
    emailToUserMap.set(user.email, user._id);
  });

  // Chuẩn hoá listMembers
  const members = filteredListMembers.map((member) => {
    const matchedUserId = emailToUserMap.get(member.email) || null;
    return {
      email: member.email,
      name: member.name,
      user: matchedUserId,
      isRegistered: !!matchedUserId,
      role: "view",
    };
  });

  // Thêm người tạo vào list
  members.push({
    email: creatorEmail,
    name: creatorName,
    user: creatorUserId,
    isRegistered: true,
    role: "edit",
  });

  return members;
};

/**
 * Cập nhật danh sách thành viên từ listMembers gửi lên
 * @param {Array} listMembers - Danh sách thành viên từ FE [{ email, name }]
 * @param {Array} existingListMembers - Danh sách thành viên đã có trong DB
 * @returns {Array} Danh sách thành viên chuẩn hoá để thêm vào
 */
const handleUpdateListMembers = async (
  listMembers = [],
  existingListMembers = []
) => {
  // Check nếu có email trong list mới đã tồn tại trong list cũ -> throw lỗi
  const existingEmails = new Set(existingListMembers.map((m) => m.email));
  const hasDuplicate = listMembers.some((m) => existingEmails.has(m.email));
  if (hasDuplicate) {
    throwError("TEM-023"); // Email đã tồn tại
  }

  // Tìm user đã đăng ký
  const existingUsers = await UserModel.find({
    email: { $in: listMembers.map((m) => m.email) },
  }).select("_id email");

  const emailToUserMap = new Map();
  existingUsers.forEach((user) => {
    emailToUserMap.set(user.email, user._id);
  });

  // Chuẩn hoá listMembers với thông tin user nếu có
  const members = listMembers.map((member) => {
    const matchedUserId = emailToUserMap.get(member.email) || null;
    return {
      email: member.email,
      name: member.name,
      user: matchedUserId,
      isRegistered: !!matchedUserId,
      role: member.role,
    };
  });

  return members;
};

/**
 * Check background exit không ?
 * @param {String} background - Id Background
 * @returns {void}
 */
const handleCheckExitBackground = async (background) => {
  if (!background) return;
  const backgroundTemplate = await BackgroundTemplateModel.exists({
    _id: background,
  });
  if (!backgroundTemplate) {
    throwError("TEM-025");
  }
};
/**
 * Check triptype exit không ?
 * @param {String} tripType - Id tripType
 * @returns {void}
 */
const handleCheckExitTripType = async (tripType) => {
  if (!tripType) return;
  const tripTypeTemplate = await TripTypeModel.exists({ _id: tripType });
  if (!tripTypeTemplate) {
    throwError("TEM-026");
  }
};

/**
 * Tính toán khoảng cách hai vị trí
 * @param {Object} from - Tọa độ
 * @param {Object} to - Tọa độ
 * @returns {number}
 */
const handleCaculatorDistance = (from, to) => {
  return haversine(
    { latitude: from.lat, longitude: from.lon },
    { latitude: to.lat, longitude: to.lon }
  );
};

/**
 * Tính toán ngày đến và ngày về có hợp lệ không
 * @param {string} startDate - Tọa độ
 * @param {string} endDate - Tọa độ
 * @returns {void}
 */
const handleCheckStartAndEndDate = (startDate, endDate) => {
  const [sM, sD, sY] = startDate.split("/");
  const [eM, eD, eY] = endDate.split("/");

  const start = new Date(`${sY}-${sM}-${sD}`);
  const end = new Date(`${eY}-${eM}-${eD}`);

  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  if (start < vnNow) {
    throw throwError("TEM-021");
  }
  if (start > end) {
    throw throwError("TEM-022");
  }
};

const handleResetCountCallSuggest = async (template) => {
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
};

/**
 * Cập nhật số lần gọi API suggest
 * @param {Object} template - Template
 * @returns {void}
 */
const handleUpdateCountCallSuggest = async (template) => {
  template.countCallSuggest = (template.countCallSuggest || 0) + 1;
  template.lastCallSuggest = new Date();
  await template.save();
};

/**
 * Lấy danh sách thành viên và avatar
 * @param {Object} template - Template
 * @param {Boolean} isFlatten - Nếu true thì sẽ flatten danh sách thành viên
 * @returns {Array} Danh sách thành viên và avatar
 */
const handleGetListMembers = (template, isFlatten = false) => {
  const listMembers = template.listMembers.map((member) => ({
    ...(isFlatten ? member.toObject() : member),
    avatar: member.user?.avatar?.url || null,
    user: undefined, // Remove the nested user object
  }));
  return listMembers;
};

const caculateDays = (startDate, endDate) => {
  const [sM, sD, sY] = startDate.split("/");
  const [eM, eD, eY] = endDate.split("/");

  const start = new Date(`${sY}-${sM}-${sD}`);
  const end = new Date(`${eY}-${eM}-${eD}`);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Add 1 to include both days
  return diffDays;
};

/**
 * @param {Array} activities
 * @returns {Array}
 */
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

module.exports = {
  handleUpdateListMembers,
  handleCheckExitBackground,
  handleCheckExitTripType,
  handleCaculatorDistance,
  handleCheckStartAndEndDate,
  handleCreateListMembers,
  handleResetCountCallSuggest,
  handleUpdateCountCallSuggest,
  handleGetListMembers,
  caculateDays,
  handelSortedActivities,
};

const haversine = require("haversine-distance");

const UserModel = require("../../models/userModel");
const BackgroundTemplateModel = require("../../models/backgroundTemplateModel");
const throwError = require("../../utils/throwError");
const TripTypeModel = require("../../models/tripTypeModel");

/**
 * Tạo danh sách thành viên từ listMembers gửi lên + thêm người tạo (owner)
 * @param {Array} listMembers - Danh sách thành viên từ FE [{ email, name }]
 * @param {Array} existingList - Danh sách thành viên đã tồn tại trong DB
 * @param {String} currentUserEmail - Email người tạo
 * @returns {Array} Danh sách thành viên đã chuẩn hoá
 */
const handleListMembersUpdate = async (
  listMembers,
  existingList,
  currentUserEmail
) => {
  // Bỏ email người tạo
  const filtered = listMembers.filter((m) => m.email !== currentUserEmail);

  // Check trùng trong request
  const emailSet = new Set();
  for (const m of filtered) {
    if (emailSet.has(m.email)) throwError("TEM-023");
    emailSet.add(m.email);
  }

  // Check trùng với DB
  const existingEmails = new Set(existingList.map((m) => m.email));
  for (const m of filtered) {
    if (existingEmails.has(m.email)) throwError("TEM-023");
  }

  // Tìm user trong hệ thống
  const existingUsers = await UserModel.find({
    email: { $in: filtered.map((m) => m.email) },
  }).select("_id email");

  const emailToUserMap = new Map();
  existingUsers.forEach((user) => emailToUserMap.set(user.email, user._id));

  return filtered.map((m) => ({
    email: m.email,
    name: m.name,
    user: emailToUserMap.get(m.email) || null,
    isRegistered: !!emailToUserMap.get(m.email),
    role: "view",
  }));
};

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
    if (emailSet.has(member.email)) {
      throwError("TEM-023"); // Trùng email trong listMembers
    }
    emailSet.add(member.email);
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
 * Check background exit không ?
 * @param {String} background - Id Background
 * @returns {void}
 */
const handleCheckExitBackground = async (background) => {
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
  // Kiểm tra tripType có tồn tại trong model không
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
  return (
    haversine(
      { lat: from.lat, longitude: from.lon },
      { latitude: to.lat, longitude: to.lon }
    ) / 1000
  );
};

module.exports = {
  handleListMembersUpdate,
  handleCreateListMembers,
  handleCheckExitBackground,
  handleCheckExitTripType,
  handleCaculatorDistance,
};

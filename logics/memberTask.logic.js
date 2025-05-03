const MemberTaskModel = require("../models/memberTasksModel");
/**
 * Kiểm tra xem userId có tồn tại trong memberList không
 * @param {String} userId - ID user cần kiểm tra
 * @param {Array} memberList - Danh sách thành viên
 * @returns {Boolean} true nếu tồn tại, false nếu không tồn tại
 */
const handelCheckExitUserInTask = (userId, memberList) => {
  return memberList.some((member) => member.user.toString() === userId);
};

/**
 * Tính toán vị trí (position) mới cho task
 * @param {string} templateId - ID của template
 * @param {ClientSession} [session] - MongoDB session (optional, dùng cho transaction)
 * @param {string} [status='InProgress'] - Trạng thái của task (column)
 * @returns {Promise<number>} - Position mới
 */
const calculateNewPosition = async (
  templateId,
  session = null,
  status = "InProgress"
) => {
  const options = session ? { session } : {};

  // Lấy toàn bộ memberTasks của template
  const taskDoc = await MemberTaskModel.findOne(
    {
      template: templateId,
    },
    { memberTasks: 1 }
  )
    .select("memberTasks")
    .lean()
    .setOptions(options);

  if (!taskDoc || !taskDoc.memberTasks || taskDoc.memberTasks.length === 0) {
    return 0;
  }

  // Lọc các task theo status và lấy position nhỏ nhất
  const filtered = taskDoc.memberTasks.filter((mt) => mt.status === status);
  if (filtered.length === 0) return 0;
  const minPosition = Math.min(...filtered.map((mt) => mt.position || 0));
  return minPosition - 1;
};

module.exports = { handelCheckExitUserInTask, calculateNewPosition };

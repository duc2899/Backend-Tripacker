const { deleteAllCache } = require("../utils/redisHelper");

const AdminService = {
  async clearCache() {
    await deleteAllCache();
  },
};

module.exports = AdminService;

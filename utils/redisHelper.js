const redis = require("../config/redis"); // Import file config Redis của bạn

// Set cache với thời gian hết hạn (TTL)
async function setCache(key, value, ttl = 3600) {
  try {
    if (ttl) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await redis.setex(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    console.error("Redis setCache error:", error);
    return false;
  }
}

// Get cache
async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Redis getCache error:", error);
    return null;
  }
}

// Xóa cache
async function deleteCache(key) {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("Redis deleteCache error:", error);
    return false;
  }
}

module.exports = {
  setCache,
  getCache,
  deleteCache,
};

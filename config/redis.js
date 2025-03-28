const Redis = require("ioredis");
require("dotenv").config(); // Load biến môi trường từ .env

const redis = new Redis({
  host: "localhost" || "redis",
  port: process.env.REDIS_PORT || 6379,
  reconnectOnError: (err) => {
    console.log("Reconnect on error:", err.message);
    // Chỉ reconnect với một số lỗi cụ thể
    const targetErrors = ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"];
    return targetErrors.some((code) => err.message.includes(code));
  },
  retryStrategy: (times) => {
    if (times > 10) {
      console.log("Max retries reached. Giving up.");
      return null; // Dừng retry
    }
    return Math.min(times * 200, 5000); // Tăng dần thời gian chờ
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

redis.on("connect", () => {
  console.log("Connected to Redis");
});

module.exports = redis; // Xuất đối tượng Redis để dùng ở file khác

const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many requests",
  skip: (req) => req.ip === "127.0.0.1", // Bỏ qua localhost
  handler: (req, res) => {
    // Custom response
    res.status(429).json({
      error: "Quá nhiều request",
      retryAfter: "15 phút",
    });
  },
  headers: true, // Thêm headers X-RateLimit-*
});

module.exports = rateLimiter;

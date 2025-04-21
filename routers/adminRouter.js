const router = require("express").Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");

// Auth routes
router.delete("/clearCache", authMiddleware(true), adminController.clearCache);

module.exports = router;

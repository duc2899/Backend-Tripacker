const router = require("express").Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
// Auth routes
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/resetPassword", authController.resetPassword);
router.post("/changePassword", authMiddleware(), authController.changePassword);
router.post("/logout", authMiddleware(), authController.logout);

module.exports = router;

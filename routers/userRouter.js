const router = require("express").Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/upload");

router.get(
  "/userInformation",
  authMiddleware(),
  userController.getUserInformation
);
router.get("/templateOwner", authMiddleware(), userController.getTemplateOwner);
router.post("/update", authMiddleware(), userController.updateUser);
router.post(
  "/updateAvatar",
  authMiddleware(),
  upload.single("avatar"),
  userController.upateAvatar
);
router.post("/deleteTemplate", authMiddleware(), userController.deleteTemplate);

module.exports = router;

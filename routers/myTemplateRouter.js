const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const myTemplateController = require("../controllers/myTemplateController");

router.get(
  "/getTripTimeLine/:templateId",
  authMiddleware,
  myTemplateController.getTripTimeLine
);

router.post(
  "/createActivity",
  authMiddleware,
  myTemplateController.checkPermission,
  myTemplateController.createActivity
);
router.get(
  "/getSuggestActivity/:templateId",
  authMiddleware,
  myTemplateController.getSuggestActivity
);
router.post(
  "/editActivity",
  authMiddleware,
  myTemplateController.checkPermission,
  myTemplateController.editActivity
);

router.post(
  "/deleteActivity",
  authMiddleware,
  myTemplateController.checkPermission,
  myTemplateController.deleteActivity
);

router.post(
  "/addMembers",
  authMiddleware,
  myTemplateController.checkPermission,
  myTemplateController.addMembers
);

module.exports = router;

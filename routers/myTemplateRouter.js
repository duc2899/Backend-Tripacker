const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const myTemplateController = require("../controllers/myTemplateController");

router.get(
  "/getTripTimeLine/:templateId",
  authMiddleware(),
  myTemplateController.getTripTimeLine
);

router.post(
  "/updateTripTimeLine",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.updateTripTimeLine
);

router.post(
  "/updateListMembers",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.updateListMembers
);

router.post(
  "/updateRoleMember",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.updateRoleMember
);

router.post(
  "/deleteMembers",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.deleteMembers
);

router.post(
  "/createActivity",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.createActivity
);

router.post(
  "/reOrderActivity",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.reOrderActivity
);

router.get(
  "/getSuggestActivity",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.getSuggestActivity
);

router.post(
  "/editActivity",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.editActivity
);

router.post(
  "/deleteActivity",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.deleteActivity
);

// ----------------------------- Trip Asstitant ----------------------

router.get(
  "/getTripAsstitant/:templateId",
  authMiddleware(),
  myTemplateController.getTripAsstitant
);

router.post(
  "/updateTripAssistant",
  authMiddleware(),
  myTemplateController.checkPermission,
  myTemplateController.updateTripAssistant
);

module.exports = router;

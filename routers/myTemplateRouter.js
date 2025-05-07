const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const myTemplateController = require("../controllers/myTemplateController");
const memberTaskController = require("../controllers/memberTaskController");

router.get(
  "/getTripTimeLine/:templateId",
  authMiddleware(),
  myTemplateController.getTripTimeLine
);

router.post(
  "/updateTripTimeLine",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.updateTripTimeLine
);

router.post(
  "/updateListMembers",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.updateListMembers
);

router.post(
  "/updateRoleMember",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.updateRoleMember
);

router.post(
  "/deleteMembers",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.deleteMembers
);

router.post(
  "/createActivity",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.createActivity
);

router.post(
  "/reOrderActivity",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.reOrderActivity
);

router.get(
  "/getSuggestActivity",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.getSuggestActivity
);

router.post(
  "/editActivity",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.editActivity
);

router.post(
  "/deleteActivity",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
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
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.updateTripAssistant
);

router.get(
  "/getSuggestChecklist",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  myTemplateController.getSuggestChecklist
);

router.get(
  "/getWeatherForecast/:templateId",
  authMiddleware(),
  myTemplateController.checkPermission(["edit", "view"]),
  myTemplateController.getWeatherForecast
);

module.exports = router;

// ----------------------------- Member Task ----------------------

router.post(
  "/createTask",
  authMiddleware(),
  myTemplateController.checkPermission(["edit", "view"]),
  memberTaskController.createMemberTask
);

router.get(
  "/getTask/:templateId",
  authMiddleware(),
  myTemplateController.checkPermission(["edit", "view"]),
  memberTaskController.getMemberTask
);

router.post(
  "/updateTask",
  authMiddleware(),
  myTemplateController.checkPermission(["edit", "view"]),
  memberTaskController.updateMemberTask
);

router.post(
  "/moveMemberTask",
  authMiddleware(),
  myTemplateController.checkPermission(["edit", "view"]),
  memberTaskController.moveMemberTask
);

router.post(
  "/deleteMemberTask",
  authMiddleware(),
  myTemplateController.checkPermission(["edit"]),
  memberTaskController.deleteMemberTask
);

router.get(
  "/getListMembers/:templateId",
  authMiddleware(),
  myTemplateController.checkPermission(["edit", "view"]),
  memberTaskController.getListMemberTask
);

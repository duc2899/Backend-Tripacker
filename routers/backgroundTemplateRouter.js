const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware");
const backgroundTemplateController = require("../controllers/backgroundTemplateController");

router.get(
  "/fectchDataImageBackground",
  authMiddleware(),
  backgroundTemplateController.fectchDataImageBackground
);
router.get(
  "/getBackGrounds/:tripTypeId",
  backgroundTemplateController.getBackGroundByTripType
);
router.get("/getTripTypes", backgroundTemplateController.getAllTripType);

module.exports = router;

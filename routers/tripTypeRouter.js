const router = require("express").Router();

const tripTypeController = require("../controllers/tripTypeController");

router.post("/create", tripTypeController.createTripType);
router.get("/get", tripTypeController.getTripTypes);
router.post("/update", tripTypeController.updateTripType);
router.post("/delete", tripTypeController.deleteTripType);

module.exports = router;

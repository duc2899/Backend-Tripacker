const router = require("express").Router();

const tripTypeRoute = require("./tripTypeRouter");
const templateRoute = require("./templateRouter");
const defaultItemRoute = require("./defaultItemRouter");
const authRoute = require("./authRouter");
const backgroundTemplateRoute = require("./backgroundTemplateRouter");

router.use("/tripType", tripTypeRoute);
router.use("/auth", authRoute);
router.use("/template", templateRoute);
router.use("/defaultItem", defaultItemRoute);
router.use("/backgroundTemplate", backgroundTemplateRoute);

module.exports = router;

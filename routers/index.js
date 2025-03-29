const router = require("express").Router();

const tripTypeRoute = require("./tripTypeRouter");
const templateRoute = require("./templateRouter");
const defaultItemRoute = require("./defaultItemRouter");
const authRoute = require("./authRouter");
const backgroundTemplateRoute = require("./backgroundTemplateRouter");
const userRoute = require("./userRouter");

router.use("/tripType", tripTypeRoute);
router.use("/auth", authRoute);
router.use("/template", templateRoute);
router.use("/defaultItem", defaultItemRoute);
router.use("/backgroundTemplate", backgroundTemplateRoute);
router.use("/user", userRoute);

module.exports = router;

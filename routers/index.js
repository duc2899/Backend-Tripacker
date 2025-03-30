const router = require("express").Router();

const templateRoute = require("./templateRouter");
const defaultItemRoute = require("./defaultItemRouter");
const authRoute = require("./authRouter");
const backgroundTemplateRoute = require("./backgroundTemplateRouter");
const userRoute = require("./userRouter");

router.use("/auth", authRoute);
router.use("/template", templateRoute);
router.use("/defaultItem", defaultItemRoute);
router.use("/backgroundTemplate", backgroundTemplateRoute);
router.use("/user", userRoute);

module.exports = router;

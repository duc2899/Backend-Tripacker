const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const templateController = require("../controllers/templateController");

router.post("/create", authMiddleware, templateController.createTemplate);
router.post(
  "/updateCategoryPacks",
  authMiddleware,
  templateController.updateCategoryPacks
);
router.post(
  "/updateInforTemplate",
  authMiddleware,
  templateController.updateInforTemplate
);
router.post("/getSuggest", authMiddleware, templateController.getSuggest);

router.get(
  "/getTemplate/:templateId",
  authMiddleware,
  templateController.getTemplate
);

router.get("/searchTemplates", templateController.searchTemplates);
router.get(
  "/searchUsersByEmail",
  authMiddleware,
  templateController.searchUsersByEmail
);

module.exports = router;

const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const templateController = require("../controllers/templateController");

router.post("/create", authMiddleware, templateController.createTemplate);

router.post(
  "/updateCategoryPacks",
  authMiddleware(),
  templateController.updateCategoryPacks
);

router.get(
  "/getTemplate/:templateId",
  authMiddleware(),
  templateController.getTemplate
);

router.get("/search", templateController.searchTemplates);

router.get(
  "/searchUsers",
  authMiddleware(),
  templateController.searchUsersByEmail
);

module.exports = router;

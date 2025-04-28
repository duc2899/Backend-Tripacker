const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const templateController = require("../controllers/templateController");

router.post("/create", authMiddleware(), templateController.createTemplate);

router.get("/search", templateController.searchTemplates);

router.get(
  "/searchUsers",
  authMiddleware(),
  templateController.searchUsersByEmail
);

module.exports = router;

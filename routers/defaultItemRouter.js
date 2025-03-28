const router = require("express").Router();

const defaultItemController = require("../controllers/defaultItemController");

router.post("/createCategory", defaultItemController.createCategoryWithItems);
router.post("/createItem", defaultItemController.addItemsToCategory);
router.get("/get", defaultItemController.getData);
router.post("/delete", defaultItemController.delete);

module.exports = router;

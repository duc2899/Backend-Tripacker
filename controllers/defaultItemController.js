const defaultItemsService = require("../services/defaultItems.service");

// Create a new category with items
exports.createCategoryWithItems = async (req, res, next) => {
  try {
    const reuslt = await defaultItemsService.createCategoryWithItems(req.body);

    return res.status(201).json({
      data: reuslt,
      message: "Category with items created successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Add items to an existing category
exports.addItemsToCategory = async (req, res, next) => {
  try {
    const reuslt = await defaultItemsService.addItemsToCategory(req.body);
    return res.status(201).json({
      data: reuslt,
      message: "Items added to category successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get data
exports.getData = async (req, res, next) => {
  try {
    const result = await defaultItemsService.getData();
    return res.status(200).json({
      data: result,
      message: "Get default item successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Delete a category or an item in a category
exports.delete = async (req, res, next) => {
  try {
    await defaultItemsService.delete(req.body);
    return res.status(200).json({
      message: "Delelte successfully",
    });
  } catch (error) {
    next(error);
  }
};

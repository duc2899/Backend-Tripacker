const DefaultItem = require("../models/defaultItemsModel");
const throwError = require("../utils/throwError");

const DefaultItemsService = {
  // Create a new category with items
  async createCategoryWithItems(data) {
    const { categoryName, items } = data;

    const existingCategory = await DefaultItem.findOne({
      category: categoryName,
    });
    if (existingCategory) {
      throwError("Category name already exists", 400);
    }

    const existingItems = new Set(items || []);
    if (existingItems.size !== (items || []).length) {
      throwError("Duplicate items found in the category creation", 400);
    }

    const newCategory = await DefaultItem.create({
      category: categoryName,
      items: [...existingItems],
    });
    return newCategory;
  },

  // Add items to an existing category
  async addItemsToCategory(data) {
    const { categoryId, items } = data;

    const category = await DefaultItem.findById(categoryId);
    if (!category) throwError("Category not found", 404);

    const existingItems = new Set(category.items);
    const newItems = items.filter((item) => !existingItems.has(item));

    if (newItems.length === 0) {
      throwError("All items already exist in the category", 400);
    }

    category.items.push(...newItems);
    await category.save();

    return category;
  },

  // Get data
  async getData() {
    const data = await DefaultItem.find();
    res.status(200).json({
      data,
      message: "Get default item successfully",
    });
  },

  // Delete a category or an item in a category
  async delete(data) {
    const { type, categoryId, itemName } = data;

    if (type === "category") {
      const deletedCategory = await DefaultItem.findByIdAndDelete(categoryId);
      if (!deletedCategory) throwError("Category not found", 404);

      return;
    } else if (type === "item") {
      const category = await DefaultItem.findById(categoryId);
      if (!category) throwError("Category not found", 404);

      const itemIndex = category.items.indexOf(itemName);
      if (itemIndex === -1) throwError("Item not found in category", 404);

      category.items.splice(itemIndex, 1);
      await category.save();
      return;
    } else {
      throwError("Invalid type", 400);
    }
  },
};

module.exports = DefaultItemsService;

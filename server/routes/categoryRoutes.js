// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/authMiddleware');

// 🟢 Public route: Get all categories (sorted subcategories)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();

    // ✅ Sort subcategories by name before returning
    const sorted = categories.map((cat) => ({
      ...cat.toObject(),
      subcategories: (cat.subcategories || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }));

    res.json(sorted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔒 Admin: Create category
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, slug, color, textColor, subcategories = [] } = req.body;

    // ✅ Always sort before saving
    const sortedSubs = subcategories.sort((a, b) => a.name.localeCompare(b.name));

    const category = new Category({
      name,
      slug,
      color,
      textColor,
      subcategories: sortedSubs,
    });
    const saved = await category.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 🔒 Admin: Update category
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { subcategories = [] } = req.body;
    const sortedSubs = subcategories.sort((a, b) => a.name.localeCompare(b.name));

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { ...req.body, subcategories: sortedSubs },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 🔒 Admin: Delete category
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

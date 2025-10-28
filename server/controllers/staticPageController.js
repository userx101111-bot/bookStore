// ============================================================
// ✅ server/controllers/staticPageController.js
// ============================================================
const StaticPage = require("../models/StaticPage");

// 🟢 Get all pages (public or admin)
exports.getPages = async (req, res) => {
  try {
    const query = {};
    if (req.query.active === "true") query.isActive = true;
    const pages = await StaticPage.find(query).sort({ title: 1 });
    res.json(pages);
  } catch (err) {
    console.error("❌ Error fetching pages:", err);
    res.status(500).json({ message: "Failed to fetch pages", error: err.message });
  }
};

// 🟢 Get single page by slug (public)
exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await StaticPage.findOne({ slug, isActive: true });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) {
    console.error("❌ Error fetching page:", err);
    res.status(500).json({ message: "Failed to fetch page", error: err.message });
  }
};

// 🟡 Create new page (admin only)
exports.createPage = async (req, res) => {
  try {
    const { slug, title, content, isActive } = req.body;
    const existing = await StaticPage.findOne({ slug });
    if (existing) return res.status(400).json({ message: "Slug already exists" });

    const newPage = new StaticPage({
      slug,
      title,
      content,
      isActive,
      lastUpdatedBy: req.user?.email || "admin",
    });

    const saved = await newPage.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Error creating page:", err);
    res.status(500).json({ message: "Failed to create page", error: err.message });
  }
};

// 🟠 Update page
exports.updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, content, isActive } = req.body;

    const updated = await StaticPage.findByIdAndUpdate(
      id,
      {
        slug,
        title,
        content,
        isActive,
        lastUpdatedBy: req.user?.email || "admin",
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Page not found" });
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating page:", err);
    res.status(500).json({ message: "Failed to update page", error: err.message });
  }
};

// 🔴 Delete page
exports.deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await StaticPage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Page not found" });
    res.json({ message: "Page deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting page:", err);
    res.status(500).json({ message: "Failed to delete page", error: err.message });
  }
};

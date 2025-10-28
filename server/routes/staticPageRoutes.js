// ============================================================
// ✅ server/routes/staticPageRoutes.js
// ============================================================
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
} = require("../controllers/staticPageController");

// Public Routes
router.get("/", getPages);
router.get("/:slug", getPageBySlug);

// Admin Routes
router.post("/", protect, admin, createPage);
router.put("/:id", protect, admin, updatePage);
router.delete("/:id", protect, admin, deletePage);

module.exports = router;

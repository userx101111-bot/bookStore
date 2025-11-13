// ============================================================
//  server/models/StaticPage.js
// ============================================================
const mongoose = require("mongoose");

const staticPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true }, // e.g., "about", "contact"
    title: { type: String, required: true },
    content: { type: String, required: true }, // HTML or Markdown content
    isActive: { type: Boolean, default: true },
    lastUpdatedBy: { type: String }, // admin name/email
  },
  { timestamps: true }
);

module.exports = mongoose.model("StaticPage", staticPageSchema);

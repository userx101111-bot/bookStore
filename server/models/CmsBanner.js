// ============================================================
// ✅ CmsBanner.js — Modern Interactive Banner Schema
// ============================================================
const mongoose = require("mongoose");

const cmsBannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String },
  ctaText: { type: String },
  ctaLink: { type: String },
  imageDesktop: { type: String, required: true }, // ✅ main image
  imageMobile: { type: String },                  // ✅ optional mobile image
  backgroundColor: { type: String, default: "#ffffff" },
  textColor: { type: String, default: "#000000" },
  animationType: {
    type: String,
    enum: ["fade", "slide", "zoom"],
    default: "fade",
  },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CmsBanner", cmsBannerSchema);

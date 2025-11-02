// ============================================================
// ✅ server/controllers/cmsBannerController.js — FULL FIXED VERSION
// ============================================================

const CmsBanner = require("../models/CmsBanner");

// ============================================================
// 🟢 Get all banners
// ============================================================
exports.getBanners = async (req, res) => {
  try {
    const query = {};
    if (req.query.active === "true") query.isActive = true;
    const banners = await CmsBanner.find(query).sort({ order: 1 });
    res.json(banners);
  } catch (error) {
    console.error("❌ Error fetching banners:", error);
    res.status(500).json({ message: "Error fetching banners", error: error.message });
  }
};

// ============================================================
// 🟡 Add a new banner
// ============================================================
exports.addBanner = async (req, res) => {
  try {
    const body = req.body;
    const files = req.files || {};

    // ✅ Ensure required fields
    if (!body.title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!files.imageDesktop?.[0]) {
      return res.status(400).json({ message: "Desktop image is required" });
    }

    const newBanner = new CmsBanner({
      title: body.title,
      subtitle: body.subtitle || "",
      ctaText: body.ctaText || "",
      ctaLink: body.ctaLink || "",
      backgroundColor: body.backgroundColor || "#ffffff",
      textColor: body.textColor || "#000000",
      animationType: body.animationType || "fade",
      order: Number(body.order) || 0,
      isActive: body.isActive === "true" || body.isActive === true,
      imageDesktop: files.imageDesktop[0].path, // ✅ Cloudinary URL
      imageMobile: files.imageMobile?.[0]?.path || null,
    });

    const saved = await newBanner.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("❌ Error adding banner:", error);
    res.status(500).json({ message: "Error adding banner", error: error.message });
  }
};

// ============================================================
// 🔵 Update a banner
// ============================================================
exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const files = req.files || {};

    const existing = await CmsBanner.findById(id);
    if (!existing) return res.status(404).json({ message: "Banner not found" });

    const updated = await CmsBanner.findByIdAndUpdate(
      id,
      {
        title: body.title || existing.title,
        subtitle: body.subtitle ?? existing.subtitle,
        ctaText: body.ctaText ?? existing.ctaText,
        ctaLink: body.ctaLink ?? existing.ctaLink,
        backgroundColor: body.backgroundColor || existing.backgroundColor,
        textColor: body.textColor || existing.textColor,
        animationType: body.animationType || existing.animationType,
        order: Number(body.order) ?? existing.order,
        isActive: body.isActive === "true" || body.isActive === true,
        imageDesktop: files.imageDesktop?.[0]?.path || existing.imageDesktop,
        imageMobile: files.imageMobile?.[0]?.path || existing.imageMobile,
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("❌ Error updating banner:", error);
    res.status(500).json({ message: "Error updating banner", error: error.message });
  }
};

// ============================================================
// 🔴 Delete a banner
// ============================================================
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CmsBanner.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Banner not found" });
    res.json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting banner:", error);
    res.status(500).json({ message: "Error deleting banner", error: error.message });
  }
};

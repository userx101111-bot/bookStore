// ============================================================
// ✅ server/routes/recentlyViewedRoutes.js — Final Fixed Version
// ============================================================

const express = require("express");
const RecentlyViewed = require("../models/RecentlyViewed");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// 🔧 Helper: expand each product's variants into separate entries
// ============================================================
const expandProductsToVariantEntries = (products) => {
  const expandedProducts = [];

  for (const p of products) {
    if (Array.isArray(p.variants) && p.variants.length > 0) {
      p.variants.forEach((v) => {
        expandedProducts.push({
          _id: `${p._id}-${v._id}`,
          parentId: p._id,
          name: p.name,
          category: p.category,
          slug: p.slug,
          format: v.format || "Standard",
          price: Number(v.price) || 0, // 👈 ensure numeric
          countInStock: v.countInStock || 0,
          mainImage:
            v.mainImage ||
            p.mainImage ||
            p.image ||
            "/assets/placeholder-image.png",
          isPromotion: !!p.isPromotion,
          isNewArrival: !!p.isNewArrival,
          isCurrentlyNew:
            p.isNewArrival && new Date(p.newArrivalUntil) > new Date(),
          volumeNumber: p.volumeNumber,
          author: p.author,
        });
      });
    } else {
      expandedProducts.push({
        _id: p._id,
        parentId: p._id,
        name: p.name,
        category: p.category,
        slug: p.slug,
        format: "Standard",
        price: Number(p.price) || 0,
        countInStock: 0,
        mainImage:
          p.mainImage ||
          p.image ||
          "/assets/placeholder-image.png",
        isPromotion: !!p.isPromotion,
        isNewArrival: !!p.isNewArrival,
        isCurrentlyNew:
          p.isNewArrival && new Date(p.newArrivalUntil) > new Date(),
        volumeNumber: p.volumeNumber,
        author: p.author,
      });
    }
  }

  return expandedProducts;
};

// ============================================================
// 🟢 Save viewed product (POST /api/recently-viewed/:productId)
// ============================================================
router.post("/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select(
      "name slug category author volumeNumber variants mainImage image isPromotion isNewArrival newArrivalUntil"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    // 🧩 Upsert ensures single entry per user/product
    await RecentlyViewed.findOneAndUpdate(
      { user: req.user._id, product: productId },
      { viewedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, message: "Recently viewed recorded" });
  } catch (error) {
    console.error("❌ Error saving recently viewed:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// 🟣 Get user's recently viewed list (GET /api/recently-viewed)
// ============================================================
router.get("/", protect, async (req, res) => {
  try {
    const items = await RecentlyViewed.find({ user: req.user._id })
      .populate({
        path: "product",
        select:
          "name slug category author volumeNumber variants mainImage image isPromotion isNewArrival newArrivalUntil",
      })
      .sort({ viewedAt: -1 })
      .limit(10);

    const products = items
      .filter((i) => i.product)
      .map((i) => i.product.toObject());

    // 🔧 expand all variants like /api/products/featured
    const expanded = expandProductsToVariantEntries(products);

    // 🧠 Log for backend verification
    console.log(
      "🧾 Recently Viewed Expanded (Server):",
      expanded.map((p) => ({
        name: p.name,
        format: p.format,
        price: p.price,
        parentId: p.parentId,
      }))
    );

    res.json(expanded);
  } catch (error) {
    console.error("❌ Error fetching recently viewed:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

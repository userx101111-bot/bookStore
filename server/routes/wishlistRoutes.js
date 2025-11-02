// server/routes/wishlistRoutes.js
const express = require("express");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// 🧭 Get wishlist (with variant info)
router.get("/", protect, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
      "items.product",
      "name slug author publisher variants category subcategory isPromotion isNewArrival isPopular"
    );

    if (!wishlist) {
      return res.json({ user: req.user._id, items: [] });
    }

    // ✅ Attach variant details inline
    const formatted = wishlist.items.map((i) => {
      const variant =
        i.variantId && i.product?.variants?.find((v) => v._id.toString() === i.variantId.toString());
      return {
        _id: i._id,
        product: i.product,
        variant: variant || null,
        addedAt: i.addedAt,
      };
    });

    res.json({ user: req.user._id, items: formatted });
  } catch (err) {
    console.error("❌ Error fetching wishlist:", err.message);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// ❤️ Add product + variant to wishlist
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    if (!productId)
      return res.status(400).json({ message: "Product ID required" });

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Product not found" });

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) wishlist = new Wishlist({ user: req.user._id, items: [] });

    // ✅ Check for existing item with same product + variant
    const exists = wishlist.items.some(
      (i) =>
        i.product.toString() === productId &&
        (variantId ? i.variantId?.toString() === variantId : !i.variantId)
    );
    if (exists)
      return res.status(400).json({ message: "Already in wishlist" });

    wishlist.items.push({ product: productId, variantId: variantId || null });
    await wishlist.save();

    const populated = await wishlist.populate(
      "items.product",
      "name slug author publisher variants category subcategory isPromotion isNewArrival isPopular"
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ Error adding wishlist item:", err.message);
    res.status(500).json({ message: "Failed to add wishlist item" });
  }
});

// 💔 Remove product (specific variant if given)
router.delete("/remove/:productId/:variantId?", protect, async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(
      (i) =>
        i.product.toString() !== productId ||
        (variantId && i.variantId?.toString() !== variantId)
    );

    await wishlist.save();

    const populated = await wishlist.populate("items.product", "name slug author variants");
    res.json(populated);
  } catch (err) {
    console.error("❌ Error removing wishlist item:", err.message);
    res.status(500).json({ message: "Failed to remove item" });
  }
});

// 🗑️ Clear wishlist
router.delete("/clear", protect, async (req, res) => {
  try {
    await Wishlist.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ message: "Wishlist cleared" });
  } catch (err) {
    console.error("❌ Error clearing wishlist:", err.message);
    res.status(500).json({ message: "Failed to clear wishlist" });
  }
});

module.exports = router;

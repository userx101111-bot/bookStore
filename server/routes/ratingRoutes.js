//server/routes/ratingRoutes.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// POST rating
router.post("/:productId", protect, async (req, res) => {
  const { rating, review, variantId } = req.body;
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const existing = product.ratings.find(
      (r) => r.user.toString() === req.user._id.toString() && r.variantId?.toString() === variantId
    );

    if (existing) {
      existing.rating = rating;
      existing.review = review;
    } else {
      product.ratings.push({ user: req.user._id, rating, review, variantId });
    }

    product.averageRating =
      product.ratings.reduce((sum, r) => sum + r.rating, 0) / product.ratings.length;

    await product.save();
    res.json({ message: "Rating saved", average: product.averageRating });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit rating" });
  }
});

// GET ratings
router.get("/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).populate("ratings.user", "name");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product.ratings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ratings" });
  }
});

module.exports = router;

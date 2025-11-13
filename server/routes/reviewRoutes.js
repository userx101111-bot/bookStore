// ============================================================
//  server/routes/reviewRoutes.js
// ============================================================
const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const Review = require("../models/Review");
const User = require("../models/User");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// ☁️ Cloudinary Setup
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "product-reviews",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

// ============================================================
// 🟢 POST /api/reviews/add — Add Product Review + Reward Coins
// ============================================================
router.post("/add", protect, upload.single("image"), async (req, res) => {
  try {
    const { productId, variantId, orderId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!productId || !rating)
      return res.status(400).json({ message: "Product and rating are required" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Prevent duplicate review for same product/order
    const alreadyReviewed = await Review.findOne({ user: userId, product: productId, order: orderId });
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You already reviewed this product for this order" });
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      variant: variantId || null,
      order: orderId,
      rating,
      comment,
      image: req.file?.path || null,
    });

    // 🪙 Reward user (example: +5 coins)
    const rewardCoins = 5;
    const user = await User.findById(userId);
    if (user) {
      await user.addWalletCredit(rewardCoins, `Reward for reviewing ${product.name}`);
    }

    res.status(201).json({
      success: true,
      message: `Review added successfully. You earned +${rewardCoins} coins.`,
      review,
    });
  } catch (err) {
    console.error("❌ Add review error:", err);
    res.status(500).json({ message: "Failed to add review", error: err.message });
  }
});

// ============================================================
// 🔍 GET /api/reviews/product/:productId — Get Reviews for Product
// ============================================================
router.get("/product/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("❌ Fetch reviews error:", err.message);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

module.exports = router;

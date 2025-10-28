//server/routes/addToCartRoutes.js
const express = require("express");
const router = express.Router();
const AddToCart = require("../models/addToCart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// ======================================================
// ✅ DEBUG + SAFETY VERSION OF ADD TO CART ROUTES
// ======================================================

// ------------------------
// POST /api/cart
// Add product to cart (increment if exists)
// ------------------------
router.post("/", protect, async (req, res) => {
  try {
    console.log("🟢 [POST /api/cart] Incoming request body:", req.body);
    console.log("👤 User ID:", req.user?._id);

    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      console.warn("⚠️ Missing productId or quantity");
      return res
        .status(400)
        .json({ message: "Product ID and quantity are required." });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      console.warn("❌ Product not found:", productId);
      return res.status(404).json({ message: "Product not found" });
    }

    // Find or create cart item
    let cartItem = await AddToCart.findOne({
      userId: req.user._id,
      productId,
    });

    if (cartItem) {
      // Update quantity safely
      const newQty = Math.min(
        cartItem.quantity + Number(quantity),
        product.countInStock
      );
      cartItem.quantity = newQty;
      await cartItem.save();
      console.log("🟡 Updated existing cart item:", cartItem._id);
    } else {
      // Create a new cart item
      cartItem = await AddToCart.create({
        userId: req.user._id,
        productId,
        quantity: Math.min(Number(quantity), product.countInStock),
      });
      console.log("🟢 Created new cart item:", cartItem._id);
    }

    // ✅ Return the updated full cart for that user
    const fullCart = await AddToCart.find({ userId: req.user._id }).populate(
      "productId"
    );

    console.log("📦 Returning updated cart length:", fullCart.length);
    return res.status(201).json(fullCart);
  } catch (err) {
    console.error("❌ [POST /api/cart] Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ------------------------
// PUT /api/cart/:productId
// Set exact quantity for existing cart item
// ------------------------
router.put("/:productId", protect, async (req, res) => {
  try {
    console.log("🟡 [PUT /api/cart/:productId] Incoming:", req.params, req.body);
    const { quantity } = req.body;

    if (quantity === undefined)
      return res.status(400).json({ message: "Quantity is required." });

    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    let cartItem = await AddToCart.findOne({
      userId: req.user._id,
      productId: req.params.productId,
    });

    if (!cartItem) {
      console.warn("⚠️ Cart item not found, creating a new one.");
      cartItem = await AddToCart.create({
        userId: req.user._id,
        productId: req.params.productId,
        quantity: Math.min(quantity, product.countInStock),
      });
    } else {
      cartItem.quantity = Math.min(quantity, product.countInStock);
      await cartItem.save();
    }

    const updatedCart = await AddToCart.find({ userId: req.user._id }).populate(
      "productId"
    );

    console.log("✅ Cart updated. Returning full cart.");
    return res.status(200).json(updatedCart);
  } catch (err) {
    console.error("❌ [PUT /api/cart/:productId] Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ------------------------
// GET /api/cart
// Get all cart items for current user
// ------------------------
router.get("/", protect, async (req, res) => {
  try {
    console.log("🔵 [GET /api/cart] User ID:", req.user?._id);

    const cart = await AddToCart.find({ userId: req.user._id }).populate(
      "productId"
    );

    console.log("📦 Cart items fetched:", cart.length);
    return res.status(200).json(cart);
  } catch (err) {
    console.error("❌ [GET /api/cart] Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ------------------------
// DELETE /api/cart/:productId
// Remove cart item
// ------------------------
router.delete("/:productId", protect, async (req, res) => {
  try {
    console.log("🔴 [DELETE /api/cart/:productId]", req.params);

    const cartItem = await AddToCart.findOne({
      userId: req.user._id,
      productId: req.params.productId,
    });

    if (!cartItem) {
      console.warn("⚠️ Cart item not found for deletion:", req.params.productId);
      return res.status(404).json({ message: "Cart item not found" });
    }

    await cartItem.deleteOne();
    console.log("🗑️ Deleted cart item:", req.params.productId);

    const remainingCart = await AddToCart.find({
      userId: req.user._id,
    }).populate("productId");

    return res.status(200).json(remainingCart);
  } catch (err) {
    console.error("❌ [DELETE /api/cart/:productId] Error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;


// server/routes/addToCartRoutes.js
const express = require("express");
const router = express.Router();
const AddToCart = require("../models/addToCart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// ============================================================
// 🛒 POST /api/cart/add — Add item to current user's cart
// ============================================================
router.post("/add", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId || !variantId)
      return res.status(400).json({ message: "Missing product or variant info." });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.find(
      (v) => v._id.toString() === variantId.toString()
    );
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const price = variant.price;
    const subtotal = price * quantity;

    let cart = await AddToCart.findOne({ user: userId });

    // 🆕 Create new cart
    if (!cart) {
      cart = new AddToCart({
        user: userId,
        items: [{ product: productId, variantId, quantity, price, subtotal }],
      });
    } else {
      // 🔁 If variant already exists, increase quantity
      const existingItem = cart.items.find(
        (i) => i.variantId.toString() === variantId.toString()
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.subtotal = existingItem.quantity * existingItem.price;
      } else {
        cart.items.push({ product: productId, variantId, quantity, price, subtotal });
      }
    }

    await cart.save();
    return res.json({
      message: "Added to cart successfully",
      cartTotal: cart.totalPrice,
      cart,
    });
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    res.status(500).json({ message: "Server error adding to cart" });
  }
});

// ============================================================
// 🧾 GET /api/cart — Get logged-in user's cart
// ============================================================
router.get("/", protect, async (req, res) => {
  try {
    const cart = await AddToCart.findOne({ user: req.user._id })
      .populate("items.product", "name slug variants category")
      .lean();
    if (!cart) return res.json({ items: [], totalPrice: 0 });
    res.json(cart);
  } catch (err) {
    console.error("❌ Error fetching cart:", err);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

// ============================================================
// 🧮 PATCH /api/cart/update — Update item quantity
// ============================================================
router.patch("/update", protect, async (req, res) => {
  try {
    const { variantId, quantity } = req.body;
    const cart = await AddToCart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.variantId.toString() === variantId.toString());
    if (!item) return res.status(404).json({ message: "Item not found in cart" });

    item.quantity = quantity;
    item.subtotal = item.quantity * item.price;

    await cart.save();
    res.json({ message: "Cart updated", cart });
  } catch (err) {
    console.error("❌ Error updating cart:", err);
    res.status(500).json({ message: "Failed to update cart" });
  }
});

// ============================================================
// 🗑️ DELETE /api/cart/remove/:variantId — Remove one item
// ============================================================
router.delete("/remove/:variantId", protect, async (req, res) => {
  try {
    const { variantId } = req.params;
    const cart = await AddToCart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((i) => i.variantId.toString() !== variantId);
    await cart.save();

    res.json({ message: "Item removed", cart });
  } catch (err) {
    console.error("❌ Error removing cart item:", err);
    res.status(500).json({ message: "Failed to remove cart item" });
  }
});

// ============================================================
// 🧹 DELETE /api/cart/clear — Clear entire cart
// ============================================================
router.delete("/clear", protect, async (req, res) => {
  try {
    await AddToCart.findOneAndDelete({ user: req.user._id });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("❌ Error clearing cart:", err);
    res.status(500).json({ message: "Failed to clear cart" });
  }
});

module.exports = router;

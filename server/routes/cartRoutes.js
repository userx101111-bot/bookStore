const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Voucher = require("../models/Voucher");
const { protect } = require("../middleware/authMiddleware");

/**
 * Compute price after discount
 */
const computeDiscount = (price, voucher) => {
  if (!voucher) return { finalPrice: price, discount_value: 0, discount_type: null };

  let finalPrice = price;
  if (voucher.discount_type === "percentage") {
    finalPrice = price * (1 - voucher.discount_value / 100);
  } else if (voucher.discount_type === "fixed") {
    finalPrice = price - voucher.discount_value;
  }
  if (finalPrice < 0) finalPrice = 0;
  return {
    finalPrice: Math.round(finalPrice * 100) / 100,
    discount_value: voucher.discount_value,
    discount_type: voucher.discount_type,
  };
};

/**
 * Helper: repopulate and return full cart
 */

const getPopulatedCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate("items.product", "name author mainImage image slug")
    .populate("items.applied_voucher", "name discount_type discount_value");

  if (cart && cart.items?.length > 0) {
    // ✅ Sort newest-first before returning
    cart.items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return cart;
};



/**
 * POST /api/cart/add
 * Add item to cart (user must be logged in)
 */
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const userId = req.user._id;

    if (!productId || !variantId) {
      return res.status(400).json({ message: "Missing product or variant ID" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    // find applicable voucher
    const now = new Date();
    const vouchers = await Voucher.find({
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
      $or: [
        { applicable_products: productId },
        { "applicable_variants.variant_id": variantId },
      ],
    });

    const voucher = vouchers[0] || null;
    const { finalPrice, discount_value, discount_type } = computeDiscount(variant.price, voucher);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const existing = cart.items.find(
      (i) => i.product.toString() === productId && i.variant_id.toString() === variantId
    );

    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = existing.final_price * existing.quantity;
    } else {
      cart.items.push({
        product: productId,
        variant_id: variantId,
        variant_format: variant.format,
        price: variant.price,
        discount_value,
        discount_type,
        final_price: finalPrice,
        quantity,
        subtotal: finalPrice * quantity,
        applied_voucher: voucher?._id || null,
      });
    }

    await cart.save();

    // ✅ Populate before returning
    const populatedCart = await getPopulatedCart(userId);

    res.status(200).json({ message: "Added to cart", cart: populatedCart });
  } catch (err) {
    console.error("❌ Add to cart error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * GET /api/cart
 * Get current user's cart
 */
router.get("/", protect, async (req, res) => {
  try {
    const cart = await getPopulatedCart(req.user._id);
    res.json(cart || { items: [] });
  } catch (err) {
    console.error("❌ Fetch cart error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/cart/update/:variantId
 * Update quantity
 */
router.patch("/update/:variantId", protect, async (req, res) => {
  try {
    const { variantId } = req.params;
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.variant_id.toString() === variantId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity = quantity;
    item.subtotal = item.final_price * quantity;

    await cart.save();

    // ✅ Re-fetch populated cart
    const populatedCart = await getPopulatedCart(req.user._id);

    res.json({ message: "Quantity updated", cart: populatedCart });
  } catch (err) {
    console.error("❌ Update quantity error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/cart/remove/:variantId
 */
router.delete("/remove/:variantId", protect, async (req, res) => {
  try {
    const { variantId } = req.params;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((i) => i.variant_id.toString() !== variantId);
    await cart.save();

    // ✅ Return populated cart
    const populatedCart = await getPopulatedCart(req.user._id);

    res.json({ message: "Item removed", cart: populatedCart });
  } catch (err) {
    console.error("❌ Remove item error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// server/routes/voucherRoutes.js
const express = require("express");
const router = express.Router();
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const { protect, admin } = require("../middleware/authMiddleware");

// ✅ CREATE
router.post("/", protect, admin, async (req, res) => {
  try {
    const voucher = new Voucher(req.body);
    await voucher.save();

    // Automatically flag products linked to this voucher
    if (voucher.applicable_products?.length) {
      await Product.updateMany(
        { _id: { $in: voucher.applicable_products } },
        { $set: { isPromotion: true } }
      );
    }

    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: "Failed to create voucher", error: err.message });
  }
});

// ✅ UPDATE
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const updated = await Voucher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    // Sync promo flags dynamically
    if (updated) {
      const allVouchers = await Voucher.find({}).select("applicable_products");
      const allLinkedProductIds = new Set(
        allVouchers.flatMap((v) => v.applicable_products.map((p) => p.toString()))
      );

      await Product.updateMany(
        { _id: { $in: Array.from(allLinkedProductIds) } },
        { $set: { isPromotion: true } }
      );

      await Product.updateMany(
        { _id: { $nin: Array.from(allLinkedProductIds) } },
        { $set: { isPromotion: false } }
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Failed to update voucher", error: err.message });
  }
});


// ✅ DELETE
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ message: "Voucher deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete voucher" });
  }
});

// ✅ GET ALL
router.get("/", protect, admin, async (req, res) => {
  try {
    const vouchers = await Voucher.find().populate("applicable_products", "name category");
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch vouchers" });
  }
});

// ✅ LINK PRODUCTS
router.post("/:id/link-products", protect, admin, async (req, res) => {
  try {
    const { productIds } = req.body;
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });

    // ✅ 1. Update voucher linkage
    voucher.applicable_products = productIds;
    await voucher.save();

    // ✅ 2. Set isPromotion=true for all linked products
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { isPromotion: true } }
    );

    // ✅ 3. Check for any products no longer linked by ANY voucher, remove promo
    const allVouchers = await Voucher.find({}).select("applicable_products");
    const allLinkedProductIds = new Set(
      allVouchers.flatMap((v) => v.applicable_products.map((p) => p.toString()))
    );

    await Product.updateMany(
      { _id: { $nin: Array.from(allLinkedProductIds) } },
      { $set: { isPromotion: false } }
    );

    res.json({
      message: "✅ Voucher linked and products updated successfully",
      voucher,
    });
  } catch (err) {
    console.error("❌ Error linking products:", err);
    res.status(500).json({ message: "Failed to link products" });
  }
});

// ✅ PUBLIC: Get all active vouchers available for given product
router.get("/product/:productId", async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
      applicable_products: req.params.productId,
    });

    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applicable vouchers" });
  }
});

module.exports = router;

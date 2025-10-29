const express = require("express");
const router = express.Router();
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const { protect, admin } = require("../middleware/authMiddleware");

// CREATE
router.post("/", protect, admin, async (req, res) => {
  try {
    const voucher = new Voucher(req.body);
    await voucher.save();

    // ✅ Automatically mark products/variants with active vouchers
    const affectedProductIds = [
      ...(voucher.applicable_products || []),
      ...(voucher.applicable_variants || []).map((v) => v.product),
    ];

    if (affectedProductIds.length > 0) {
      await Product.updateMany(
        { _id: { $in: affectedProductIds } },
        { $set: { isPromotion: true } }
      );
    }

    res.status(201).json(voucher);
  } catch (err) {
    res.status(500).json({ message: "Failed to create voucher", error: err.message });
  }
});

// UPDATE
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const updated = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (updated) {
      const allVouchers = await Voucher.find({}, "applicable_products applicable_variants");
      const allLinkedProductIds = new Set([
        ...allVouchers.flatMap((v) => v.applicable_products.map((p) => p.toString())),
        ...allVouchers.flatMap((v) => v.applicable_variants.map((a) => a.product.toString())),
      ]);

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

// DELETE
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ message: "Voucher deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete voucher" });
  }
});

// GET ALL
router.get("/", protect, admin, async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .populate("applicable_products", "name category")
      .populate("applicable_variants.product", "name category variants");
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch vouchers" });
  }
});

// ✅ LINK PRODUCTS or VARIANTS
router.post("/:id/link", protect, admin, async (req, res) => {
  try {
    const { productIds = [], variantLinks = [] } = req.body;
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });

    voucher.applicable_products = productIds;
    voucher.applicable_variants = variantLinks;
    await voucher.save();

    // Apply promo flags
    const allAffectedIds = [
      ...productIds,
      ...variantLinks.map((v) => v.product),
    ];
    await Product.updateMany({ _id: { $in: allAffectedIds } }, { $set: { isPromotion: true } });

    const allVouchers = await Voucher.find({}, "applicable_products applicable_variants");
    const allLinkedIds = new Set([
      ...allVouchers.flatMap((v) => v.applicable_products.map((p) => p.toString())),
      ...allVouchers.flatMap((v) => v.applicable_variants.map((a) => a.product.toString())),
    ]);
    await Product.updateMany({ _id: { $nin: Array.from(allLinkedIds) } }, { $set: { isPromotion: false } });

    res.json({ message: "✅ Voucher linked successfully", voucher });
  } catch (err) {
    console.error("❌ Link error:", err);
    res.status(500).json({ message: "Failed to link voucher", error: err.message });
  }
});

// ✅ PUBLIC: Get active vouchers for product or variant
router.get("/product/:productId/:variantId?", async (req, res) => {
  try {
    const now = new Date();
    const { productId, variantId } = req.params;
    const query = {
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
      $or: [
        { applicable_products: productId },
        { applicable_variants: { $elemMatch: { product: productId, variant_id: variantId } } },
      ],
    };
    const vouchers = await Voucher.find(query);
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch applicable vouchers" });
  }
});

module.exports = router;

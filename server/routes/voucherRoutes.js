const express = require("express");
const router = express.Router();
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const { protect, admin } = require("../middleware/authMiddleware");

/**
 * Helper: normalizeId
 * Accepts either an ObjectId, a string, or a populated document and returns a string id.
 */
const normalizeId = (idOrDoc) => String(idOrDoc?._id ?? idOrDoc);

// ----------------------------------
// CREATE
// ----------------------------------
router.post("/", protect, admin, async (req, res) => {
  try {
    const voucher = new Voucher(req.body);
    await voucher.save();

    // ✅ Automatically mark products/variants with active vouchers
    const affectedProductIds = [
      ...(voucher.applicable_products || []).map(normalizeId),
      ...(voucher.applicable_variants || []).map((v) => normalizeId(v.product)),
    ];

    if (affectedProductIds.length > 0) {
      await Product.updateMany(
        { _id: { $in: affectedProductIds } },
        { $set: { isPromotion: true } }
      );
    }

    res.status(201).json(voucher);
  } catch (err) {
    console.error("❌ Error creating voucher:", err);
    res.status(500).json({ message: "Failed to create voucher", error: err.message });
  }
});

// ----------------------------------
// UPDATE
// ----------------------------------
router.put("/:id", protect, admin, async (req, res) => {
  try {
    const updated = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (updated) {
      const allVouchers = await Voucher.find({}, "applicable_products applicable_variants");

      const allLinkedProductIdsSet = new Set([
        ...allVouchers.flatMap((v) => (v.applicable_products || []).map((p) => normalizeId(p))),
        ...allVouchers.flatMap((v) => (v.applicable_variants || []).map((a) => normalizeId(a.product))),
      ]);

      const linkedArray = Array.from(allLinkedProductIdsSet);

      // Mark linked products as promotion
      if (linkedArray.length > 0) {
        await Product.updateMany({ _id: { $in: linkedArray } }, { $set: { isPromotion: true } });
      }

      // Unmark products that are no longer linked to any voucher
      await Product.updateMany({ _id: { $nin: linkedArray } }, { $set: { isPromotion: false } });
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating voucher:", err);
    res.status(500).json({ message: "Failed to update voucher", error: err.message });
  }
});

// ----------------------------------
// DELETE
// ----------------------------------
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    await Voucher.findByIdAndDelete(req.params.id);
    res.json({ message: "Voucher deleted" });
  } catch (err) {
    console.error("❌ Error deleting voucher:", err);
    res.status(500).json({ message: "Failed to delete voucher" });
  }
});

// ----------------------------------
// GET ALL (admin) - populate for nicer frontend displays
// ----------------------------------
router.get("/", protect, admin, async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .populate("applicable_products", "name category")
      .populate("applicable_variants.product", "name category variants");
    res.json(vouchers);
  } catch (err) {
    console.error("❌ Error fetching vouchers:", err);
    res.status(500).json({ message: "Failed to fetch vouchers" });
  }
});

// ----------------------------------
// LINK: set voucher applicable products / variants
// body: { productIds: [id], variantLinks: [{ product, variant_id }] }
// ----------------------------------
router.post("/:id/link", protect, admin, async (req, res) => {
  try {
    const { productIds = [], variantLinks = [] } = req.body;
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });

    // Accept either ObjectId/string or populated docs in payload; normalize when saving would be OK,
    // but storing as provided (Mongoose will cast). We'll save directly then recalc product flags below.
    voucher.applicable_products = productIds;
    voucher.applicable_variants = variantLinks;
    await voucher.save();

    // Apply promo flags to affected products
    const allAffectedIds = [
      ...(productIds || []).map(normalizeId),
      ...(variantLinks || []).map((v) => normalizeId(v.product)),
    ].filter(Boolean);

    if (allAffectedIds.length > 0) {
      await Product.updateMany({ _id: { $in: allAffectedIds } }, { $set: { isPromotion: true } });
    }

    // Recalculate all linked product IDs across vouchers to ensure consistency
    const allVouchers = await Voucher.find({}, "applicable_products applicable_variants");
    const allLinkedIdsSet = new Set([
      ...allVouchers.flatMap((v) => (v.applicable_products || []).map((p) => normalizeId(p))),
      ...allVouchers.flatMap((v) => (v.applicable_variants || []).map((a) => normalizeId(a.product))),
    ]);
    const allLinkedIds = Array.from(allLinkedIdsSet);

    // Products not in any voucher -> isPromotion: false
    await Product.updateMany({ _id: { $nin: allLinkedIds } }, { $set: { isPromotion: false } });

    res.json({ message: "✅ Voucher linked successfully", voucher });
  } catch (err) {
    console.error("❌ Link error:", err);
    res.status(500).json({ message: "Failed to link voucher", error: err.message });
  }
});

// ----------------------------------
// PUBLIC: Get active vouchers for product or variant
// GET /product/:productId/:variantId?
// ----------------------------------
router.get("/product/:productId/:variantId?", async (req, res) => {
  const mongoose = require("mongoose");

  try {
    const now = new Date();
    let { productId, variantId } = req.params;

    // 🧠 Handle combined IDs (e.g., "prodId-varId")
    if (productId && productId.includes("-")) {
      const parts = productId.split("-");
      productId = parts[0];
      if (!variantId && parts[1]) variantId = parts[1];
    }

    // 🧠 Validate ObjectIds safely
    const validProductId = mongoose.isValidObjectId(productId)
      ? productId
      : null;
    const validVariantId =
      variantId && mongoose.isValidObjectId(variantId) ? variantId : null;

    if (!validProductId && !validVariantId) {
      return res.status(400).json({
        message: "Invalid product or variant ID format",
      });
    }

    // Base query (active, in date range)
    const baseQuery = {
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
    };

    const orConditions = [];

    // ✅ Product-level vouchers
    if (validProductId) {
      orConditions.push({ applicable_products: validProductId });
      // Include vouchers tied via variant.product as well
      orConditions.push({ "applicable_variants.product": validProductId });
    }

    // ✅ Variant-level vouchers
    if (validVariantId) {
      orConditions.push({
        applicable_variants: {
          $elemMatch: { variant_id: validVariantId },
        },
      });
    }

    const query = { ...baseQuery, $or: orConditions };

    const vouchers = await Voucher.find(query);
    res.json(vouchers);
  } catch (err) {
    console.error("❌ Error fetching applicable vouchers:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch applicable vouchers", error: err.message });
  }
});

module.exports = router;

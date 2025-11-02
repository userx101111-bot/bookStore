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
// 🟢 PUBLIC — Get all active vouchers (for homepage badges)
// ----------------------------------
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const vouchers = await Voucher.find({
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
    })
      .populate("applicable_products", "name category")
      .populate("applicable_variants.product", "name category variants")
      .lean();

    res.json(vouchers || []);
  } catch (err) {
    console.error("❌ Error fetching public vouchers:", err);
    res.status(500).json({ message: "Failed to fetch public vouchers" });
  }
});

// ----------------------------------
// 🔒 ADMIN — Get all vouchers (manage in dashboard)
// ----------------------------------
router.get("/all", protect, admin, async (req, res) => {
  try {
    const vouchers = await Voucher.find()
      .populate("applicable_products", "name category")
      .populate("applicable_variants.product", "name category variants")
      .lean();
    res.json(vouchers || []);
  } catch (err) {
    console.error("❌ Error fetching admin vouchers:", err);
    res.status(500).json({ message: "Failed to fetch admin vouchers" });
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
// ✅ FIXED: PUBLIC — Get active vouchers for product or variant
// GET /product/:productId/:variantId?
// ----------------------------------
router.get("/product/:productId/:variantId?", async (req, res) => {
  try {
    const now = new Date();
    const { productId, variantId } = req.params;

    const baseQuery = {
      is_active: true,
      start_date: { $lte: now },
      end_date: { $gte: now },
    };

    const orConditions = [
      // Match vouchers for this product
      { applicable_products: productId },
      // Also match any voucher that applies to this product’s variants
      { "applicable_variants.product": productId },
    ];

    // 🧩 Helper to validate proper MongoDB ObjectId
    const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

    if (variantId) {
      if (isValidObjectId(variantId)) {
        // ✅ Variant ID looks valid, safe to match it
        orConditions.push({
          applicable_variants: {
            $elemMatch: { product: productId, variant_id: variantId },
          },
        });
      } else {
        // 🚫 Invalid variant ID format (e.g., "parentId-variantId")
        // Extract the last 24-char piece safely
        const parts = variantId.split("-");
        const lastPart = parts[parts.length - 1];
        if (isValidObjectId(lastPart)) {
          orConditions.push({
            applicable_variants: {
              $elemMatch: { product: productId, variant_id: lastPart },
            },
          });
        } else {
          console.warn(`⚠️ Ignoring invalid variantId: ${variantId}`);
        }
      }
    }

    const query = { ...baseQuery, $or: orConditions };
    const vouchers = await Voucher.find(query).lean();

    res.json(vouchers || []);
  } catch (err) {
    console.error("❌ Error fetching applicable vouchers:", err);
    res.status(500).json({ message: "Failed to fetch applicable vouchers" });
  }
});



module.exports = router;

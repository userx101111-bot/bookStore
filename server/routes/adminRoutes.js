// server/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Voucher = require("../models/Voucher"); 
const User = require("../models/User");
const Order = require("../models/Order");
const { protect, admin } = require("../middleware/authMiddleware");
const { notifyVariantLow } = require("../utils/notifyLowStock");


// CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bookstore-products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({ storage });

// Helper: slug & sanitize album images
const generateSlug = (name) =>
  name
    ?.toLowerCase()
    ?.trim()
    ?.replace(/[^\w\s-]/g, "")
    ?.replace(/\s+/g, "-")
    ?.replace(/--+/g, "-") || "";

const sanitizeAlbumImages = (images = []) => {
  return images
    .map((img) => {
      if (typeof img === "string" && img.startsWith("http")) return img;
      if (img?.preview && typeof img.preview === "string" && img.preview.startsWith("http"))
        return img.preview;
      return null;
    })
    .filter(Boolean);
};



// CREATE PRODUCT
router.post("/products", protect, admin, upload.any(), async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || [];

    const slugValue = body.slug?.trim() || generateSlug(body.name);

    let variants = [];
    if (body.variants) {
      try {
        variants = JSON.parse(body.variants);
      } catch {
        variants = [];
      }
    }

    variants = variants.map((variant, idx) => {
      const main = files.find((f) => f.fieldname === `variantMainImages_${idx}`);
      const albums = files.filter((f) => f.fieldname === `variantAlbumImages_${idx}`);
      const uploadedUrls = albums.map((a) => a.path);
      const cleanedAlbums = [...sanitizeAlbumImages(variant.albumImages), ...uploadedUrls];

      return {
        format: variant.format,
        price: variant.price,
        countInStock: variant.countInStock,
        isbn: variant.isbn,
        trimSize: variant.trimSize,
        pages: variant.pages,
        mainImage: main ? main.path : sanitizeAlbumImages([variant.mainImage])[0] || "",
        albumImages: [...new Set(cleanedAlbums)],
      };
    });

    // parse featured flags (FormData values become strings "true"/"false")
    const parseBool = (val) => val === true || val === "true" || val === "1";

    const product = new Product({
      name: body.name,
      description: body.description,
      category: body.category,
      subcategory: body.subcategory,
      seriesTitle: body.seriesTitle,
      volumeNumber: body.volumeNumber,
      publisher: body.publisher,
      slug: slugValue,
      author: body.author,
      authorBio: body.authorBio,
      publicationDate: body.publicationDate || null,
      age: body.age,
      variants,
      status: body.status || "Active",
      isPromotion: parseBool(body.isPromotion),
      isNewArrival: parseBool(body.isNewArrival),
      isPopular: parseBool(body.isPopular),
    });

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("❌ Error creating product:", error);
    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
});

// UPDATE PRODUCT
router.put("/products/:id", protect, admin, upload.any(), async (req, res) => {
  try {
    const body = req.body || {};
    const files = req.files || [];

    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found" });

    const slugValue = body.slug?.trim() || generateSlug(body.name);

    // parse variants safely (fallback to existing)
    let variants = [];
    try {
      variants = JSON.parse(body.variants);
      if (!Array.isArray(variants) || variants.length === 0) variants = existing.variants;
    } catch {
      variants = existing.variants;
    }

variants = variants.map((variant, idx) => {
  const dbVariant = existing.variants[idx] || {};
  const main = files.find((f) => f.fieldname === `variantMainImages_${idx}`);
  const albums = files.filter((f) => f.fieldname === `variantAlbumImages_${idx}`);
  const uploadedUrls = albums.map((a) => a.path);
  const frontendAlbums = sanitizeAlbumImages(variant.albumImages);
  const mergedAlbums = [...new Set([...frontendAlbums, ...uploadedUrls])];

  return {
    _id: dbVariant._id || new mongoose.Types.ObjectId(), // ✅ preserve or assign consistent ID
    format: variant.format || dbVariant.format,
    price: variant.price ?? dbVariant.price,
    countInStock: variant.countInStock ?? dbVariant.countInStock,
    isbn: variant.isbn || dbVariant.isbn,
    trimSize: variant.trimSize || dbVariant.trimSize,
    pages: variant.pages || dbVariant.pages,
    mainImage:
      main
        ? main.path
        : sanitizeAlbumImages([variant.mainImage])[0] || dbVariant.mainImage || "",
    albumImages: mergedAlbums.filter(Boolean),
  };
});


    const parseBool = (val) => val === true || val === "true" || val === "1";

    // ✅ Determine stock before updating
    const totalStock = variants.reduce(
      (sum, v) => sum + (parseInt(v.countInStock) || 0),
      0
    );

    // ✅ Automatically set status = "Out of Stock" if all variants are 0
    let finalStatus;
    if (totalStock === 0) {
      finalStatus = "Out of Stock";
    } else if (body.status === "Inactive") {
      finalStatus = "Inactive";
    } else {
      finalStatus = "Active";
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: body.name,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        seriesTitle: body.seriesTitle,
        volumeNumber: body.volumeNumber,
        publisher: body.publisher,
        slug: slugValue,
        author: body.author,
        authorBio: body.authorBio,
        publicationDate: body.publicationDate || null,
        age: body.age,
        variants,
        status: finalStatus, // ✅ apply logic here
        isPromotion: parseBool(body.isPromotion ?? existing.isPromotion),
        isNewArrival: parseBool(body.isNewArrival ?? existing.isNewArrival),
        isPopular: parseBool(body.isPopular ?? existing.isPopular),
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
});

// GET PRODUCTS (base list, without variant expansion)
router.get("/products/base", protect, admin, async (req, res) => {
  try {
    const products = await Product.find({}, "name category subcategory status isPromotion").sort({
      name: 1,
    });
    res.json(products);
  } catch (error) {
    console.error("❌ Error fetching base products:", error);
    res.status(500).json({ message: "Failed to fetch base products" });
  }
});

// GET PRODUCTS (admin)
router.get("/products", protect, admin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// DELETE PRODUCT
router.delete("/products/:id", protect, admin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// GET ALL USERS
router.get("/users", protect, admin, async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});
// ============================================================
// 🟢 Promote User to Admin
// ============================================================
router.put("/users/:id/make-admin", protect, admin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    if (targetUser.isAdmin)
      return res.status(400).json({ message: "User is already an admin" });

    targetUser.isAdmin = true;
    targetUser.role = "admin";
    await targetUser.save();

    res.json({
      message: `✅ ${targetUser.firstName || targetUser.email} promoted to admin.`,
      user: targetUser,
    });
  } catch (err) {
    console.error("❌ Error promoting user:", err);
    res.status(500).json({ message: "Failed to promote user" });
  }
});


// ============================================================
// 🔻 Demote (Remove Admin Privileges)
// ============================================================
router.put("/users/:id/remove-admin", protect, admin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    if (!targetUser.isAdmin)
      return res.status(400).json({ message: "User is not an admin" });

    // 🛡️ Prevent demoting yourself
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot demote your own account." });
    }

    targetUser.isAdmin = false;
    targetUser.role = "user";
    await targetUser.save();

    res.json({
      message: `⚠️ ${targetUser.firstName || targetUser.email} demoted to regular user.`,
      user: targetUser,
    });
  } catch (err) {
    console.error("❌ Error demoting admin:", err);
    res.status(500).json({ message: "Failed to demote admin" });
  }
});


// ============================================================
// ❌ Delete User (Admin Only)
// ============================================================
router.delete("/users/:id", protect, admin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser)
      return res.status(404).json({ message: "User not found" });

    // 🛡️ Prevent deleting self
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
    }

    await targetUser.deleteOne();

    res.json({
      message: `🗑️ User ${targetUser.email} deleted successfully.`,
    });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});


// GET ALL ORDERS
router.get("/orders", protect, admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "firstName lastName email")
      .populate("orderItems.product", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// ============================================================
// 🟢 UPDATE ORDER STATUS (Admin) + Dynamic Stock Adjustment
// ============================================================
router.put("/orders/:id/status", protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const previousStatus = order.status;

    // =====================================================
    // 🚚 When Marked as "shipped" → Deduct Product Stock
    // =====================================================
    if (status === "shipped" && previousStatus !== "shipped") {
      console.log(`🧮 Reducing stock for shipped order: ${order._id}`);

      for (const item of order.orderItems) {
        try {
          const product = await Product.findById(item.product);
          if (!product) {
            console.warn(`⚠️ Product not found: ${item.product}`);
            continue;
          }

          // Find variant by ID
          const variant = product.variants.id(item.variantId);
          if (!variant) {
            console.warn(`⚠️ Variant not found for product ${product._id}`);
            continue;
          }

          // Deduct quantity, prevent negatives
          variant.countInStock = Math.max(0, (variant.countInStock || 0) - item.qty);

          // Recompute total stock and update status
          const totalStock = product.variants.reduce(
            (sum, v) => sum + (v.countInStock || 0),
            0
          );
          product.status = totalStock > 0 ? "Active" : "Out of Stock";

          await product.save();
          console.log(
            `✅ Updated stock for ${product.name} (${variant.format}): ${variant.countInStock} left`
          );
        } catch (err) {
          console.error(`❌ Stock update error for item ${item.product}:`, err.message);
        }
      }
    }

    // =====================================================
    // 🔁 Optional: Restore Stock When Cancelled (once only)
    // =====================================================
    if (status === "cancelled" && previousStatus !== "cancelled") {
      console.log(`🔄 Restoring stock for cancelled order: ${order._id}`);

      for (const item of order.orderItems) {
        try {
          const product = await Product.findById(item.product);
          if (!product) continue;
          const variant = product.variants.id(item.variantId);
          if (variant) {
            variant.countInStock += item.qty;
          }

          const totalStock = product.variants.reduce(
            (sum, v) => sum + (v.countInStock || 0),
            0
          );
          product.status = totalStock > 0 ? "Active" : "Out of Stock";

          await product.save();
          console.log(
            `♻️ Restored stock for ${product.name} (${variant?.format}): ${variant?.countInStock}`
          );
        } catch (err) {
          console.error("❌ Restore stock error:", err.message);
        }
      }
    }

    // =====================================================
    // 💵 Payment Method Logic (COD / Wallet / PayPal)
    // =====================================================
    if (order.paymentMethod === "cash on delivery") {
      if (status === "processing") {
        order.status = "processing";
      } else if (status === "to_ship") {
        if (order.status !== "processing") {
          return res.status(400).json({
            message: "Order must be 'processing' before marking as 'to_ship'",
          });
        }
        order.status = "to_ship";
      } else {
        order.status = status;
      }
    } else {
      order.status = status;
    }

    // ✅ Record delivery timestamp
    if (status === "delivered") {
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    res.json({
      message: `Order marked as '${status}' successfully`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  }
});


// ============================================================
// 🧩 AUTO-UNLINK ALL VOUCHERS WHEN PROMO UNCHECKED
// ============================================================
router.patch("/products/:id/unset-promo", protect, admin, async (req, res) => {
  try {
    const productId = req.params.id;

    // Remove all product and variant-level voucher links
    await Voucher.updateMany(
      {
        $or: [
          { applicable_products: productId },
          { "applicable_variants.product": productId },
        ],
      },
      {
        $pull: {
          applicable_products: productId,
          applicable_variants: { product: productId },
        },
      }
    );

    // Update the product flag
    await Product.findByIdAndUpdate(productId, { isPromotion: false });

    res.json({ message: "✅ Product vouchers removed and promo unset" });
  } catch (error) {
    console.error("❌ Error in unset-promo route:", error);
    res.status(500).json({
      message: "Failed to unlink vouchers and unset promo",
      error: error.message,
    });
  }
});

// ============================================================
// 📦 INVENTORY MANAGEMENT
// ============================================================
router.get("/inventory", protect, admin, async (req, res) => {
  try {
    const products = await Product.find({}, "name category variants status")
      .sort({ name: 1 })
      .lean();

    const inventory = products.flatMap((p) =>
      p.variants.map((v) => ({
        productId: p._id,
        variantId: v._id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory || "Uncategorized",
        format: v.format,
        countInStock: v.countInStock,
        status: p.status,
      }))
    );

    res.json(inventory);
  } catch (err) {
    console.error("❌ Error fetching inventory:", err);
    res.status(500).json({ message: "Failed to fetch inventory data" });
  }
});

router.patch("/inventory/:productId/:variantId/update-stock", protect, admin, async (req, res) => {
  try {
    const { countInStock } = req.body;
    const { productId, variantId } = req.params;
    const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD || "5", 10);

    if (countInStock === undefined || countInStock < 0)
      return res.status(400).json({ message: "Invalid stock count" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const prevCount = variant.countInStock || 0;
    const newCount = Number(countInStock);

    // Update variant stock
    variant.countInStock = newCount;

    // Auto-update product status
    const totalStock = product.variants.reduce(
      (sum, v) => sum + (v.countInStock || 0),
      0
    );
    product.status = totalStock > 0 ? "Active" : "Out of Stock";

    await product.save();

    // ⚡ Notify if stock just dropped below or at threshold
    if (prevCount > threshold && newCount <= threshold) {
      try {
        await notifyVariantLow({
          productId: product._id.toString(),
          productName: product.name,
          variantId: variant._id.toString(),
          variantFormat: variant.format,
          prevCount,
          newCount,
          category: product.category,
        });
      } catch (notifyErr) {
        console.error("⚠️ Low stock notify error:", notifyErr);
      }
    }

    res.json({
      message: `✅ Stock updated for ${product.name} (${variant.format})`,
      productId,
      variantId,
      countInStock: variant.countInStock,
      status: product.status,
    });
  } catch (err) {
    console.error("❌ Stock update error:", err);
    res.status(500).json({ message: "Failed to update stock" });
  }
});


module.exports = router;

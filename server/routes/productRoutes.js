// server/routes/productRoutes.js
const express = require("express");
const Product = require("../models/Product");
const router = express.Router();

/**
 * Helper: expandProductsToVariantEntries(productsArray)
 * returns array where each variant is a distinct entry (same format you used)
 */
const expandProductsToVariantEntries = (products) => {
  const expandedProducts = [];

  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        expandedProducts.push({
          _id: `${p._id}-${v._id}`,
          parentId: p._id,
          name: p.name,
          description: p.description,
          category: p.category,
          subcategory: p.subcategory,
          slug: p.slug,
          format: v.format || "Standard",
          price: v.price,
          countInStock: v.countInStock,
          mainImage: v.mainImage || null,
          albumImages: v.albumImages?.length ? v.albumImages : [],
          isbn: v.isbn,
          trimSize: v.trimSize,
          pages: v.pages,
          seriesTitle: p.seriesTitle,
          volumeNumber: p.volumeNumber,
          publisher: p.publisher,
          author: p.author,
          age: p.age,
          publicationDate: p.publicationDate,
          variantsCount: p.variants.length,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          // carry featured flags down for easy frontend usage
          isPromotion: p.isPromotion,
          isNewArrival: p.isNewArrival,
          isPopular: p.isPopular,
        });
      });
    } else {
      expandedProducts.push({
        _id: p._id,
        parentId: p._id,
        name: p.name,
        description: p.description,
        category: p.category,
        subcategory: p.subcategory,
        slug: p.slug,
        format: "Standard",
        price: p.price || 0,
        countInStock: p.countInStock || 0,
        mainImage: null,
        albumImages: [],
        isbn: "",
        trimSize: "",
        pages: 0,
        seriesTitle: p.seriesTitle,
        volumeNumber: p.volumeNumber,
        publisher: p.publisher,
        author: p.author,
        age: p.age,
        publicationDate: p.publicationDate,
        variantsCount: 0,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        isPromotion: p.isPromotion,
        isNewArrival: p.isNewArrival,
        isPopular: p.isPopular,
      });
    }
  }

  return expandedProducts;
};

/**
 * GET /api/products/featured
 * returns expanded variant entries for promotions, newArrivals, popular
 */
router.get("/featured", async (req, res) => {
  try {
    const promotionsProducts = await Product.find({ isPromotion: true, status: "Active" }).sort({
      updatedAt: -1,
    }).limit(20);
    const newArrivalsProducts = await Product.find({ isNewArrival: true, status: "Active" })
      .sort({ createdAt: -1 })
      .limit(20);
    const popularProducts = await Product.find({ isPopular: true, status: "Active" })
      .sort({ updatedAt: -1 })
      .limit(20);

    const promotions = expandProductsToVariantEntries(promotionsProducts);
    const newArrivals = expandProductsToVariantEntries(newArrivalsProducts);
    const popular = expandProductsToVariantEntries(popularProducts);

    res.json({
      promotions,
      newArrivals,
      popular,
    });
  } catch (error) {
    console.error("❌ Error fetching featured products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/products
 * Fetch all products — each variant appears as its own entry
 */
// GET /api/products
router.get("/", async (req, res) => {
  try {
    // only include Active or Out of Stock
    const products = await Product.find({
      status: { $in: ["Active", "Out of Stock"] },
    }).sort({ createdAt: -1 });

    const expanded = expandProductsToVariantEntries(products);
    res.json(expanded);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/**
 * GET /api/products/category/:slug
 */
router.get("/category/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const products = await Product.find({
      $or: [{ category: slug }, { subcategory: slug }],
    }).sort({ createdAt: -1 });

    if (!products.length) return res.status(404).json({ message: "No products found" });

    const expanded = expandProductsToVariantEntries(products);
    res.json(expanded);
  } catch (error) {
    console.error("❌ Error fetching category products:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Fetch product by Mongo ID
router.get("/by-id/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    res.json({
      _id: product._id,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      seriesTitle: product.seriesTitle,
      volumeNumber: product.volumeNumber,
      publisher: product.publisher,
      slug: product.slug,
      author: product.author,
      authorBio: product.authorBio,
      publicationDate: product.publicationDate,
      age: product.age,
      variants: product.variants?.map((v) => ({
        _id: v._id,
        format: v.format,
        price: v.price,
        countInStock: v.countInStock,
        isbn: v.isbn,
        trimSize: v.trimSize,
        pages: v.pages,
        mainImage: v.mainImage,
        albumImages: v.albumImages || [],
      })) || [],
      isPromotion: product.isPromotion,
      isNewArrival: product.isNewArrival,
      isPopular: product.isPopular,
    });
  } catch (error) {
    console.error("❌ Error fetching product by ID:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/:slug", async (req, res) => {
  try {
   const { slug } = req.params;
   console.log("🧭 Fetching product by slug:", slug);
   const product = await Product.findOne({ slug });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({
      _id: product._id,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      seriesTitle: product.seriesTitle,
      volumeNumber: product.volumeNumber,
      publisher: product.publisher,
      slug: product.slug,
      author: product.author,
      authorBio: product.authorBio,
      publicationDate: product.publicationDate,
      age: product.age,
      variants:
        product.variants?.map((v) => ({
          _id: v._id,
          format: v.format,
          price: v.price,
          countInStock: v.countInStock,
          isbn: v.isbn,
          trimSize: v.trimSize,
          pages: v.pages,
          mainImage: v.mainImage,
          albumImages: v.albumImages || [],
        })) || [],
      isPromotion: product.isPromotion,
      isNewArrival: product.isNewArrival,
      isPopular: product.isPopular,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  } catch (error) {
    console.error("❌ Error fetching product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



module.exports = router;

// server/routes/printRoutes.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// helper to expand variants
const expandProductsToVariantEntries = (products) => {
  const expanded = [];
  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        expanded.push({
          _id: `${p._id}-${v._id}`,
          name: p.name,
          category: p.category,
          subcategory: p.subcategory,
          format: v.format || "Standard",
          price: v.price,
          countInStock: v.countInStock,
          isbn: v.isbn,
          mainImage: v.mainImage,
        });
      });
    } else {
      expanded.push({
        _id: p._id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        format: "Standard",
        price: p.price,
        countInStock: p.countInStock,
        isbn: p.isbn,
        mainImage: null,
      });
    }
  }
  return expanded;
};

// GET /api/print/catalog
router.get("/catalog", async (req, res) => {
  try {
    const products = await Product.find({ status: { $in: ["Active", "Out of Stock"] } }).sort({ createdAt: -1 });
    const expanded = expandProductsToVariantEntries(products);

    let html = `
      <html>
      <head>
        <title>Product Catalog</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; }
          th { background: #f2f2f2; }
          img { max-width: 60px; height: auto; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Product Catalog</h1>
        <button onclick="window.print()">🖨️ Print Catalog</button>
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Format</th>
              <th>Price</th>
              <th>Stock</th>
              <th>ISBN</th>
            </tr>
          </thead>
          <tbody>
    `;

    expanded.forEach((p) => {
      html += `
        <tr>
          <td>${p.mainImage ? `<img src="${p.mainImage}" />` : ""}</td>
          <td>${p.name}</td>
          <td>${p.category}${p.subcategory ? " / " + p.subcategory : ""}</td>
          <td>${p.format}</td>
          <td>${p.price}</td>
          <td>${p.countInStock}</td>
          <td>${p.isbn || ""}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating catalog");
  }
});

module.exports = router;

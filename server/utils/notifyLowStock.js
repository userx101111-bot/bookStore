// server/utils/notifyLowStock.js
const Product = require("../models/Product");
const sendEmail = require("./sendEmail");

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || "5", 10);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

/**
 * Batch: find all variants with countInStock <= threshold and email a list.
 */
async function notifyLowStock() {
  try {
    console.log("🔍 Running batch low-stock check...");

    const lowProducts = await Product.find({
      "variants.countInStock": { $lte: LOW_STOCK_THRESHOLD },
    }).select("name variants category");

    if (!lowProducts.length) {
      console.log("✅ No low-stock items found today.");
      return;
    }

    let html = `
      <h2>⚠️ Low Stock Alert</h2>
      <p>The following variants are low on stock (threshold ≤ ${LOW_STOCK_THRESHOLD}):</p>
      <table border="0" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
        <thead>
          <tr>
            <th align="left">Product</th>
            <th align="left">Variant</th>
            <th align="right">Stock</th>
            <th align="left">Category</th>
          </tr>
        </thead>
        <tbody>
    `;

    lowProducts.forEach((p) => {
      const lowVariants = p.variants.filter((v) => (v.countInStock ?? 0) <= LOW_STOCK_THRESHOLD);
      lowVariants.forEach((v) => {
        html += `<tr>
          <td>${p.name}</td>
          <td>${v.format || "Standard"}</td>
          <td align="right">${v.countInStock ?? 0}</td>
          <td>${p.category || ""}</td>
        </tr>`;
      });
    });

    html += `</tbody></table><p>Please restock soon.</p>`;

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `⚠️ Low Stock Alert (${lowProducts.length} product(s))`,
      html,
    });

    console.log(`📨 Sent low-stock alert (batch) for ${lowProducts.length} product(s).`);
  } catch (err) {
    console.error("❌ notifyLowStock failed:", err);
  }
}

/**
 * Real-time: notify when a single variant drops to or below the threshold.
 * prevCount = previous count BEFORE update; newCount = after update.
 * Only send if prevCount > threshold && newCount <= threshold.
 */
async function notifyVariantLow({ productId, productName, variantId, variantFormat, prevCount, newCount, category }) {
  try {
    const threshold = LOW_STOCK_THRESHOLD;
    if (prevCount <= threshold) {
      // already low before update => don't resend
      return;
    }
    if (newCount > threshold) {
      // still above threshold => nothing to do
      return;
    }

    const html = `
      <h2>⚠️ Variant Low Stock Alert</h2>
      <p>The following variant just dropped at-or-below the threshold (≤ ${threshold}):</p>
      <ul>
        <li><b>Product:</b> ${productName} (${productId})</li>
        <li><b>Variant:</b> ${variantFormat || "Standard"} (${variantId})</li>
        <li><b>Category:</b> ${category || ""}</li>
        <li><b>Previous stock:</b> ${prevCount}</li>
        <li><b>New stock:</b> ${newCount}</li>
      </ul>
      <p>Please restock this variant soon.</p>
    `;

    await sendEmail({
      to: process.env.ADMIN_EMAIL || ADMIN_EMAIL,
      subject: `⚠️ Variant Low: ${productName} — ${variantFormat || "Variant"}`,
      html,
    });

    console.log(`📨 Sent variant low-stock alert for ${productName} / ${variantFormat}`);
  } catch (err) {
    console.error("❌ notifyVariantLow failed:", err);
  }
}

module.exports = { notifyLowStock, notifyVariantLow };

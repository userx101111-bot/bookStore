// server/utils/notifyLowStock.js
const Product = require("../models/Product");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function notifyLowStock() {
  try {
    console.log("🔍 Checking for low-stock products...");

    const lowStockProducts = await Product.find({
      "variants.countInStock": { $lte: 5 },
    }).select("name variants category");

    if (!lowStockProducts.length) {
      console.log("✅ No low-stock items found today.");
      return;
    }

    let emailBody = `
      <h2>⚠️ Low Stock Alert</h2>
      <p>The following products are low on stock:</p>
      <ul>
    `;

    lowStockProducts.forEach((p) => {
      const lowVariants = p.variants.filter((v) => v.countInStock <= 5);
      lowVariants.forEach((v) => {
        emailBody += `
          <li><b>${p.name}</b> (${v.format || "Standard"}) — Stock: ${v.countInStock}</li>
        `;
      });
    });

    emailBody += `
      </ul>
      <p>Please restock soon.</p>
      <p style="font-size:12px;color:#888;">Automated alert from Bookstore Admin System</p>
    `;

    await fetch("https://bookstore-production-331b.up.railway.app/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com", // 👈 Change this
        subject: "⚠️ Low Stock Alert - Bookstore",
        message: emailBody,
      }),
    });

    console.log(`📨 Sent low-stock alert for ${lowStockProducts.length} products.`);
  } catch (err) {
    console.error("❌ Low stock notification failed:", err);
  }
}

module.exports = notifyLowStock;

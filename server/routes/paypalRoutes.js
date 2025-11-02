// ============================================================
// server/routes/paypalRoutes.js (CLEANED UP FOR WALLET SYSTEM)
// ============================================================
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");

// ============================================================
// 💳 Create PayPal order (still needed for PayPal checkout)
// ============================================================
router.post("/create-order", protect, async (req, res) => {
  try {
    const { total } = req.body;

    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "PHP", value: total.toFixed(2) },
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET
          ).toString("base64")}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("❌ PayPal create order failed:", err.message);
    res.status(500).json({ message: "Failed to create PayPal order" });
  }
});

// ============================================================
// 💰 Capture PayPal order (on payment success)
// ============================================================
router.post("/capture/:orderId", protect, async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await axios.post(
      `${process.env.PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET
          ).toString("base64")}`,
        },
      }
    );

    const captureData = response.data;
    res.json(captureData);
  } catch (err) {
    console.error("❌ PayPal capture failed:", err.message);
    res.status(500).json({ message: "Failed to capture PayPal order" });
  }
});


module.exports = router;

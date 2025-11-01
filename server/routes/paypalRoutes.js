// server/routes/paypalRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const Order = require("../models/Order");
const { protect, admin } = require("../middleware/authMiddleware");

// Create PayPal order
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

// Capture PayPal order after success
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
// Refund a PayPal payment (admin/manual)


router.post("/refund/:captureId", protect, admin, async (req, res) => {
  try {
    const { captureId } = req.params;
    const { amount } = req.body; // Optional: support partial refunds

    const { refundPayPalPayment } = require("../utils/paypalRefund");
    const refundData = await refundPayPalPayment(captureId, amount);

    // Optionally update your Order model
    const order = await Order.findOne({ "paymentResult.capture_id": captureId });
    if (order) {
      order.status = "refunded";
      order.refundResult = refundData;
      order.refundedAt = new Date();
      await order.save();
    }

    res.json({
      message: "Refund processed successfully",
      refund: refundData,
    });
  } catch (err) {
    console.error("❌ PayPal refund failed:", err.response?.data || err.message);
    res.status(500).json({
      message: "Failed to process refund",
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;

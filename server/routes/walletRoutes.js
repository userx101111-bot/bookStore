// server/routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, admin } = require("../middleware/authMiddleware");

// 🪙 Get wallet info (current user)
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("wallet");
    res.json(user.wallet);
  } catch (err) {
    console.error("❌ Wallet fetch error:", err.message);
    res.status(500).json({ message: "Failed to fetch wallet info" });
  }
});

// 🪙 Add coins (Admin or automated refund)
router.put("/:userId/add", protect, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.addWalletCredit(amount, description);
    res.json({ message: `₱${amount.toFixed(2)} credited`, wallet: user.wallet });
  } catch (err) {
    console.error("❌ Add wallet coins error:", err.message);
    res.status(500).json({ message: "Failed to credit wallet" });
  }
});

// 🪙 Deduct coins (during checkout)
router.put("/:userId/deduct", protect, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deductWalletBalance(amount, description);
    res.json({ message: `₱${amount.toFixed(2)} deducted`, wallet: user.wallet });
  } catch (err) {
    console.error("❌ Deduct wallet coins error:", err.message);
    res.status(400).json({ message: err.message });
  }
});

// 🔒 Admin: View any user's wallet
router.get("/:userId", protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("wallet");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.wallet);
  } catch (err) {
    console.error("❌ Admin wallet view error:", err.message);
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
});

module.exports = router;

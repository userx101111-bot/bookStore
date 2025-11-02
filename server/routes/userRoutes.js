// ============================================================
// server/routes/userRoutes.js (FINAL VERSION)
// ============================================================
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const EmailVerification = require("../models/EmailVerification");
const { protect } = require("../middleware/authMiddleware");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const router = express.Router();

// ============================================================
// Get user profile (with full details including phone + createdAt)
// ============================================================
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("_id firstName lastName email role loginMethod phone address createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// Update user profile
// ============================================================
router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    if (req.body.address) user.address = req.body.address;

    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordManual = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      address: updatedUser.address,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ============================================================
// Update phone number
// ============================================================
router.put("/update-phone", protect, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.phone = phone;
    await user.save();

    res.json({
      success: true,
      message: "Phone number updated successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("Update phone error:", err);
    res.status(500).json({ message: "Failed to update phone number" });
  }
});


// ============================================================
// Update name (first & last)
// ============================================================
router.put("/update-name", protect, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName && !lastName)
      return res.status(400).json({ message: "First or last name is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    res.json({
      success: true,
      message: "Name updated successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("Update name error:", err);
    res.status(500).json({ message: "Failed to update name" });
  }
});

// ============================================================
// Update only address
// ============================================================
router.put("/update-address", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.address = req.body.address || user.address;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      address: updatedUser.address,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// Disconnect Google from unified account
// ============================================================
router.put("/disconnect-google", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.loginMethod.includes("google")) {
      return res.status(400).json({ message: "Google is not linked to this account." });
    }

    // 🧹 Remove Google linkage
    user.loginMethod = user.loginMethod.filter((m) => m !== "google");
    user.googleId = undefined;
    user.passwordGoogle = undefined;

    await user.save();

    console.log(`🔌 Google disconnected for user: ${user.email}`);

    res.json({
      success: true,
      message: "Google account disconnected successfully.",
      user: {
        email: user.email,
        loginMethod: user.loginMethod,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("Disconnect Google error:", err);
    res.status(500).json({ message: "Failed to disconnect Google account." });
  }
});

// ============================================================
// Request change email (send code to new email)
// ============================================================
router.put("/change-email", protect, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) return res.status(400).json({ message: "New email is required" });

    const existing = await User.findOne({ email: newEmail });
    if (existing) {
      return res.status(400).json({ message: "This email is already in use." });
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await EmailVerification.findOneAndUpdate(
      { email: newEmail },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    // Send email through your external service
    await fetch("https://bookstore-production-331b.up.railway.app/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        subject: "Verify your new email address",
        message: `<p>Your verification code is <b>${code}</b>. It expires in 5 minutes.</p>`,
      }),
    });

    console.log(`📧 Sent verification code to new email: ${newEmail}`);
    res.json({ message: "Verification code sent to new email." });
  } catch (err) {
    console.error("Change email error:", err);
    res.status(500).json({ message: "Failed to send verification email." });
  }
});

// ============================================================
// Verify new email and update account
// ============================================================
router.post("/verify-new-email", protect, async (req, res) => {
  try {
    const { newEmail, code } = req.body;
    if (!newEmail || !code)
      return res.status(400).json({ message: "Missing email or code" });

    const record = await EmailVerification.findOne({ email: newEmail });
    if (!record) return res.status(400).json({ message: "No verification record found" });
    if (record.code !== code)
      return res.status(400).json({ message: "Invalid verification code" });
    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "Verification code expired" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const oldEmail = user.email;
    user.email = newEmail;
    await user.save();

    await EmailVerification.deleteOne({ email: newEmail });
    console.log(`📨 User email updated: ${oldEmail} → ${newEmail}`);

    res.json({ success: true, message: "Email changed successfully." });
  } catch (err) {
    console.error("Verify new email error:", err);
    res.status(500).json({ message: "Failed to verify and update email." });
  }
});

module.exports = router;

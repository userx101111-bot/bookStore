// server/routes/accountRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const EmailVerification = require("../models/EmailVerification");

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Utility: Generate 6-digit code
const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// Your external email service (Railway or Resend, etc.)
const EMAIL_SERVICE_URL =
  "https://bookstore-production-331b.up.railway.app/send";

// Dynamic fetch for all Node.js versions
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ============================================================
   1️⃣ CHANGE EMAIL (Manual or Unified after Google disconnect)
============================================================ */
/* ============================================================
   1️⃣ CHANGE EMAIL (Manual or Google-only; Unified must disconnect)
============================================================ */
router.put("/change-email", protect, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) return res.status(400).json({ message: "New email required" });

    // Ensure newEmail isn't already taken
    const existing = await User.findOne({ email: newEmail });
    if (existing)
      return res.status(400).json({ message: "This email is already in use." });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If the account is unified (has both google AND email) — require disconnect.
    const hasGoogle = user.loginMethod.includes("google");
    const hasEmail = user.loginMethod.includes("email");
    if (hasGoogle && hasEmail) {
      return res.status(400).json({
        message:
          "You cannot change your email while linked with Google. Disconnect Google first.",
      });
    }

    // Otherwise (manual-only OR google-only) allow starting the change flow.
    // Generate verification code (5 minute expiry)
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await EmailVerification.findOneAndUpdate(
      { email: newEmail },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    // Send verification code to the new email
    await fetch(EMAIL_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        code,
      }),
    });

    return res.json({
      message: "Verification code sent to your new email address.",
    });
  } catch (err) {
    console.error("Change email error:", err);
    res.status(500).json({ message: "Failed to initiate email change" });
  }
});


/* ============================================================
   2️⃣ VERIFY NEW EMAIL CODE (Finalize change)
============================================================ */
router.post("/verify-new-email", protect, async (req, res) => {
  try {
    const { newEmail, code } = req.body;
    if (!newEmail || !code)
      return res.status(400).json({ message: "Email and code are required" });

    const record = await EmailVerification.findOne({ email: newEmail });
    if (!record) return res.status(400).json({ message: "No verification record found." });

    if (record.code !== code)
      return res.status(400).json({ message: "Invalid verification code." });

    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "Verification code expired." });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // ✅ Finally update email and mark verified
    user.email = newEmail;
    user.emailVerified = true;
    await user.save();

    // Delete verification record
    await EmailVerification.deleteOne({ email: newEmail });

    res.json({ message: "Email verified and updated successfully." });
  } catch (err) {
    console.error("Verify new email error:", err);
    res.status(500).json({ message: "Failed to verify email." });
  }
});

/* ============================================================
   3️⃣ DISCONNECT GOOGLE
============================================================ */
router.put("/disconnect-google", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.loginMethod.includes("google")) {
      return res
        .status(400)
        .json({ message: "This account is not linked with Google." });
    }

    user.loginMethod = user.loginMethod.filter((m) => m !== "google");
    user.googleId = null;
    await user.save();

    res.json({ message: "Google account disconnected successfully." });
  } catch (err) {
    console.error("Disconnect Google error:", err);
    res.status(500).json({ message: "Failed to disconnect Google" });
  }
});

/* ============================================================
   4️⃣ TRANSFER GOOGLE ACCOUNT
============================================================ */
router.post("/transfer-google-account", protect, async (req, res) => {
  try {
    const { newGoogleToken } = req.body;
    if (!newGoogleToken)
      return res.status(400).json({ message: "Missing Google token" });

    const ticket = await client.verifyIdToken({
      idToken: newGoogleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const newEmail = payload.email;
    const newGoogleId = payload.sub;

    const existing = await User.findOne({ email: newEmail });
    if (existing)
      return res
        .status(400)
        .json({ message: "That Google account is already linked." });

    const currentUser = await User.findById(req.user._id);
    if (!currentUser)
      return res.status(404).json({ message: "Current user not found." });

    if (!currentUser.loginMethod.includes("google")) {
      return res.status(400).json({
        message: "Only Google-linked accounts can transfer.",
      });
    }

    const newUser = await User.create({
      ...currentUser.toObject(),
      _id: undefined,
      email: newEmail,
      googleId: newGoogleId,
      emailVerified: true,
      createdAt: Date.now(),
    });

    currentUser.isActive = false;
    await currentUser.save();

    res.json({
      message: "Google account transferred successfully.",
      newEmail,
      newUserId: newUser._id,
    });
  } catch (err) {
    console.error("Transfer Google error:", err);
    res.status(500).json({ message: "Failed to transfer Google account" });
  }
});

module.exports = router;

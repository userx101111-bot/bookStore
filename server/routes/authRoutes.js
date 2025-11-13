// ==========================================================
// server/routes/authRoutes.js 
// ==========================================================
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const EmailVerification = require("../models/EmailVerification");


const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate JWT
const generateToken = (user) =>
  jwt.sign(
    { id: user._id, isAdmin: user.role === "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

// ==========================================================
// REGISTER (Manual Registration or Add Password for Google User)
// ==========================================================
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    let user = await User.findOne({ email });

    // ✅ Case 1: User already exists as Google-only → add manual password
    if (user && user.loginMethod.includes("google") && !user.loginMethod.includes("email")) {
      user.passwordManual = password;
      user.loginMethod.push("email");
      await user.save();

      return res.status(200).json({
        message: "Manual password added successfully to your Google-linked account.",
        email: user.email,
        loginMethod: user.loginMethod,
      });
    }

    // ✅ Case 2: User already exists as manual or unified
    if (user) {
      return res.status(400).json({ message: "User already exists." });
    }

    // ✅ Case 3: Create new manual account
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      passwordManual: password,
      phone,
      loginMethod: ["email"],
      role: "user",
    });

    const token = generateToken(newUser);

    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================================
// LOGIN (Manual Email/Password)
// ==========================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🟢 Login attempt:", email);

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    // Google-only accounts cannot log in manually
    if (user.loginMethod.includes("google") && !user.loginMethod.includes("email")) {
      return res.status(400).json({
        message:
          "This account was created using Google. Please log in with Google or add a manual password.",
      });
    }

    // Compare entered password with passwordManual
    const isMatch = await bcrypt.compare(password, user.passwordManual || "");
    if (!isMatch) {
      console.log("❌ Password mismatch for", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);
    console.log("✅ Login success:", email);

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      loginMethod: user.loginMethod,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message });
  }
});
// ==========================
// GOOGLE LOGIN
// ==========================
router.post("/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const {
      email,
      given_name: firstName,
      family_name: lastName,
      sub: googleId,
    } = payload;

    let user = await User.findOne({ email });

    // Case 1: Create new Google-only user
    if (!user) {
      const generatedGooglePassword =
        googleId + "_" + Math.random().toString(36).slice(2, 10);
      user = await User.create({
        firstName,
        lastName,
        email,
        googleId,
        passwordGoogle: generatedGooglePassword,
        loginMethod: ["google"],
        role: "user",
      });
      console.log("🟢 Created new Google user:", email);
    }
    // Case 2: Existing manual user → unify login
    else if (
      user.loginMethod.includes("email") &&
      !user.loginMethod.includes("google")
    ) {
      user.loginMethod.push("google");
      user.googleId = googleId;
      await user.save();
      console.log("🔗 Unified account (manual + google):", email);
    }

    const jwtToken = jwt.sign(
      { id: user._id, isAdmin: user.role === "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      loginMethod: user.loginMethod,
      token: jwtToken,
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
});

// ==========================================================
// PROFILE (Authenticated Fetch)
// ==========================================================
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select("_id firstName lastName email role loginMethod phone createdAt")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});



// ============================================================
// ADD MANUAL PASSWORD + UPDATE USER DETAILS (after email verified)
// ============================================================
router.post("/add-manual-password", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Ensure email was recently verified
    let stillPending = null;
    try {
      stillPending = await EmailVerification.findOne({ email });
    } catch (err) {
      console.warn("⚠️ EmailVerification lookup failed:", err.message);
    }

    if (stillPending) {
      return res.status(400).json({
        message: "Email verification required before adding manual password.",
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found." });

    if (!user.loginMethod.includes("google")) {
      return res.status(400).json({
        message: "This account is not linked with Google.",
      });
    }

    // ✅ Add manual password and update profile fields
    user.passwordManual = password;
    if (!user.loginMethod.includes("email")) user.loginMethod.push("email");
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: "Manual login added successfully. You can now sign in directly.",
      email: user.email,
    });
  } catch (err) {
    console.error("Add manual password error:", err);
    res.status(500).json({ message: "Failed to add manual password." });
  }
});

// ============================================================
// FORGOT PASSWORD (Send Reset Code)
// ============================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account found with that email." });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await EmailVerification.findOneAndUpdate(
      { email },
      { code: resetCode, expiresAt, createdAt: new Date() },
      { upsert: true, new: true }
    );

    const EMAIL_SERVICE_URL = "https://bookstore-production-331b.up.railway.app/send";
    await fetch(EMAIL_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        subject: "Reset Your Kommiku Vault Password",
        message: `
          <h2>Password Reset Request</h2>
          <p>Hello,</p>
          <p>Use the following code to reset your password:</p>
          <h3>${resetCode}</h3>
          <p>This code expires in 10 minutes.</p>
        `,
      }),
    });

    res.json({ success: true, message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset code." });
  }
});


// ============================================================
// VERIFY RESET CODE (Check code validity & expiry)
// ============================================================
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    // 🔒 Strict check for empty or short code
    if (!email || !code || code.trim().length < 4) {
      return res.status(400).json({ message: "A valid email and 6-digit code are required." });
    }

    const record = await EmailVerification.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "No reset code found or it expired." });
    }

    // ✅ Check expiry
    if (record.expiresAt && record.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ email });
      return res.status(400).json({ message: "Reset code expired." });
    }

    // ✅ Must match exactly
    if (String(record.code).trim() !== String(code).trim()) {
      return res.status(400).json({ message: "Invalid reset code." });
    }

    res.json({ success: true, message: "Code verified successfully." });
  } catch (err) {
    console.error("Verify reset code error:", err);
    res.status(500).json({ message: "Failed to verify code." });
  }
});


// ============================================================
// RESET PASSWORD (After verifying code)
// ============================================================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const record = await EmailVerification.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    // ✅ Check expiry before accepting the code
    if (record.expiresAt && record.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ email });
      return res.status(400).json({ message: "Reset code expired." });
    }

    if (record.code !== code) {
      return res.status(400).json({ message: "Invalid verification code." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // ✅ Update password securely
    user.passwordManual = newPassword;
    await user.save();

    // ✅ Cleanup used verification code
    await EmailVerification.deleteOne({ email });

    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

// ==========================================================
// ✅ GET CURRENT USER (Auth Refresh) 
// ==========================================================
const { protect } = require("../middleware/authMiddleware");

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "_id firstName lastName email role loginMethod phone createdAt isAdmin"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // generate a fresh JWT reflecting any role changes
    const newToken = jwt.sign(
      { id: user._id, isAdmin: user.role === "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ ...user.toObject(), token: newToken });
  } catch (err) {
    console.error("❌ Error refreshing user:", err);
    res.status(500).json({ message: "Failed to refresh user info" });
  }
});


// ✅ Final export
module.exports = router;
// ============================================================
// server/routes/emailVerificationRoutes.js (UPDATED)
// ============================================================
const express = require("express");
const EmailVerification = require("../models/EmailVerification");
const User = require("../models/User");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const router = express.Router();

const EMAIL_SERVICE_URL = "https://bookstore-production-331b.up.railway.app/send";

// Helper: 6-digit random code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ============================================================
   SEND VERIFICATION CODE — Google users only
============================================================ */
router.post("/send-verification-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Check if user exists
    const user = await User.findOne({ email });

    // 🔐 CASE 1: Manual account exists → skip verification, tell to log in
    if (user && user.loginMethod.includes("email")) {
      return res.status(200).json({
        skipVerification: true,
        message: "This email is already registered with a manual password. Please log in instead.",
      });
    }

    // 🧠 CASE 2: Google-linked or new → send verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await EmailVerification.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    await fetch(EMAIL_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    console.log(`📤 Sent code ${code} to ${email}`);
    res.json({ message: "Verification code sent successfully." });
  } catch (err) {
    console.error("Send verification code error:", err);
    res.status(500).json({ message: "Failed to send verification code" });
  }
});

/* ============================================================
   VERIFY CODE — then classify account type
============================================================ */
router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ message: "Email and code required" });

    const record = await EmailVerification.findOne({ email });
    if (!record)
      return res.status(400).json({ message: "No verification record found" });
    if (record.code !== code)
      return res.status(400).json({ message: "Invalid verification code" });
    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "Verification code expired" });

    await EmailVerification.deleteOne({ email }); // clean up

    const user = await User.findOne({ email });

    // 🟢 CASE 1: Google-linked (no manual password yet)
    if (user && user.loginMethod.includes("google") && !user.loginMethod.includes("email")) {
      return res.json({
        verified: true,
        existing: true,
        googleLinked: true,
        message: "Email verified. This account is linked with Google.",
        userData: {
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phone: user.phone || "",
        },
      });
    }

    // 🟡 CASE 2: Manual account exists (should have been skipped)
    if (user && user.loginMethod.includes("email")) {
      return res.json({
        verified: true,
        existing: true,
        googleLinked: false,
        message:
          "This email is already registered with a manual password. Please log in instead.",
      });
    }

    // 🆕 CASE 3: Brand new user
    return res.json({
      verified: true,
      existing: false,
      googleLinked: false,
      message: "Email verified. You can now register a new account.",
    });
  } catch (err) {
    console.error("Verify code error:", err);
    res.status(500).json({ message: "Verification failed." });
  }
});

/* ============================================================
   NOTIFY OLD EMAIL OF CHANGE
============================================================ */
router.post("/notify-old-email-change", async (req, res) => {
  try {
    const { oldEmail, newEmail, date } = req.body;
    if (!oldEmail || !newEmail)
      return res.status(400).json({ message: "Missing email fields" });

    const EMAIL_SERVICE_URL = "https://bookstore-production-331b.up.railway.app/send";

    const subject = "Your Kommiku Vault Email Has Been Changed";
    const message = `
      <h3>Account Email Change Notice</h3>
      <p>Hello,</p>
      <p>This is to inform you that the email associated with your Kommiku Vault account has been changed.</p>
      <p>
        <strong>Old Email:</strong> ${oldEmail}<br/>
        <strong>New Email:</strong> ${newEmail}<br/>
        <strong>Date:</strong> ${date}
      </p>
      <p>If you did not make this change, please contact support immediately.</p>
      <p>Contact us: <a href="mailto:userx101111@gmail.com">userx101111@gmail.com</a></p>
      <br/>
      <p>— Kommiku Vault Security Team</p>
    `;

    const sendRes = await fetch(EMAIL_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: oldEmail, subject, message }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("❌ Notification send failed:", errText);
      return res.status(500).json({ message: "Email send failure." });
    }

    console.log(`📨 Notification email sent to old address: ${oldEmail}`);
    res.json({ success: true, message: "Notification email sent to old address." });
  } catch (err) {
    console.error("Notify old email error:", err);
    res.status(500).json({ message: "Failed to send notification email." });
  }
});


module.exports = router;

// ============================================================
// Email Service using Brevo (Sendinblue API)
// ============================================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  console.error("❌ Missing BREVO_API_KEY in environment variables.");
  process.exit(1);
}

console.log("📧 Using Brevo (HTTP API) for email sending");

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/", (req, res) => {
  res.send("✅ Email Service running on Railway (Brevo API Active)");
});

// ============================================================
// SEND EMAIL (Supports both verification code & general message)
// ============================================================
app.post("/send", async (req, res) => {
  try {
    const { email, code, subject, message } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Recipient email is required." });
    }

    // 🧠 Determine email type
    let emailSubject, emailContent;

    if (code) {
      // ✅ Verification code email
      emailSubject = "Your Verification Code";
      emailContent = `
        <h2>Your Verification Code</h2>
        <p>Your verification code is <strong>${code}</strong>.</p>
        <p>This code will expire in 5 minutes.</p>
        <p>Thank you,<br/>Kommiku Vault Team</p>
      `;
      console.log(`📤 Sending verification code ${code} to ${email}`);
    } else if (subject && message) {
      // ✅ General/custom email (e.g., notification)
      emailSubject = subject;
      emailContent = message;
      console.log(`📤 Sending general email to ${email} with subject: ${subject}`);
    } else {
      return res.status(400).json({ message: "Missing required email content." });
    }

    // 📨 Send via Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Kommiku Vault", email: "userx101111@gmail.com" },
        to: [{ email }],
        subject: emailSubject,
        htmlContent: emailContent,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Brevo API error:", text);
      throw new Error(`Brevo failed: ${response.status} ${response.statusText}`);
    }

    console.log(`✅ Email successfully sent to ${email}`);
    return res.json({ success: true, message: "Email sent successfully!" });
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    res.status(500).json({ message: "Failed to send email", error: err.message });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Email Service running on port ${PORT}`);
});

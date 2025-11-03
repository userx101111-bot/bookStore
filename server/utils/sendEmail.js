// server/utils/sendEmail.js
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

/**
 * Send an HTML email via your configured email service.
 * Returns the fetch response object.
 */
async function sendEmail({ to, subject, html }) {
  if (!to) throw new Error("Missing recipient");
  try {
    const res = await fetch("https://bookstore-production-331b.up.railway.app/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: to,
        subject,
        message: html,
      }),
    });
    return res;
  } catch (err) {
    console.error("❌ sendEmail failed:", err);
    throw err;
  }
}

module.exports = sendEmail;

// server/utils/paypalRefund.js
const axios = require("axios");

const PAYPAL_API_URL =
  process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

// Get access token
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");

  const { data } = await axios.post(
    `${PAYPAL_API_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token;
}

// Refund a PayPal payment (full or partial)
async function refundPayPalPayment(captureId, amount = null) {
  const token = await getPayPalAccessToken();

  const { data } = await axios.post(
    `${PAYPAL_API_URL}/v2/payments/captures/${captureId}/refund`,
    amount
      ? {
          amount: { value: amount, currency_code: "PHP" },
        }
      : {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return data;
}

module.exports = { refundPayPalPayment };

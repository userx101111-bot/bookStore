// utils/paypal.js
import fetch from "node-fetch";

const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const PAYPAL_API =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Get PayPal access token
export const getPayPalAccessToken = async () => {
  const auth = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to retrieve PayPal token");
  }

  return data.access_token;
};

// Refund a payment capture (full or partial)
export const refundPayPalPayment = async (captureId, amount = null) => {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: amount
      ? JSON.stringify({
          amount: { value: amount, currency_code: "PHP" },
        })
      : "{}", // Full refund if no amount specified
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("PayPal refund error:", data);
    throw new Error(data.message || "Refund failed");
  }

  return data;
};

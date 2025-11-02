// src/api/cartApi.js

const API_BASE =
  process.env.REACT_APP_API_URL ||
  "https://bookstore-yl7q.onrender.com";

// ✅ Create
export const addToCart = async (token, { productId, variantId, quantity }) => {
  const res = await fetch(`${API_BASE}/api/cart/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, variantId, quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to add to cart");
  return data.cart;
};

// ✅ Read
export const getCart = async (token) => {
  const res = await fetch(`${API_BASE}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch cart");
  return data;
};

// ✅ Update
export const updateCartQuantity = async (token, variantId, quantity) => {
  const res = await fetch(`${API_BASE}/api/cart/update/${variantId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update quantity");
  return data.cart;
};

// ✅ Delete
export const removeCartItem = async (token, variantId) => {
  const res = await fetch(`${API_BASE}/api/cart/remove/${variantId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to remove item");
  return data.cart;
};

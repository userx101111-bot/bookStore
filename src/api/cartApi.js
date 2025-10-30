const API_BASE =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://bookstore-yl7q.onrender.com"
    : "http://localhost:5000");

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

export const getCart = async (token) => {
  const res = await fetch(`${API_BASE}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
};

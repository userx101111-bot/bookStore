const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

export const getWishlist = async (token) => {
  const res = await fetch(`${API_URL}/api/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load wishlist");
  return res.json();
};

// ✅ Add variantId to request body
export const addToWishlist = async (token, productId, variantId) => {
  const res = await fetch(`${API_URL}/api/wishlist/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, variantId }),
  });
  if (!res.ok) throw new Error("Failed to add to wishlist");
  return res.json();
};

// ✅ Include variantId in URL when removing
export const removeFromWishlist = async (token, productId, variantId) => {
  const url = variantId
    ? `${API_URL}/api/wishlist/remove/${productId}/${variantId}`
    : `${API_URL}/api/wishlist/remove/${productId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to remove from wishlist");
  return res.json();
};

export const clearWishlist = async (token) => {
  const res = await fetch(`${API_URL}/api/wishlist/clear`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to clear wishlist");
  return res.json();
};

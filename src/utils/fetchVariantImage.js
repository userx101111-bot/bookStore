import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL || "https://bookstore-yl7q.onrender.com";

const productCache = {};

export const fetchVariantImage = async (productId, variantId) => {
  try {
    if (!productId || !variantId) {
      console.warn("⚠️ Missing productId or variantId");
      return "/assets/placeholder-image.png";
    }

    let product = productCache[productId];
    if (!product) {
      try {
        // Try by-id first
        const { data } = await axios.get(`${API_URL}/api/products/by-id/${productId}`);
        product = data;
      } catch {
        // Fallback to slug
        const { data } = await axios.get(`${API_URL}/api/products/${productId}`);
        product = data;
      }
      productCache[productId] = product;
    }

    const variant = product.variants?.find(
      (v) => v._id === variantId || v._id?.toString() === variantId?.toString()
    );

    return (
      variant?.mainImage ||
      (variant?.albumImages?.length ? variant.albumImages[0] : null) ||
      "/assets/placeholder-image.png"
    );
  } catch (err) {
    console.error("❌ Error fetching variant image:", err.message);
    return "/assets/placeholder-image.png";
  }
};

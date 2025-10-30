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

    // ✅ Use cache
    let product = productCache[productId];
    if (!product) {
      const { data } = await axios.get(`${API_URL}/api/products/${productId}`);
      product = data;
      productCache[productId] = data;
    }

    // ✅ Find variant by _id
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

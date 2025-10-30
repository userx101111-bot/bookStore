import React, { createContext, useContext, useState } from "react";
import { useUser } from "./UserContext";
import { addToCart, getCart } from "../api/cartApi";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { getToken, isGuest } = useUser();
  const [cart, setCart] = useState([]); // ✅ store as array, not object

  // Helper: Normalize backend cart structure
const normalizeCartData = (data) => {
  if (!data || !data.items) return [];
  return data.items.map((i) => ({
    id: i._id,
    productId: i.product?._id || i.product,
    variantId: i.variant_id,
    name: i.product?.name || "Unknown Product",
    price: i.price || 0, // original price
    final_price: i.final_price || i.price || 0, // ✅ discounted price
    quantity: i.quantity || 1,
    format: i.variant_format || "",
    subtotal: i.subtotal || i.final_price * (i.quantity || 1) || 0,
    discount_type: i.discount_type,
    discount_value: i.discount_value,
    image:
      i.product?.mainImage ||
      i.product?.image ||
      "/assets/placeholder-image.png",
  }));
};



  const fetchCart = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await getCart(token);
      console.log("🧾 Raw cart from backend:", data);
      setCart(normalizeCartData(data));
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    }
  };

  const handleAddToCart = async (productId, variantId, quantity = 1) => {
    try {
      const token = getToken();
      if (isGuest) {
        alert("Please log in to add items to cart");
        return;
      }
      const updatedCart = await addToCart(token, {
        productId,
        variantId,
        quantity,
      });
      setCart(normalizeCartData(updatedCart));
    } catch (err) {
      console.error("Add to cart failed:", err);
    }
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    // TODO: optionally call backend DELETE /api/cart/remove/:variantId
  };

  const updateQuantity = (id, newQty) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQty } : item
      )
    );
    // TODO: optionally call backend PATCH /api/cart/update/:variantId
  };

  return (
    <CartContext.Provider
      value={{ cart, handleAddToCart, fetchCart, removeFromCart, updateQuantity }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

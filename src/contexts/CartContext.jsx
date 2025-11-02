// src/contexts/CartContext.jsx
import React, { createContext, useContext, useState } from "react";
import { useUser } from "./UserContext";
import {
  addToCart,
  getCart,
  updateCartQuantity,
  removeCartItem,
} from "../api/cartApi";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { getToken, isGuest } = useUser();
  const [cart, setCart] = useState([]);

  // ✅ Normalize backend cart structure
  const normalizeCartData = (data) => {
    if (!data || !data.items) return [];
    return data.items.map((i) => ({
      id: i._id,
      productId: i.product?._id || i.product,
      variantId: i.variant_id,
      name: i.product?.name || "Unknown Product",
      slug: i.product?.slug || "",
      price: i.price || 0,
      final_price: i.final_price || i.price || 0,
      quantity: i.quantity || 1,
      format: i.variant_format || i.format || "standard",
      variant_format: i.variant_format || i.format || "standard",
      subtotal: i.subtotal || i.final_price * (i.quantity || 1),
      discount_type: i.discount_type,
      discount_value: i.discount_value,
      image:
        i.product?.mainImage ||
        i.product?.image ||
        "/assets/placeholder-image.png",
    }));
  };

  // ✅ Fetch cart from backend
  const fetchCart = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await getCart(token);
      setCart(normalizeCartData(data));
    } catch (err) {
      console.error("❌ Failed to fetch cart:", err);
    }
  };

  // ✅ Add item to cart
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
      console.error("❌ Add to cart failed:", err);
    }
  };

  // ✅ Update quantity (PATCH)
  const updateQuantity = async (variantId, newQty) => {
    if (newQty < 1) return;
    try {
      const token = getToken();
      const updatedCart = await updateCartQuantity(token, variantId, newQty);
      setCart(normalizeCartData(updatedCart));
    } catch (err) {
      console.error("❌ Update quantity failed:", err);
    }
  };

  // ✅ Remove item (DELETE)
  const removeFromCart = async (variantId) => {
    try {
      const token = getToken();
      const updatedCart = await removeCartItem(token, variantId);
      setCart(normalizeCartData(updatedCart));
    } catch (err) {
      console.error("❌ Remove item failed:", err);
    }
  };

  // ✅ CLEAR CART (used after successful checkout)
  const clearCart = () => {
    try {
      setCart([]); // clear frontend state
      localStorage.removeItem("cart"); // clear any locally stored cart data
    } catch (err) {
      console.error("❌ Failed to clear cart:", err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        fetchCart,
        handleAddToCart,
        updateQuantity,
        removeFromCart,
        clearCart, // ✅ exported properly
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

//src/contexts/CartContext.jsx
import React, { createContext, useContext, useState } from "react";
import { useUser } from "./UserContext";
import { addToCart, getCart } from "../api/cartApi";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { getToken, isGuest } = useUser();
  const [cart, setCart] = useState({ items: [] });

  const fetchCart = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await getCart(token);
      setCart(data);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    }
  };

  const handleAddToCart = async (productId, variantId, quantity = 1) => {
    try {
      const token = getToken();
      if (isGuest) return alert("Please log in to add items to cart");
      const updatedCart = await addToCart(token, { productId, variantId, quantity });
      setCart(updatedCart);
    } catch (err) {
      console.error("Add to cart failed:", err);
    }
  };

  return (
    <CartContext.Provider value={{ cart, handleAddToCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

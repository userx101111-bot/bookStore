//src/contexts/CartContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "./UserContext";

// Create context
export const CartContext = createContext();

// Provider component
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const { user, isGuest } = useUser();

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

  // -------------------------------
  // 🔹 Fetch cart from backend or local storage
  // -------------------------------
  const fetchCartFromDB = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("⚠️ No token found — cannot fetch cart from DB");
        return;
      }

      const res = await fetch(`${API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch cart");

      // Map backend data → frontend-friendly structure
      const mappedCart = Array.isArray(data)
        ? data
            .filter((item) => item.productId)
            .map((item) => ({
              _id: item._id,
              id: item.productId._id,
              name: item.productId.name,
              price: item.productId.price,
              image: item.productId.image,
              quantity: item.quantity,
            }))
        : [];

      setCart(mappedCart);
      console.log("🟢 Cart fetched from DB:", mappedCart);
    } catch (err) {
      console.error("❌ Error fetching backend cart:", err);
    }
  };

  // -------------------------------
  // 🔹 Load cart on login / user change
  // -------------------------------
  useEffect(() => {
    if (!isGuest && user?._id) {
      fetchCartFromDB();
    } else {
      const guestCart = JSON.parse(localStorage.getItem("guestCart")) || [];
      setCart(guestCart);
      console.log("🟠 Loaded guest cart:", guestCart);
    }
  }, [user, isGuest]);

  // -------------------------------
  // 🔹 Add to Cart (ProductPage)
  // -------------------------------
  const addToCart = async (product, quantity) => {
    if (!product || !quantity) {
      console.warn("⚠️ Invalid addToCart parameters");
      return;
    }

    if (!isGuest && user?._id) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/cart`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: product._id, quantity }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to add to backend cart");

        // ✅ Backend returns full updated cart array
        const mappedCart = Array.isArray(data)
          ? data
              .filter((item) => item.productId)
              .map((item) => ({
                _id: item._id,
                id: item.productId._id,
                name: item.productId.name,
                price: item.productId.price,
                image: item.productId.image,
                quantity: item.quantity,
              }))
          : [];

        setCart(mappedCart);
        console.log("🟢 Cart updated after add:", mappedCart);
      } catch (err) {
        console.error("❌ Failed to add to backend cart:", err);
      }
    } else {
      // Guest mode → store locally
      setCart((prev) => {
        const existing = prev.find((item) => item.id === product._id);
        let newCart;
        if (existing) {
          newCart = prev.map((item) =>
            item.id === product._id
              ? {
                  ...item,
                  quantity: Math.min(
                    item.quantity + quantity,
                    product.countInStock
                  ),
                }
              : item
          );
        } else {
          newCart = [...prev, { ...product, id: product._id, quantity }];
        }
        localStorage.setItem("guestCart", JSON.stringify(newCart));
        return newCart;
      });
      console.log("🟠 Added to guest cart");
    }
  };

  // -------------------------------
  // 🔹 Update quantity
  // -------------------------------
  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (!isGuest && user?._id) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/cart/${productId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update backend cart");

        // Backend returns full cart again
        const mappedCart = Array.isArray(data)
          ? data
              .filter((item) => item.productId)
              .map((item) => ({
                _id: item._id,
                id: item.productId._id,
                name: item.productId.name,
                price: item.productId.price,
                image: item.productId.image,
                quantity: item.quantity,
              }))
          : [];

        setCart(mappedCart);
        console.log("🟢 Cart updated after quantity change:", mappedCart);
      } catch (err) {
        console.error("❌ Error updating backend cart quantity:", err);
      }
    } else {
      // Guest mode
      setCart((prev) => {
        const updated = prev.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        );
        localStorage.setItem("guestCart", JSON.stringify(updated));
        return updated;
      });
      console.log("🟠 Updated guest cart quantity");
    }
  };

  // -------------------------------
  // 🔹 Remove item
  // -------------------------------
  const removeFromCart = async (productId) => {
    if (!isGuest && user?._id) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/cart/${productId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to remove item");

        // Backend returns full updated cart
        const mappedCart = Array.isArray(data)
          ? data
              .filter((item) => item.productId)
              .map((item) => ({
                _id: item._id,
                id: item.productId._id,
                name: item.productId.name,
                price: item.productId.price,
                image: item.productId.image,
                quantity: item.quantity,
              }))
          : [];

        setCart(mappedCart);
        console.log("🟢 Item removed from backend cart:", mappedCart);
      } catch (err) {
        console.error("❌ Failed to remove backend cart item:", err);
      }
    } else {
      // Guest mode
      setCart((prev) => {
        const updated = prev.filter((item) => item.id !== productId);
        localStorage.setItem("guestCart", JSON.stringify(updated));
        return updated;
      });
      console.log("🟠 Removed from guest cart");
    }
  };

  // -------------------------------
  // 🔹 Clear entire cart
  // -------------------------------
  const clearCart = async () => {
    if (!isGuest && user?._id) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = await res.json();

        if (Array.isArray(items)) {
          for (const item of items) {
            await fetch(`${API_URL}/api/cart/${item.productId._id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }
        setCart([]);
        console.log("🟢 Backend cart cleared");
      } catch (err) {
        console.error("❌ Error clearing backend cart:", err);
      }
    } else {
      setCart([]);
      localStorage.removeItem("guestCart");
      console.log("🟠 Cleared guest cart");
    }
  };

  // -------------------------------
  // 🔹 Context value
  // -------------------------------
  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook to use cart
export const useCart = () => useContext(CartContext);

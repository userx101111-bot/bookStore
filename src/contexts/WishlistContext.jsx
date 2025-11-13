import React, { createContext, useContext, useState, useEffect } from "react";
import { addToWishlist, removeFromWishlist, getWishlist, clearWishlist } from "../api/wishlistApi";
import { useUser } from "./UserContext";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { getToken, isGuest } = useUser();
  const [wishlist, setWishlist] = useState([]);

  const fetchWishlist = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const data = await getWishlist(token);
      setWishlist(data.items || []);
    } catch (err) {
      console.error("❌ Fetch wishlist:", err);
    }
  };

  //  Add variantId
  const handleAddToWishlist = async (productId, variantId) => {
    if (isGuest) return alert("Please log in to use the wishlist.");
    try {
      const token = getToken();
      await addToWishlist(token, productId, variantId);
      await fetchWishlist();
    } catch (err) {
      console.error("❌ Add to wishlist:", err);
    }
  };

  //  Include variantId
  const handleRemoveFromWishlist = async (productId, variantId) => {
    try {
      const token = getToken();
      await removeFromWishlist(token, productId, variantId);
      await fetchWishlist();
    } catch (err) {
      console.error("❌ Remove from wishlist:", err);
    }
  };

  const handleClearWishlist = async () => {
    try {
      const token = getToken();
      await clearWishlist(token);
      setWishlist([]);
    } catch (err) {
      console.error("❌ Clear wishlist:", err);
    }
  };

  //  Check both product + variant
  const isInWishlist = (productId, variantId) =>
    wishlist.some(
      (i) =>
        i.product?._id === productId &&
        (!variantId || i.variant?._id === variantId)
    );

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        fetchWishlist,
        handleAddToWishlist,
        handleRemoveFromWishlist,
        handleClearWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);

// =======================================
// ✅ WishlistPage.jsx (Same Add to Cart as ProductPage)
// =======================================
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FaTrashAlt, FaShoppingCart, FaHeartBroken } from "react-icons/fa";
import { useWishlist } from "../contexts/WishlistContext";
import "./WishlistPage.css";
import { CSSTransition, TransitionGroup } from "react-transition-group";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const WishlistPage = () => {
  const navigate = useNavigate();
  const { wishlist, handleRemoveFromWishlist, handleClearWishlist } =
    useWishlist();

  const [showMiniCart, setShowMiniCart] = useState(false);
  const [miniCartData, setMiniCartData] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [removingItemIds, setRemovingItemIds] = useState([]);


const handleAnimatedRemove = (productId, variantId) => {
  handleRemoveFromWishlist(productId, variantId);
};

  // ✅ Same logic as ProductPage
  const handleMoveToCart = async (product, variant) => {
    if (!product || !variant) return;

    try {
      setCartLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to add items to your cart.");
        navigate("/login", { state: { from: "/wishlist" } });
        return;
      }

      const cleanVariantId = String(variant._id).includes("-")
        ? String(variant._id).split("-").pop()
        : String(variant._id);

      const cleanProductId = String(product._id).includes("-")
        ? String(product._id).split("-")[0]
        : String(product._id);

      if (!cleanProductId || !cleanVariantId) {
        alert("Invalid product or variant ID");
        return;
      }

      const cartItem = {
        productId: cleanProductId,
        variantId: cleanVariantId,
        quantity: 1,
      };

      const res = await axios.post(`${API_URL}/api/cart/add`, cartItem, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const cart = res.data?.cart || {};
      let addedItem = null;

      if (Array.isArray(cart.items)) {
        addedItem =
          cart.items.find(
            (i) =>
              String(i.product) === cleanProductId &&
              String(i.variant_id).endsWith(cleanVariantId)
          ) || cart.items[cart.items.length - 1];
      }

      const priceToShow =
        (addedItem && (addedItem.final_price ?? addedItem.price)) ||
        variant.price ||
        0;

      const subtotalToShow =
        (addedItem && (addedItem.subtotal ?? priceToShow)) || priceToShow;

      setMiniCartData({
        name: product.name,
        format: variant.format,
        image:
          variant.mainImage ||
          product.image ||
          "/assets/placeholder-image.png",
        price: Number(priceToShow),
        subtotal: Number(subtotalToShow),
      });

      setShowMiniCart(true);
      setTimeout(() => setShowMiniCart(false), 3500);
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      if (err?.response?.status === 401) {
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert("Failed to add to cart. Please try again.");
    } finally {
      setCartLoading(false);
    }
  };

  // 🩶 Empty Wishlist
  if (!wishlist.length)
    return (
      <div className="wishlist-empty-page">
        <div className="wishlist-empty">
          <FaHeartBroken className="empty-icon" />
          <h2>Your wishlist is empty</h2>
          <p>Start adding your favorite Manga and come back later ❤️</p>
          <Link to="/" className="btn-primary">
            Browse Manga
          </Link>
        </div>
      </div>
    );

  return (
    <section className="wishlist-container">
      <div className="wishlist-header">
        <h1>My Wishlist</h1>
        <button className="btn-clear" onClick={handleClearWishlist}>
          <FaTrashAlt /> Clear All
        </button>
      </div>

<TransitionGroup className="wishlist-grid">
  {wishlist.map((item) => {
    const { product, variant } = item;
    const displayVariant =
      variant || product.variants?.[0] || { format: "Standard" };
    const imageSrc =
      displayVariant.mainImage || product.image || "/no-image.jpg";
    const price = displayVariant.price || 0;
    const itemKey = `${product._id}-${displayVariant._id}`;

    return (
      <CSSTransition
        key={itemKey}
        timeout={400}
        classNames="fade"
      >
        <div className="wishlist-card">
          <Link
            to={`/product/${product.slug}/${displayVariant.format?.toLowerCase()}`}
            className="image-wrapper"
          >
            <img
              src={imageSrc}
              alt={`${product.name} (${displayVariant.format})`}
              loading="lazy"
            />
          </Link>

          <div className="wishlist-info">
            <h3 className="product-title">{product.name}</h3>
            <p className="product-author">by {product.author}</p>
            <p className="variant-format">Format: {displayVariant.format}</p>
            <p className="variant-price">₱{price.toFixed(2)}</p>

            <div className="wishlist-actions">
              <button
                className="btn-cart"
                disabled={cartLoading}
                onClick={() => handleMoveToCart(product, displayVariant)}
              >
                {cartLoading ? (
                  "Adding..."
                ) : (
                  <>
                    <FaShoppingCart /> Move to Cart
                  </>
                )}
              </button>

              <button
                className="btn-remove"
                onClick={() =>
                  handleRemoveFromWishlist(product._id, displayVariant._id)
                }
              >
                <FaTrashAlt /> Remove
              </button>
            </div>
          </div>
        </div>
      </CSSTransition>
    );
  })}
</TransitionGroup>


      {/* 🛒 Mini Cart Drawer */}
      {showMiniCart && miniCartData && (
        <div className="mini-cart-drawer">
          <div className="mini-cart-content">
            <img
              src={miniCartData.image || "/assets/placeholder-image.png"}
              alt={miniCartData.name}
              className="mini-cart-thumb"
            />
            <div className="mini-cart-details">
              <p className="mini-cart-name">{miniCartData.name}</p>
              <p className="mini-cart-variant">{miniCartData.format}</p>
              <p className="mini-cart-price">
                ₱{miniCartData.price.toFixed(2)}
              </p>
              <p className="mini-cart-subtotal">
                Subtotal: ₱{miniCartData.subtotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mini-cart-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowMiniCart(false)}
            >
              Continue Shopping
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate("/cart")}
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default WishlistPage;

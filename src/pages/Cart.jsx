import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { FaTrashAlt, FaArrowRight } from "react-icons/fa";
import { useCart } from "../contexts/CartContext";
import { fetchVariantImage } from "../utils/fetchVariantImage";
import "./Cart.css";

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, fetchCart } = useCart();
  const [cartWithImages, setCartWithImages] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  // Fetch cart from backend
  useEffect(() => {
    fetchCart();
  }, []);

  // Load variant images
  useEffect(() => {
    const loadImages = async () => {
      const updated = await Promise.all(
        cart.map(async (item) => {
          const productId = item.productId;
          const variantId = item.variantId;
          const img = await fetchVariantImage(productId, variantId);
          return { ...item, image: img || item.image };
        })
      );
      setCartWithImages(updated);

      // Default: check all items
      const initialChecks = {};
      cart.forEach((i) => (initialChecks[i.id] = false));
      setCheckedItems(initialChecks);
    };
    if (cart.length > 0) loadImages();
  }, [cart]);

  // Toggle selection
  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Select all
  const toggleAll = (checked) => {
    const newChecks = {};
    cartWithImages.forEach((item) => {
      newChecks[item.id] = checked;
    });
    setCheckedItems(newChecks);
  };

  // Compute subtotal only for checked items
  const subtotal = cartWithImages.reduce(
    (sum, item) =>
      checkedItems[item.id] ? sum + item.final_price * item.quantity : sum,
    0
  );

  // Proceed to checkout with selected
  const handleCheckout = () => {
    const selected = cartWithImages.filter((i) => checkedItems[i.id]);
    if (selected.length === 0) {
      alert("Please select at least one item to proceed to checkout.");
      return;
    }
    navigate("/checkout", { state: { cartItems: selected } });
  };

  // Show confirmation modal
  const confirmRemove = (item) => {
    setItemToRemove(item);
    setShowModal(true);
  };

  // Confirm removal
  const handleConfirmRemove = async () => {
    if (itemToRemove) {
      await removeFromCart(itemToRemove.variantId);
      await fetchCart(); // Refresh cart after removal
      setCartWithImages((prev) =>
        prev.filter((i) => i.variantId !== itemToRemove.variantId)
      );
      setCheckedItems((prev) => {
        const updated = { ...prev };
        delete updated[itemToRemove.id];
        return updated;
      });
    }
    setShowModal(false);
    setItemToRemove(null);
  };

  // Cancel removal
  const handleCancelRemove = () => {
    setShowModal(false);
    setItemToRemove(null);
  };

  // 🧭 Navigate to Product Page
  const handleNavigateToProduct = (item) => {
    const slug = item.product?.slug || item.slug;
    const variant = item.variant_format?.toLowerCase() || "standard";
    if (!slug) {
      alert("This product link is unavailable.");
      return;
    }
    navigate(`/product/${slug}/${variant}`);
  };

  return (
    <div className="modern-cart-container">
      {cartWithImages.length === 0 ? (
        <div className="empty-cart">
          <h3>Your cart is empty</h3>
          <p>Browse our collections and add something you love!</p>
          <Link to="/" className="btn-continue">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items">
            <div className="cart-header-row">
              <h2 className="cart-header">Shopping Cart</h2>
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={
                    Object.keys(checkedItems).length > 0 &&
                    Object.values(checkedItems).every(Boolean)
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
                <span>Select All</span>
              </label>
            </div>

{[...cartWithImages]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .map((item) => (
              <div key={item.id} className="cart-card">
                <div className="checkbox-area">
                  <input
                    type="checkbox"
                    checked={checkedItems[item.id] || false}
                    onChange={() => toggleCheck(item.id)}
                  />
                </div>

                {/* 🖼 Clickable Product Image */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-img clickable"
                  onClick={() => handleNavigateToProduct(item)}
                  onError={(e) =>
                    (e.target.src = "/assets/placeholder-image.png")
                  }
                />

                <div className="cart-details">
                  {/* 🧭 Clickable Product Name */}
                  <h3
                    className="cart-name clickable"
                    onClick={() => handleNavigateToProduct(item)}
                  >
                    {item.name}
                  </h3>
                  <p className="cart-format">Format: {item.format}</p>
                  {item.discount_value > 0 ? (
                    <p className="cart-price">
                      <span className="old-price">
                        ₱{item.price.toFixed(2)}
                      </span>
                      <span className="new-price">
                        ₱{item.final_price.toFixed(2)}
                      </span>
                    </p>
                  ) : (
                    <p className="cart-price">₱{item.price.toFixed(2)}</p>
                  )}
                  <div className="quantity-box">
                    <button
                      onClick={() =>
                        updateQuantity(item.variantId, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.variantId, item.quantity + 1)
                      }
                    >
                      ＋
                    </button>
                  </div>
                </div>

                <div className="cart-actions">
                  <span className="cart-subtotal">
                    ₱{(item.final_price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    className="remove-btn-modern"
                    title="Remove from cart"
                    onClick={() => confirmRemove(item)}
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary-modern">
            <h3>Order Summary</h3>
            <div className="summary-line">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <p className="summary-note">
              Shipping calculated at checkout.
            </p>

            <button className="checkout-btn-modern" onClick={handleCheckout}>
              Proceed to Checkout <FaArrowRight />
            </button>

            <Link to="/" className="continue-link">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      )}

      {/* 🧾 Remove Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Remove item</h3>
            <p>
              Are you sure you want to remove{" "}
              <strong>{itemToRemove?.name}</strong> from your cart?
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={handleCancelRemove}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleConfirmRemove}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

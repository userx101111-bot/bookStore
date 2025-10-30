import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { FaShoppingBag } from "react-icons/fa";
import "./Cart.css";
import { useCart } from "../contexts/CartContext";
import { fetchVariantImage } from "../utils/fetchVariantImage";

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, fetchCart } = useCart();
  const [checkedItems, setCheckedItems] = useState({});
  const [cartWithImages, setCartWithImages] = useState([]);

  // ✅ Fetch cart from backend
  useEffect(() => {
    fetchCart();
  }, []);

  // ✅ Fetch and attach main image for each variant
  useEffect(() => {
const loadVariantImages = async () => {
  const updated = await Promise.all(
    cart.map(async (item) => {
      const productId = item.productId;
      const variantId = item.variantId;

      if (!productId || !variantId) {
        console.warn("⚠️ Missing IDs for cart item:", item);
        return { ...item, image: "/assets/placeholder-image.png" };
      }

      const img = await fetchVariantImage(productId, variantId);
      return { ...item, image: img };
    })
  );

  setCartWithImages(updated);
};




    if (cart.length > 0) loadVariantImages();
  }, [cart]);

  // ✅ Default all items to checked
  useEffect(() => {
    const initialChecks = {};
    cart.forEach((item) => (initialChecks[item.id] = true));
    setCheckedItems(initialChecks);
  }, [cart]);

  // ✅ Toggle selection
  const toggleCheck = (id) =>
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  // ✅ Proceed to checkout with selected items
  const handleCheckout = () => {
    const itemsToCheckout = cartWithImages.filter(
      (item) => checkedItems[item.id]
    );
    navigate("/checkout", { state: { cartItems: itemsToCheckout } });
  };

  // ✅ Totals
  const subtotal = cartWithImages.reduce(
    (sum, item) =>
      checkedItems[item.id] ? sum + item.price * item.quantity : sum,
    0
  );

  const totalBeforeDiscount = cartWithImages.reduce(
    (sum, item) =>
      checkedItems[item.id]
        ? sum + (item.originalPrice || item.price) * item.quantity
        : sum,
    0
  );

  const totalDiscount = totalBeforeDiscount - subtotal;

  // ✅ Render
  return (
    <div className="container">
      <div className="subcontainer">
        <h2 className="title">Your Shopping Cart</h2>

        {cartWithImages.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/home-page">
              <button className="continue-shopping">
                <FaShoppingBag style={{ marginRight: "10px" }} /> Continue
                Shopping
              </button>
            </Link>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th></th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cartWithImages.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedItems[item.id] || false}
                        onChange={() => toggleCheck(item.id)}
                      />
                    </td>
                    <td>
<img
  src={item.image || "/assets/placeholder-image.png"}
  alt={item.name}
  className="image"
  onError={(e) => (e.target.src = "/assets/placeholder-image.png")}
/>
                    </td>
                    <td>
                      <div className="product-info">
                        <strong>{item.name}</strong>
                        <p className="variant">
                          Format: {item.variant_format}
                        </p>

                        {item.discount_value > 0 ? (
                          <p className="price discounted">
                            <span className="original">
                              ₱
                              {item.price.toFixed(2) ||
                                (
                                  item.price +
                                  item.discount_value
                                ).toFixed(2)}
                            </span>{" "}
                            <span className="discounted">
                              ₱{item.final_price?.toFixed(2) || item.price}
                            </span>{" "}
                            <span className="badge-discount">
                              {item.discount_type === "percentage"
                                ? `-${item.discount_value}%`
                                : `₱${item.discount_value} OFF`}
                            </span>
                          </p>
                        ) : (
                          <p className="price">₱{item.price.toFixed(2)}</p>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="quantityControl">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="qtyBtn"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="qtyValue">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="qtyBtn"
                        >
                          ＋
                        </button>
                      </div>
                    </td>

                    <td>
                      ₱{(item.final_price * item.quantity).toFixed(2)}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="remove-btn"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ✅ Cart Summary */}
            <div className="cart-summary">
              <div className="summary-line">
                <span>Subtotal:</span>
                <span>₱{totalBeforeDiscount.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="summary-line discount">
                  <span>Discounts:</span>
                  <span>−₱{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-line total">
                <strong>Total:</strong>
                <strong>₱{subtotal.toFixed(2)}</strong>
              </div>

              <div className="cart-actions">
                <Link to="/home-page">
                  <button className="continue-shopping">
                    Continue Shopping
                  </button>
                </Link>
                <button onClick={handleCheckout} className="checkout">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ height: "450px" }}></div>
    </div>
  );
};

export default Cart;

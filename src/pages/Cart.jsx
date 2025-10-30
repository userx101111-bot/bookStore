import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { FaShoppingBag } from "react-icons/fa";
import axios from "axios";
import "./Cart.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [error, setError] = useState(null);

  // ============================================================
  // 🔹 Fetch user’s cart from backend
  // ============================================================
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/cart`, {
          withCredentials: true,
        });
        const data = res.data;
        if (data?.items) {
          setCart(data.items);
          // Initialize all items as checked
          const initialChecks = {};
          data.items.forEach(
            (item) => (initialChecks[item.variantId] = true)
          );
          setCheckedItems(initialChecks);
        }
      } catch (err) {
        console.error("❌ Error fetching cart:", err);
        setError("Please sign in to view your cart.");
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, []);

  // ============================================================
  // 🔹 Update item quantity
  // ============================================================
  const updateQuantity = async (variantId, newQty) => {
    if (newQty < 1) return;

    try {
      await axios.patch(
        `${API_URL}/api/cart/update`,
        { variantId, quantity: newQty },
        { withCredentials: true }
      );

      setCart((prev) =>
        prev.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: newQty, subtotal: item.price * newQty }
            : item
        )
      );
    } catch (err) {
      console.error("❌ Error updating quantity:", err);
      alert("Failed to update quantity.");
    }
  };

  // ============================================================
  // 🔹 Remove item
  // ============================================================
  const removeFromCart = async (variantId) => {
    try {
      await axios.delete(`${API_URL}/api/cart/remove/${variantId}`, {
        withCredentials: true,
      });
      setCart((prev) => prev.filter((i) => i.variantId !== variantId));
    } catch (err) {
      console.error("❌ Error removing item:", err);
      alert("Failed to remove item.");
    }
  };

  // ============================================================
  // 🔹 Checkout navigation
  // ============================================================
  const handleCheckout = () => {
    const selectedItems = cart.filter((i) => checkedItems[i.variantId]);
    if (selectedItems.length === 0)
      return alert("Please select at least one item.");
    navigate("/checkout", { state: { cartItems: selectedItems } });
  };

  const toggleCheck = (variantId) => {
    setCheckedItems((prev) => ({
      ...prev,
      [variantId]: !prev[variantId],
    }));
  };

  const totalAmount = cart.reduce(
    (sum, item) =>
      checkedItems[item.variantId] ? sum + (item.subtotal || 0) : sum,
    0
  );

  if (loading) return <div className="loading">Loading your cart...</div>;
  if (error)
    return (
      <div className="error-message">
        <p>{error}</p>
        <Link to="/login">
          <button className="btn-primary">Sign In</button>
        </Link>
      </div>
    );

  return (
    <div className="container">
      <div className="subcontainer">
        <h2 className="title">YOUR CART</h2>

        {cart.length === 0 ? (
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
                  <th className="th"></th>
                  <th className="th"></th>
                  <th className="th">Product</th>
                  <th className="th">Quantity</th>
                  <th className="th">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => {
                  const product = item.product || {};
                  const variant = product.variants?.find(
                    (v) => v._id === item.variantId
                  );

                  return (
                    <tr key={item.variantId} className="tr">
                      <td className="tdcheckbox">
                        <input
                          type="checkbox"
                          checked={checkedItems[item.variantId] || false}
                          onChange={() => toggleCheck(item.variantId)}
                          className="checkbox"
                        />
                      </td>
                      <td className="td">
                        <img
                          src={
                            variant?.mainImage ||
                            product.image ||
                            "/assets/placeholder-image.png"
                          }
                          alt={product.name}
                          className="image"
                        />
                      </td>
                      <td className="td">
                        <div>
                          <strong>{product.name}</strong>
                          {variant?.format && (
                            <p>Format: {variant.format}</p>
                          )}
                          <p>Price: ₱{item.price.toFixed(2)}</p>
                        </div>
                      </td>
                      <td className="td">
                        <div className="quantityControl">
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                            className="qtyBtn"
                          >
                            −
                          </button>
                          <span className="qtyValue">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                            className="qtyBtn"
                          >
                            ＋
                          </button>
                        </div>
                      </td>
                      <td className="td">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </td>
                      <td>
                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="footer">
              <p className="total">
                Estimated Total: ₱{totalAmount.toFixed(2)}
              </p>
              <button onClick={handleCheckout} className="checkout">
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
      <div style={{ height: "450px" }}></div>
    </div>
  );
};

export default Cart;

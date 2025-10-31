import React, { useState, useEffect } from "react";
import { MdKeyboardArrowRight } from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./checkOut.css";
import { useCart } from "../contexts/CartContext";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("cash on delivery");

  // 🧠 Load cart + user
  useEffect(() => {
    if (location.state?.cartItems) {
      setCartItems(location.state.cartItems);
    } else {
      const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      setCartItems(storedCart);
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, [location]);

  // 🧮 Totals
  const merchandiseSubTotal = cartItems.reduce(
    (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
    0
  );
  const discountTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      ((item.originalPrice ? item.originalPrice - item.price : 0) *
        item.quantity),
    0
  );
  const shipping = 100;
  const totalPayment = merchandiseSubTotal - discountTotal + shipping;
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 🏠 Prepare address safely
  const address = user?.address || {};
  const fullAddress =
    address.houseNumber || address.street || address.barangay
      ? `${address.houseNumber ? address.houseNumber + " " : ""}${
          address.street || address.addressLine1 || ""
        }, ${address.barangay || ""}, ${address.city || ""}, ${
          address.region || address.state || address.province || ""
        }, ${address.zip || address.postalCode || ""}`
      : "No address provided";

  // 🚀 Handle Checkout
  const handleCheckout = async () => {
    if (!user || !user.token) {
      alert("Please log in to complete your purchase.");
      navigate("/login");
      return;
    }

    if (
      !user.address ||
      (!user.address.street && !user.address.houseNumber)
    ) {
      alert("Please add your shipping address before checking out.");
      navigate("/address");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty. Please add items before checking out.");
      navigate("/products");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const orderData = {
        userId: user._id || user.id,
        products: cartItems.map((item) => ({
          productId: item.productId || item.id,
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: item.price,
        })),
        shippingAddress: {
          houseNumber: user.address.houseNumber || "",
          street: user.address.street || "",
          barangay: user.address.barangay || "",
          city: user.address.city || "",
          region:
            user.address.region ||
            user.address.state ||
            user.address.province ||
            "",
          postalCode: user.address.zip || user.address.postalCode || "",
          country: user.address.country || "Philippines",
        },
        paymentMethod,
        totalAmount: totalPayment,
        status: "pending",
      };

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const response = await axios.post(
        `https://bookstore-yl7q.onrender.com/api/orders`,
        orderData,
        config
      );

      if (response.data) {
        localStorage.removeItem("cart");
        clearCart();
        navigate("/order-success", {
          state: {
            orderId: response.data._id,
            orderTotal: totalPayment,
          },
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to process your order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="subcontainer">
        <h2 className="title">CHECKOUT</h2>

        {/* 🛍️ Cart Items */}
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.length > 0 ? (
              cartItems.map((item) => (
                <tr key={item.id}>
                  <td className="tdimage">
                    <img src={item.image} alt={item.name} />
                  </td>
                  <td className="tdnameprice">
                    <strong>{item.name}</strong>
                    <p className="variant">Format: {item.format || "—"}</p>
                    {item.discount_value > 0 ? (
                      <p className="price discounted">
                        <span className="original">
                          ₱
                          {item.originalPrice?.toFixed(2) ||
                            (item.price + item.discount_value).toFixed(2)}
                        </span>{" "}
                        <span className="discounted">
                          ₱{item.price.toFixed(2)}
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
                  </td>
                  <td>
                    <span>x{item.quantity}</span>
                  </td>
                  <td>₱{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  No items in cart. Please add items before checking out.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 🧾 Details Section */}
        <div className="detailsContainer">
          {/* 👤 Personal Info */}
          <div className="personalDetails">
            <h3>Personal Details</h3>
            <div className="subpersonalDetails">
              <p>
                {user ? (
                  <>
                    <strong>Name:</strong> {user.firstName} {user.lastName}
                    <br />
                    <strong>Phone:</strong>{" "}
                    {user.phone ||
                      user.address?.telephone ||
                      "No phone"}
                    <br />
                    <strong>Address:</strong> {fullAddress}
                    <br />
                    <strong>Registered:</strong>{" "}
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "Not available"}
                  </>
                ) : (
                  "Please log in to complete your purchase."
                )}
              </p>
              <div className="arrowWrapper">
                <Link to="/address" className="arrowButton">
                  <MdKeyboardArrowRight size={24} />
                </Link>
              </div>
            </div>
          </div>

          {/* 💳 Payment Summary */}
          <div className="paymentDetails">
            <h3>Payment Summary</h3>

            <div className="paymentDetailRow">
              <span>Total Quantity:</span>
              <span>{totalQuantity} item(s)</span>
            </div>

            <div className="paymentDetailRow">
              <span>Merchandise Subtotal:</span>
              <span>₱{merchandiseSubTotal.toFixed(2)}</span>
            </div>

            {discountTotal > 0 && (
              <>
                <div className="paymentDetailRow discount">
                  <span>Discounts:</span>
                  <span>-₱{discountTotal.toFixed(2)}</span>
                </div>
                <div className="paymentDetailRow saved">
                  <span>You Saved:</span>
                  <span>₱{discountTotal.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="paymentDetailRow">
              <span>Shipping Fee:</span>
              <span>₱{shipping.toFixed(2)}</span>
            </div>

            {/* ❌ Removed Deliver To */}

            <div className="paymentDetailRow">
              <span>Estimated Delivery:</span>
              <span>3–5 business days</span>
            </div>

            {/* 🏦 Payment Method Selection */}
            <div className="paymentDetailRow">
              <span>Payment Method:</span>
              <div className="payment-method-options">
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash on delivery"
                    checked={paymentMethod === "cash on delivery"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="method-label">Cash on Delivery</span>
                </label>

                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === "paypal"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <img
                    src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
                    alt="PayPal"
                    className="paypal-logo"
                  />
                  <span className="method-label">PayPal</span>
                </label>
              </div>
            </div>

            {/* ✅ Final Total */}
            <div className="paymentDetailRow total">
              <strong>Total Payment:</strong>
              <strong>₱{totalPayment.toFixed(2)}</strong>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="footer">
              <button
                className="cancel"
                onClick={() => navigate("/cart")}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                onClick={handleCheckout}
                className="checkout"
                disabled={loading}
              >
                {loading ? "Processing..." : "Checkout"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

import React, { useState, useEffect } from "react";
import { MdKeyboardArrowRight } from "react-icons/md";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./checkOut.css";
import { useCart } from "../contexts/CartContext";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("cash on delivery");
  const [showWalletModal, setShowWalletModal] = useState(false);

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
  const originalSubTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountedSubTotal = cartItems.reduce(
    (sum, item) => sum + (item.final_price || item.price) * item.quantity,
    0
  );
  const discountTotal = originalSubTotal - discountedSubTotal;
  const shipping = 100;
  const totalPayment = discountedSubTotal + shipping;
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

  // 🚀 Handle Checkout (COD / Wallet)
  const handleCheckout = async () => {
    if (!user || !user.token) {
      alert("Please log in to complete your purchase.");
      navigate("/login");
      return;
    }

    if (!user.address || (!user.address.street && !user.address.houseNumber)) {
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

let orderStatus = "pending"; // default for COD
if (paymentMethod === "paypal" || paymentMethod === "wallet") {
  orderStatus = "processing"; // payment confirmed
}

const orderData = {
  user: user._id || user.id,
  name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unnamed User",
  phone: user.phone || user.address?.telephone || "",
  orderItems: cartItems.map((item) => ({
    product: item.productId || item.parentId || item._id || item.id?.split("-")[0],
    variantId:
      item.variantId ||
      item.variant_id ||
      (item.id && item.id.includes("-") ? item.id.split("-")[1] : null),
    name: item.name,
    format: item.format || item.variant_format || "Standard",
    originalPrice: item.price || 0,
    discountedPrice: item.final_price || item.price,
    qty: item.quantity,
    itemTotal: (item.final_price || item.price) * item.quantity,
    image: item.image,
  })),
  shippingAddress: {
    houseNumber: user.address.houseNumber || "",
    street: user.address.street || "",
    barangay: user.address.barangay || "",
    city: user.address.city || "",
    region: user.address.region || user.address.state || user.address.province || "",
    postalCode: user.address.zip || user.address.postalCode || "",
    country: user.address.country || "Philippines",
  },
  paymentMethod,
  itemsPrice: discountedSubTotal,
  shippingPrice: shipping,
  taxPrice: 0,
  totalPrice: totalPayment,
  status: orderStatus,
};


      // 🪙 Handle Wallet Payment
      if (paymentMethod === "wallet") {
        try {
          const walletBalance = user?.wallet?.balance || 0;
          if (walletBalance < totalPayment) {
            alert("❌ Insufficient wallet balance.");
            setLoading(false);
            return;
          }

await axios.put(
  `${API_URL}/api/wallet/${user._id}/deduct`,
  {
    amount: totalPayment,
    description: `Payment for order on ${new Date().toLocaleString()}`,
  },
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.token}`,
    },
  }
);


          orderData.isPaid = true;
          orderData.paidAt = new Date();
          orderData.paymentMethod = "Wallet";
        } catch (err) {
          console.error("❌ Wallet deduction failed:", err);
          alert("Wallet payment failed. Please try another method.");
          setLoading(false);
          return;
        }
      }

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const response = await axios.post(`${API_URL}/api/orders`, orderData, config);

      if (response.data) {
        localStorage.removeItem("cart");
        clearCart();

        // 🧾 Refresh wallet balance (optional)
        if (paymentMethod === "wallet") {
          try {
            const walletRes = await axios.get(`${API_URL}/api/wallet`, {
              headers: { Authorization: `Bearer ${user.token}` },
            });
            const updatedUser = { ...user, wallet: walletRes.data };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
          } catch (err) {
            console.warn("⚠️ Failed to refresh wallet balance:", err.message);
          }
        }

        navigate("/my-purchases");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setError(
        error.response?.data?.message || "Failed to process your order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // 🚀 PayPal Success Handler
  const handlePayPalSuccess = async (details, data) => {
    try {
let orderStatus = "pending"; // default for COD
if (paymentMethod === "paypal" || paymentMethod === "wallet") {
  orderStatus = "processing"; // payment confirmed
}

const orderData = {
  user: user._id || user.id,
  name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unnamed User",
  phone: user.phone || user.address?.telephone || "",
  orderItems: cartItems.map((item) => ({
    product: item.productId || item.parentId || item._id || item.id?.split("-")[0],
    variantId:
      item.variantId ||
      item.variant_id ||
      (item.id && item.id.includes("-") ? item.id.split("-")[1] : null),
    name: item.name,
    format: item.format || item.variant_format || "Standard",
    originalPrice: item.price || 0,
    discountedPrice: item.final_price || item.price,
    qty: item.quantity,
    itemTotal: (item.final_price || item.price) * item.quantity,
    image: item.image,
  })),
  shippingAddress: {
    houseNumber: user.address.houseNumber || "",
    street: user.address.street || "",
    barangay: user.address.barangay || "",
    city: user.address.city || "",
    region: user.address.region || user.address.state || user.address.province || "",
    postalCode: user.address.zip || user.address.postalCode || "",
    country: user.address.country || "Philippines",
  },
  paymentMethod,
  itemsPrice: discountedSubTotal,
  shippingPrice: shipping,
  taxPrice: 0,
  totalPrice: totalPayment,
  status: orderStatus,
};

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data: createdOrder } = await axios.post(
        `${API_URL}/api/orders`,
        orderData,
        config
      );

      await axios.put(
        `${API_URL}/api/orders/${createdOrder._id}/pay`,
        { paymentResult: orderData.paymentResult },
        config
      );

      localStorage.removeItem("cart");
      clearCart();
      navigate("/my-purchases");
    } catch (err) {
      console.error("PayPal order save error:", err);
      setError("Failed to finalize PayPal payment. Please contact support.");
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
                    {item.final_price < item.price ? (
                      <p className="price">
                        <span className="old-price">₱{item.price.toFixed(2)}</span>
                        <span className="new-price">₱{item.final_price.toFixed(2)}</span>
                      </p>
                    ) : (
                      <p className="price">₱{item.price.toFixed(2)}</p>
                    )}
                  </td>
                  <td>x{item.quantity}</td>
                  <td>₱{((item.final_price || item.price) * item.quantity).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                  No items in cart.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 🧾 Details Section */}
        <div className="detailsContainer">
          {/* 👤 Personal Info */}
          <div className="personalDetails">
            <h3>Ship To</h3>
            <div className="subpersonalDetails">
              <p>
                {user ? (
                  <>
                    <strong>Name:</strong> {user.firstName} {user.lastName}
                    <br />
                    <strong>Phone:</strong> {user.phone || user.address?.telephone || "No phone"}
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
                          <h3>Payment Summary</h3>

              <div className="paymentDetailRow">
                <span>Total Quantity:</span>
                <span>{totalQuantity} item(s)</span>
              </div>

              <div className="paymentDetailRow">
                <span>Subtotal:</span>
                <span>₱{originalSubTotal.toFixed(2)}</span>
              </div>

              {discountTotal > 0 && (
                <div className="paymentDetailRow">
                  <span>Discount:</span>
                  <span>-₱{discountTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="paymentDetailRow">
                <span>Shipping:</span>
                <span>₱{shipping.toFixed(2)}</span>
              </div>

              <div className="paymentDetailRow total">
                <strong>Total Payment:</strong>
                <strong>₱{totalPayment.toFixed(2)}</strong>
              </div>
          </div>

            {/* 💳 Payment Summary */}
            <div className="paymentDetails">
              {/* 🏦 Payment Method */}
              <div className="paymentDetailRow">
                <h3>Payment Method: </h3>
<div className="payment-method-options">
  <label>
    <div className="payment-method-left">
      <input
        type="radio"
        name="paymentMethod"
        value="cash on delivery"
        checked={paymentMethod === "cash on delivery"}
        onChange={(e) => setPaymentMethod(e.target.value)}
      />
      <span className="method-label">Cash on Delivery</span>
    </div>
  </label>

  <label>
    <div className="payment-method-left">
      <input
        type="radio"
        name="paymentMethod"
        value="paypal"
        checked={paymentMethod === "paypal"}
        onChange={(e) => setPaymentMethod(e.target.value)}
      />
      <span className="method-label">PayPal</span>
    </div>
    <img
      src="https://www.paypalobjects.com/webstatic/icon/pp258.png"
      alt="PayPal"
      className="paypal-logo"
    />
  </label>

  <label>
    <div className="payment-method-left">
      <input
        type="radio"
        name="paymentMethod"
        value="wallet"
        checked={paymentMethod === "wallet"}
        onChange={(e) => setPaymentMethod(e.target.value)}
      />
      <span className="method-label">Wallet Coins</span>
    </div>
<span className="wallet-balance">
  ₱{Number(user?.wallet?.balance || 0).toFixed(2)} available
</span>
  </label>
</div>

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

                {paymentMethod === "paypal" ? (
                  <div style={{ width: "100%", marginTop: "10px" }}>
                    <PayPalScriptProvider
                      options={{
                        "client-id":
                          "AdhQtb5SkntTJOPADCLRicbNxnshl3fzbIC2K_kz7t_92uS9PU17whoivVnhJe0EQimCF2dIsKX4VU4G",
                        currency: "PHP",
                      }}
                    >
                      <PayPalButtons
                        style={{ layout: "vertical" }}
                        createOrder={(data, actions) =>
                          actions.order.create({
                            purchase_units: [
                              {
                                amount: { value: totalPayment.toFixed(2) },
                              },
                            ],
                          })
                        }
                        onApprove={async (data, actions) => {
                          const details = await actions.order.capture();
                          handlePayPalSuccess(details, data);
                        }}
                        onError={(err) => {
                          console.error("PayPal error:", err);
                          setError("PayPal payment failed.");
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                ) : (
                  <button
                    onClick={handleCheckout}
                    className="checkout"
                    disabled={loading}
                  >
                    {loading
                      ? "Processing..."
                      : paymentMethod === "wallet"
                      ? "Pay with Wallet"
                      : "Checkout"}
                  </button>
                )}
              </div>
            </div>

        </div>
      </div>

      {/* 💬 Wallet Modal */}
      {showWalletModal && (
        <div className="wallet-modal">
          <div className="wallet-modal-content">
            <h4>💰 My Wallet</h4>
            <p>
              <strong>Available Balance:</strong> ₱
              {user.wallet?.balance?.toFixed(2) || 0}
            </p>

            {user.wallet?.transactions?.length > 0 ? (
              <div className="wallet-transactions">
                <h5>Recent Transactions:</h5>
                <ul>
                  {user.wallet.transactions
                    .slice(-5)
                    .reverse()
                    .map((tx, i) => (
                      <li key={i}>
                        <span className={tx.type}>{tx.type.toUpperCase()}</span>{" "}
                        ₱{tx.amount.toFixed(2)} —{" "}
                        {tx.description || "No description"}
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <p>No transactions yet.</p>
            )}

            <button
              className="close-wallet"
              onClick={() => setShowWalletModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

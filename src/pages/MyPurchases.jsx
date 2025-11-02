// src/pages/MyPurchases.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaUser, FaCheckCircle, FaCreditCard, FaMapMarkerAlt } from "react-icons/fa";
import { useUser } from "../contexts/UserContext";
import LogoutButton from "../components/LogoutButton";
import "./MyPurchases.css";
import RateProductModal from "../components/RateProductModal";

const MyPurchases = () => {
  const { getToken, user } = useUser();
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [requestType, setRequestType] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [reason, setReason] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = getToken();
        const res = await axios.get(
          "https://bookstore-yl7q.onrender.com/api/orders/myorders",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOrders(res.data || []);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      }
    };
    fetchOrders();
  }, [getToken]);

  const toggleExpand = (id) => setExpandedOrder(expandedOrder === id ? null : id);

const renderStatusBadge = (status) => {
  const map = {
    pending: { label: "Pending", color: "#ffb84d" },
    processing: { label: "Processing", color: "#4da6ff" },
    to_ship: { label: "To Ship", color: "#ffcc00" }, 
    shipped: { label: "To Receive", color: "#7d5fff" },
    delivered: { label: "Completed", color: "#28a745" },
    cancelled: { label: "Cancelled", color: "#dc3545" },
    refunded: { label: "Refunded", color: "#6c757d" },
  };
  const { label, color } = map[status] || { label: status, color: "#888" };
  return (
    <span className="status-badge" style={{ backgroundColor: `${color}1a`, color }}>
      {label}
    </span>
  );
};

  const calculateTotalSaved = (orderItems = []) =>
    orderItems.reduce((sum, item) => {
      const saved = (item.originalPrice - item.discountedPrice) * item.qty;
      return sum + (saved > 0 ? saved : 0);
    }, 0);

  const formatAddress = (addr = {}) =>
    `${addr.houseNumber ? addr.houseNumber + " " : ""}${addr.street || ""}, ${
      addr.barangay || ""
    }, ${addr.city || ""}, ${addr.region || ""}, ${addr.postalCode || ""}`;

  const openRequestModal = (orderId, type) => {
    setSelectedOrderId(orderId);
    setRequestType(type);
    setReason("");
    setShowModal(true);
  };

  const handleSubmitRequest = async () => {
    const token = getToken();
    if (!reason.trim()) return alert("Please enter a reason.");

    try {
      const endpoint =
        requestType === "cancel"
          ? `/api/orders/${selectedOrderId}/request-cancel`
          : `/api/orders/${selectedOrderId}/request-return`;

      await axios.post(
        `https://bookstore-yl7q.onrender.com${endpoint}`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(
        requestType === "cancel"
          ? "✅ Cancellation request sent!"
          : "♻ Return request sent!"
      );

      setOrders((prev) =>
        prev.map((o) =>
          o._id === selectedOrderId
            ? {
                ...o,
                [`${requestType}Request`]: {
                  requested: true,
                  requestedAt: new Date(),
                  reason,
                },
              }
            : o
        )
      );
    } catch (err) {
      console.error("❌ Request failed:", err);
      alert("Failed to send request.");
    } finally {
      setShowModal(false);
    }
  };
const handleContinueOrder = async (orderId) => {
  const token = getToken();
  if (!window.confirm("Are you sure you want to continue this order?")) return;

  try {
    await axios.post(
      `https://bookstore-yl7q.onrender.com/api/orders/${orderId}/revert-cancel`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    alert("✅ Your cancel request has been withdrawn. Order will continue.");

setOrders((prev) =>
  prev.map((o) =>
    o._id === orderId
      ? {
          ...o,
          cancelRequest: {
            ...o.cancelRequest,
            requested: false,
            revertedAt: new Date(), // ✅ match backend field
          },
        }
      : o
  )
);

  } catch (err) {
    console.error("❌ Failed to continue order:", err);
    alert("Failed to continue order. Please try again.");
  }
};


  return (
    <div className="app" style={{ minHeight: "100vh" }}>
      <div className="profile-main" style={{ minHeight: "calc(100vh - 150px)" }}>
        {/* Sidebar copied from Profile.jsx */}
        <aside className="sidebar">
          <div className="profile-info">
            <div className="avatar-placeholder">👤</div>
            <h2>{user?.firstName || user?.name || "Guest"}</h2>
          </div>

          <nav className="menu-list">
            <LogoutButton />
            <Link to="/profile" className="menu-item">
              <FaUser /> Profile
            </Link>
            <Link to="/my-purchases" className="menu-item active">
              <FaCheckCircle /> My Purchases
            </Link>
            <Link to="/wallet" className="menu-item">
              <FaCreditCard /> My Wallet
            </Link>
            <Link to="/address" className="menu-item">
              <FaMapMarkerAlt /> Address
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="main-content">
          <div className="profile-details">
            <h2>🛍 My Purchases</h2>

            {orders.length === 0 ? (
              <div className="empty-state">
                <p>No orders found. Start shopping today!</p>
                <button
                  className="shop-btn"
                  onClick={() => (window.location.href = "/")}
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="orders-grid">
                {orders.map((order) => {
                  const totalSaved = calculateTotalSaved(order.orderItems);
                  const addr = order.shippingAddress || {};
                  const expanded = expandedOrder === order._id;

                  return (
                    <div
                      key={order._id}
                      className={`order-card-modern ${expanded ? "expanded" : ""}`}
                    >
                      <div
                        className="order-header-modern"
                        onClick={() => toggleExpand(order._id)}
                      >
                        {/* 🧾 Compact summary when collapsed */}
{!expanded && (
  <div className="order-compact-summary">
    <p>
      <strong>Items:</strong> {order.orderItems?.length || 0} item(s)
      {" • "}
      <strong>Payment:</strong>{" "}
      {order.paymentMethod
        ? order.paymentMethod.charAt(0).toUpperCase() +
          order.paymentMethod.slice(1)
        : "N/A"}
    </p>
  </div>
)}
                        <div className="order-info">
                          <div className="order-id">
                            Order #{order._id.slice(-6)}
                          </div>
                          <div className="order-date">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="order-status">
                          {renderStatusBadge(order.status)}
                          <div className="order-total">
                            ₱{order.totalPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {expanded && (
                        <div className="order-details">
                          <div className="shipping-info">
                            <h4>Shipping Information</h4>
                            <p>
                              <strong>Name:</strong> {order.name || "Customer"}
                              <br />
                              <strong>Address:</strong> {formatAddress(addr)}
                              <br />
                              <strong>Phone:</strong> {order.phone || "N/A"}
                              <br />
                                <strong>Payment Method:</strong>{" "}
                                {order.paymentMethod
                                  ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)
                                  : "N/A"}
                            </p>
                          </div>

<div className="order-items-modern">
  {order.orderItems?.map((item) => (
    <div key={item._id} className="item-row">
      <img
        src={item.image}
        alt={item.name}
        className="item-thumb"
      />
      <div className="item-info-modern">
        <h5>{item.name}</h5>
        <p>{item.format} • Qty: {item.qty}</p>
        <p>
          <span className="old-price">₱{item.originalPrice.toFixed(2)}</span>{" "}
          <span className="new-price">₱{item.discountedPrice.toFixed(2)}</span>
        </p>
      </div>
<div className="item-total-modern">
  <div className="price-line">₱{item.itemTotal.toFixed(2)}</div>
  
  <div className="rating-section">
    {item.rated ? (
      <span className="rated-badge">Rated ✅</span>
    ) : (
      order.status === "delivered" && (
        <button
          className="action-btn rate"
          onClick={() => {
  if (selectedItem) return; // prevent multiple modals
  setSelectedItem({ ...item, orderId: order._id });
}}
        >
          ⭐ Rate Product
        </button>
      )
    )}
  </div>
</div>


    </div>
  ))}
</div>

{/* ✅ NEW PRICE SUMMARY SECTION */}
<div className="order-summary-modern">
  <h4>💰 Price Summary</h4>
  <p>
    <strong>Items Total:</strong> ₱
    {order.itemsPrice?.toFixed(2) || order.orderItems?.reduce((sum, i) => sum + i.itemTotal, 0).toFixed(2)}
  </p>
  <p>
    <strong>Shipping Fee:</strong>{" "}
    {order.shippingPrice && order.shippingPrice > 0
      ? `₱${order.shippingPrice.toFixed(2)}`
      : "Free Shipping"}
  </p>
  <hr />
  <p style={{ fontWeight: "bold", fontSize: "1.1em" }}>
    <strong>Order Total:</strong> ₱{order.totalPrice?.toFixed(2)}
  </p>
</div>

{totalSaved > 0 && (
  <div className="order-savings-modern">
    🎉 You saved ₱{totalSaved.toFixed(2)} on this order!
  </div>
)}


                          <div className="order-actions">
{/* ✅ Cancel or Continue logic */}
{["pending", "processing"].includes(order.status) && (
  <>
    {/* 🟡 No cancel yet */}
    {!order.cancelRequest?.requested && !order.cancelRequest?.reverted && (
      <button
        className="action-btn cancel"
        onClick={() => openRequestModal(order._id, "cancel")}
      >
        Request Cancel
      </button>
    )}

    {/* 🔵 Cancel request pending */}
    {order.cancelRequest?.requested && !order.cancelRequest?.reverted && (
      <div className="cancel-status-box">
        🕓 <strong>Cancel Request Pending</strong>
        <br />
        <small>
          Requested on{" "}
          {new Date(order.cancelRequest.requestedAt).toLocaleString()}
        </small>
        {order.cancelRequest.reason && (
          <>
            <br />
            <small>
              <strong>Reason:</strong> {order.cancelRequest.reason}
            </small>
          </>
        )}
        <br />
<button
  className="action-btn continue"
  disabled={order.cancelRequest?.revertedAt}
  onClick={() => handleContinueOrder(order._id)}
>
  Continue Order
</button>
      </div>
    )}

    {/* ✅ Successfully reverted */}
{order.cancelRequest?.revertedAt && (
  <p className="info-text success">
    ✅ You decided to continue with this order.<br />
    <small>
      Continued on{" "}
      {new Date(order.cancelRequest.revertedAt).toLocaleString()}.
    </small>
  </p>
)}
  </>
)}



                            {order.status === "delivered" &&
                              !order.returnRequest?.requested && (
                                <button
                                  className="action-btn return"
                                  onClick={() =>
                                    openRequestModal(order._id, "return")
                                  }
                                >
                                  Request Return
                                </button>
                              )}

                            {order.cancelRequest?.requested && (
                              <p className="info-text">
                                ❗ Cancel requested on{" "}
                                {new Date(
                                  order.cancelRequest.requestedAt
                                ).toLocaleString()}
                              </p>
                            )}
                            {order.returnRequest?.requested && (
                              <p className="info-text">
                                ♻ Return requested on{" "}
                                {new Date(
                                  order.returnRequest.requestedAt
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {showModal && (
              <div className="modal-overlay">
                <div className="modal">
                  <h3>
                    {requestType === "cancel"
                      ? "Cancel Order"
                      : "Return Request"}
                  </h3>
                  <textarea
                    placeholder="Enter your reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="modal-actions">
                    <button className="btn-primary" onClick={handleSubmitRequest}>
                      Submit
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedItem && (
  <RateProductModal
    item={selectedItem}
    orderId={selectedItem.orderId}
    token={getToken()}
    onClose={() => setSelectedItem(null)}
    onRated={(itemId) => {
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          orderItems: o.orderItems.map((i) =>
            i._id === itemId ? { ...i, rated: true } : i
          ),
        }))
      );
    }}
  />
)}

    </div>
  );
};

export default MyPurchases;

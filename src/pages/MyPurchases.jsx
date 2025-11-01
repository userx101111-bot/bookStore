import React, { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../contexts/UserContext";
import "./MyPurchases.css";

const MyPurchases = () => {
  const { getToken } = useUser();
  const [orders, setOrders] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);

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

  const toggleExpand = (id) => {
    setExpandedOrder(expandedOrder === id ? null : id);
  };

  const renderStatusBadge = (status) => {
    const map = {
      pending: { label: "To Ship", color: "#ffb84d" },
      processing: { label: "Processing", color: "#4da6ff" },
      shipped: { label: "To Receive", color: "#7d5fff" },
      delivered: { label: "Completed", color: "#28a745" },
      cancelled: { label: "Cancelled", color: "#dc3545" },
      refunded: { label: "Refunded", color: "#6c757d" },
    };
    const { label, color } = map[status] || { label: status, color: "#888" };
    return (
      <span
        className="status-badge"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {label}
      </span>
    );
  };

  const calculateTotalSaved = (orderItems = []) =>
    orderItems.reduce((sum, item) => {
      const saved = (item.originalPrice - item.discountedPrice) * item.qty;
      return sum + (saved > 0 ? saved : 0);
    }, 0);

  const formatAddress = (addr = {}) => {
    if (!addr) return "No address provided";
    return `${addr.houseNumber ? addr.houseNumber + " " : ""}${addr.street || ""}, ${
      addr.barangay || ""
    }, ${addr.city || ""}, ${addr.region || ""}, ${addr.postalCode || ""}`;
  };

  return (
    <div className="purchases-container-modern">
      <h2 className="page-title">🛍 My Purchases</h2>

      {orders.length === 0 ? (
        <div className="empty-state">
          <img src="/assets/empty-orders.svg" alt="No orders" />
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
                  <div className="order-info">
                    <div className="order-id">Order #{order._id.slice(-6)}</div>
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
                            <p>
                              {item.format} • Qty: {item.qty}
                            </p>
                            <p>
                              <span className="old-price">
                                ₱{item.originalPrice.toFixed(2)}
                              </span>{" "}
                              <span className="new-price">
                                ₱{item.discountedPrice.toFixed(2)}
                              </span>
                            </p>
                          </div>
                          <div className="item-total-modern">
                            ₱{item.itemTotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalSaved > 0 && (
                      <div className="order-savings-modern">
                        🎉 You saved ₱{totalSaved.toFixed(2)} on this order!
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPurchases;

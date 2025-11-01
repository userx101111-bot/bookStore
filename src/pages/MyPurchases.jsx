import React, { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../contexts/UserContext";
import "./MyPurchases.css";

const MyPurchases = () => {
  const { getToken } = useUser();
  const [orders, setOrders] = useState([]);

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

  const renderStatus = (status) => {
    switch (status) {
      case "pending":
        return "To Ship";
      case "processing":
        return "Processing";
      case "shipped":
        return "To Receive";
      case "delivered":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "refunded":
        return "Returned/Refund";
      default:
        return status;
    }
  };

  const calculateTotalSaved = (orderItems = []) => {
    return orderItems.reduce((sum, item) => {
      const savedPerItem =
        (item.originalPrice - item.discountedPrice) * item.qty;
      return sum + (savedPerItem > 0 ? savedPerItem : 0);
    }, 0);
  };

  const formatAddress = (addr = {}) => {
    if (!addr) return "No address provided";
    return `${addr.houseNumber ? addr.houseNumber + " " : ""}${addr.street || ""}, ${
      addr.barangay || ""
    }, ${addr.city || ""}, ${addr.region || addr.state || ""}, ${
      addr.postalCode || ""
    }`;
  };

  return (
    <div className="purchases-container">
      <h2>My Purchases</h2>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const totalSaved = calculateTotalSaved(order.orderItems);
            const addr = order.shippingAddress || {};
            return (
              <div key={order._id} className="order-card">
                {/* 🧾 Order Header */}
                <div className="order-header">
                  <div>
                    <strong>Order ID:</strong> {order._id}
                  </div>
                  <div>
                    <strong>Date:</strong>{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <div>
                    <strong>Status:</strong> {renderStatus(order.status)}
                  </div>
                  <div>
                    <strong>Total:</strong> ₱{order.totalPrice.toFixed(2)}
                  </div>
                </div>

                {/* 🚚 Ship To Section */}
                <div className="shipto-section">
                  <h4>📦 Ship To:</h4>
                  <p>
                    <strong>Name:</strong>{" "}
                    {order.name ||
                      (order.user
                        ? `${order.user.firstName || ""} ${
                            order.user.lastName || ""
                          }`.trim()
                        : "Customer")}
                    <br />
                    <strong>Address:</strong> {formatAddress(addr)}
                    <br />
                    <strong>Phone:</strong> {order.phone || "No phone provided"}
                  </p>
                </div>

                {/* 🛍️ Order Items */}
                <div className="order-items">
                  {order.orderItems?.length > 0 ? (
                    order.orderItems.map((item) => (
                      <div key={item._id} className="order-item">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="item-image"
                        />
                        <div className="item-info">
                          <h4>{item.name}</h4>
                          <p>Format: {item.format}</p>
                          <p>Quantity: {item.qty}</p>
                          <p>
                            Price:{" "}
                            <span className="old-price">
                              ₱{item.originalPrice.toFixed(2)}
                            </span>{" "}
                            <span className="new-price">
                              ₱{item.discountedPrice.toFixed(2)}
                            </span>
                          </p>
                        </div>
                        <div className="item-total">
                          ₱{item.itemTotal.toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No products found in this order.</p>
                  )}
                </div>

                {/* 💰 Total Saved Section */}
                {totalSaved > 0 && (
                  <div className="order-savings">
                    🎉 <strong>Total Saved:</strong> ₱{totalSaved.toFixed(2)}
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

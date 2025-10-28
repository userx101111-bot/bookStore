//src/components/admin/OrderManagement.jsx
// ============================================================
// ✅ OrderManagement.jsx (Fixed with Token Header + Admin Auth)
// ============================================================
import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "../AdminDashboard.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const OrderManagement = () => {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ============================================================
  // 🔹 Fetch all orders (admin protected)
  // ============================================================
  const fetchOrders = async () => {
    try {
      if (!user?.token) {
        console.warn("⚠️ No token available yet, skipping fetch...");
        return;
      }
      setLoading(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/orders`,
        {},
        user.token
      );

      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔹 Update order status
  // ============================================================
  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
        user.token
      );

      if (!res.ok) throw new Error("Failed to update order status");

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status } : order
        )
      );
    } catch (err) {
      console.error("❌ Update failed:", err);
      alert("Failed to update order status.");
    }
  };

  // ============================================================
  // 🔹 View order details (opens modal)
  // ============================================================
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  // ============================================================
  // 🔹 Lifecycle: fetch when user token ready
  // ============================================================
  useEffect(() => {
    if (user?.token) {
      fetchOrders();
    }
  }, [user]);

  // ============================================================
  // 🔹 Render Loading/Error
  // ============================================================
  if (loading) return <div className="loading">Loading orders...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // ============================================================
  // 🔹 Render
  // ============================================================
  return (
    <div className="admin-container">
      <h2>📦 Order Management</h2>

      {/* === Orders Table === */}
      {orders.length === 0 ? (
        <div className="no-orders">No orders found.</div>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total (₱)</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>{order._id}</td>
                <td>{order.user?.email || "Guest"}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>{order.totalPrice.toFixed(2)}</td>
                <td>
                  <span
                    className={`status-badge ${
                      order.status === "Delivered"
                        ? "delivered"
                        : order.status === "Processing"
                        ? "processing"
                        : "pending"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td>{order.isPaid ? "✅ Paid" : "❌ Unpaid"}</td>
                <td className="actions">
                  <button
                    className="btn-view"
                    onClick={() => viewOrderDetails(order)}
                  >
                    View
                  </button>

                  {/* === Status Actions === */}
                  {order.status !== "Delivered" && (
                    <>
                      <button
                        className="btn-processing"
                        onClick={() =>
                          updateOrderStatus(order._id, "Processing")
                        }
                        disabled={order.status === "Processing"}
                      >
                        Processing
                      </button>

                      <button
                        className="btn-deliver"
                        onClick={() =>
                          updateOrderStatus(order._id, "Delivered")
                        }
                      >
                        Mark as Delivered
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* === Order Detail Modal === */}
      {showModal && selectedOrder && (
        <div className="order-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Order Details</h3>
              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                <strong>Order ID:</strong> {selectedOrder._id}
              </p>
              <p>
                <strong>Customer:</strong>{" "}
                {selectedOrder.user?.email || "Guest"}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(selectedOrder.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Total:</strong> ₱{selectedOrder.totalPrice.toFixed(2)}
              </p>
              <p>
                <strong>Status:</strong> {selectedOrder.status}
              </p>
              <p>
                <strong>Payment:</strong>{" "}
                {selectedOrder.isPaid ? "Paid" : "Not Paid"}
              </p>

              <hr />
              <h4>📚 Ordered Items:</h4>
              <ul>
                {selectedOrder.orderItems.map((item, idx) => (
                  <li key={idx}>
                    {item.name} (x{item.qty}) — ₱{item.price.toFixed(2)}
                  </li>
                ))}
              </ul>

              <hr />
              <h4>📍 Shipping Address:</h4>
              <p>
                {selectedOrder.shippingAddress?.address},{" "}
                {selectedOrder.shippingAddress?.city},{" "}
                {selectedOrder.shippingAddress?.postalCode},{" "}
                {selectedOrder.shippingAddress?.country}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;

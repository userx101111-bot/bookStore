// ============================================================
// src/components/admin/AdminDashboard.jsx
// ============================================================
import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import { useUser } from "../../contexts/UserContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "../AdminDashboard.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const AdminOverview  = () => {
  const { user } = useUser();
  const [summary, setSummary] = useState(null);
  const [sales, setSales] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.token) fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const [summaryRes, salesRes, ordersRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/api/admin/dashboard/summary`, {}, user.token),
        fetchWithAuth(`${API_URL}/api/admin/dashboard/sales`, {}, user.token),
        fetchWithAuth(`${API_URL}/api/admin/dashboard/recent-orders`, {}, user.token),
      ]);

      const summaryData = await summaryRes.json();
      const salesData = await salesRes.json();
      const ordersData = await ordersRes.json();

      setSummary(summaryData);
      setSales(salesData);
      setRecentOrders(ordersData);
    } catch (err) {
      console.error("❌ Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="admin-dashboard-page">
      <h2>📊 Admin Dashboard Overview</h2>

      {/* === Summary Cards === */}
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Products</h3>
          <p>{summary.totalProducts}</p>
        </div>
        <div className="dashboard-card">
          <h3>Users</h3>
          <p>{summary.totalUsers}</p>
        </div>
        <div className="dashboard-card">
          <h3>Orders</h3>
          <p>{summary.totalOrders}</p>
        </div>
        <div className="dashboard-card">
          <h3>Revenue</h3>
          <p>₱{summary.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* === Sales Chart === */}
      <div className="dashboard-chart">
        <h3>Monthly Sales</h3>
        {sales.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#fa7878"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No sales data yet.</p>
        )}
      </div>

      {/* === Recent Orders === */}
      <div className="recent-orders">
        <h3>🕒 Recent Orders</h3>
        {recentOrders.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order._id}>
                  <td>
                    {order.user
                      ? `${order.user.firstName} ${order.user.lastName}`
                      : "Guest"}
                  </td>
                  <td>{order.user?.email || "—"}</td>
                  <td>₱{order.totalPrice.toLocaleString()}</td>
                  <td>
                    {order.paidAt
                      ? new Date(order.paidAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        order.isDelivered ? "delivered" : "processing"
                      }`}
                    >
                      {order.isDelivered ? "Delivered" : "Processing"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No recent orders found.</p>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;

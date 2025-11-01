import React, { useEffect, useState } from "react";
import axios from "axios";
import "./OverviewPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const OverviewPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/admin/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (error) {
        console.error("Error loading overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) return <div className="overview-loading">Loading dashboard...</div>;
  if (!data) return <div className="overview-error">Failed to load overview data</div>;

  return (
    <div className="overview-page">
      <h1 className="overview-title">📊 Store Overview</h1>

      {/* Summary Cards */}
      <div className="overview-cards">
        <div className="overview-card">
          <h3>Total Sales</h3>
          <p className="card-value">₱{data.totalSales.toLocaleString()}</p>
        </div>
        <div className="overview-card">
          <h3>Total Orders</h3>
          <p className="card-value">{data.totalOrders}</p>
        </div>
        <div className="overview-card">
          <h3>Total Customers</h3>
          <p className="card-value">{data.totalCustomers}</p>
        </div>
        <div className="overview-card">
          <h3>Avg. Order Value</h3>
          <p className="card-value">₱{data.averageOrderValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Sales Over Time */}
      <div className="chart-section">
        <h2>Sales (Last 14 Days)</h2>
        <div className="chart">
          <table className="chart-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue (₱)</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.salesOverTime.map((item) => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.revenue.toLocaleString()}</td>
                  <td>{item.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="best-sellers">
        <h2>🏆 Best-Selling Products</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Units Sold</th>
              <th>Total Revenue</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {data.bestSellers.map((p) => (
              <tr key={p._id}>
                <td className="product-cell">
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="product-image"
                    />
                  )}
                  {p.name}
                </td>
                <td>{p.totalSold}</td>
                <td>₱{p.totalRevenue.toLocaleString()}</td>
                <td>{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Orders */}
      <div className="recent-orders">
        <h2>🧾 Recent Orders</h2>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o.id}>
                <td>{o.customer}</td>
                <td>₱{o.total.toLocaleString()}</td>
                <td>{o.paymentMethod}</td>
                <td>
                  <span className={`status-badge ${o.status}`}>
                    {o.status}
                  </span>
                </td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OverviewPage;

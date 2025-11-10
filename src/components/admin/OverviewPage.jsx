import React, { useEffect, useState } from "react";
import axios from "axios";
import "./OverviewPage.css";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://bookstore-yl7q.onrender.com");


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

  if (loading) {
    return (
      <div className="overview-loading">
        <div className="skeleton-cards">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="overview-error">Failed to load overview data</div>;

  return (
    <div className="overview-page">
      <h1 className="overview-title">📊 Dashboard Overview</h1>

      {/* KPI Cards */}
      <div className="overview-cards">
        <div className="overview-card gradient-blue">
          <div className="card-label">Total Sales</div>
          <div className="card-value">₱{data.totalSales.toLocaleString()}</div>
          <div className="card-sub">Overall revenue</div>
        </div>

        <div className="overview-card gradient-green">
          <div className="card-label">Orders</div>
          <div className="card-value">{data.totalOrders}</div>
          <div className="card-sub">Completed orders</div>
        </div>

        <div className="overview-card gradient-purple">
          <div className="card-label">Customers</div>
          <div className="card-value">{data.totalCustomers}</div>
          <div className="card-sub">Total users</div>
        </div>

        <div className="overview-card gradient-orange">
          <div className="card-label">Avg. Order</div>
          <div className="card-value">₱{data.averageOrderValue.toFixed(2)}</div>
          <div className="card-sub">Per transaction</div>
        </div>
      </div>

      {/* Sales Trend */}
      <section className="chart-section">
        <div className="section-header">
          <h2>📈 Sales (Last 14 Days)</h2>
        </div>
        <div className="chart-bars">
          {data.salesOverTime.map((day) => (
            <div key={day._id} className="chart-bar">
              <div
                className="chart-fill"
                style={{
                  height: `${Math.min(day.revenue / 100, 100)}%`,
                }}
                title={`₱${day.revenue.toLocaleString()} on ${day._id}`}
              />
              <span className="chart-label">{day._id.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="table-section">
        <div className="section-header">
          <h2>🏆 Best-Selling Products</h2>
        </div>
        <table className="modern-table">
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
                  {p.image && <img src={p.image} alt={p.name} className="product-image" />}
                  {p.name}
                </td>
                <td>{p.totalSold}</td>
                <td>₱{p.totalRevenue.toLocaleString()}</td>
                <td>{p.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent Orders */}
      <section className="table-section">
        <div className="section-header">
          <h2>🧾 Recent Orders</h2>
        </div>
        <table className="modern-table">
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
                  <span className={`status-badge modern ${o.status}`}>
                    {o.status}
                  </span>
                </td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default OverviewPage;

// src/components/AdminDashboard.jsx
import React, { useEffect } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { useUser } from '../contexts/UserContext';
import UserManagement from './admin/UserManagement';
import OrderManagement from './admin/OrderManagement';
import ProductManagement from './admin/ProductManagement';
import CategoryManagement from './admin/CategoryManagement'; // existing import
import './AdminDashboard.css';
import BannerManagement from './admin/BannerManagement';
import StaticPageManagement from "./admin/StaticPageManagement";
import FeaturedManagement from './admin/FeaturedManagement'; // NEW
import VoucherManagement from "./admin/VoucherManagement";
import OverviewPage from "./admin/OverviewPage";

const AdminDashboard = () => {
  const { isAdmin, logout } = useUser();
  const navigate = useNavigate();

  // Redirect non-admin users to home
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      alert('Access denied — admin only');
    }
  }, [isAdmin, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAdmin()) return <div>Access Denied</div>;

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <h2>Admin Dashboard</h2>
        <nav>
          <ul>
            <li><Link to="/admin/overview">Overview</Link></li>
            <li><Link to="/admin/products">Products</Link></li>
            <li><Link to="/admin/categories">Categories</Link></li>
            <li><Link to="/admin/featured">Featured</Link></li> {/* NEW */}
            <li><Link to="/admin/users">Users</Link></li>
            <li><Link to="/admin/orders">Orders</Link></li>
            <li><Link to="/admin/vouchers">Vouchers</Link></li>
            <li><Link to="/admin/banners">Banners</Link></li>
            <li><Link to="/admin/static-pages">Static Pages</Link></li>
          </ul>
        </nav>

        <div className="admin-logout">
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-content">
        <Routes>
          <Route index element={<div>Welcome to Admin Dashboard</div>} />
<Route index element={<OverviewPage />} />
<Route path="overview" element={<OverviewPage />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="featured" element={<FeaturedManagement />} /> {/* NEW */}
          <Route path="users" element={<UserManagement />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="banners" element={<BannerManagement />} />
          <Route path="static-pages" element={<StaticPageManagement />} />
          
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;

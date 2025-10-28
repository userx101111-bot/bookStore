// [settings.jsx](file:///C:\Users\inoninja\AniME-YOU-NEW\src\pages\settings.jsx)
import React from 'react';
import { FaShoppingCart, FaHeart, FaUser, FaCog, FaCreditCard, FaMapMarkerAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './profile.css'; // Ensure this path is correct
import { useUser } from '../contexts/UserContext';

const Settings = () => {
  const { user } = useUser();
  return (
          <div className="app">

      <div className="profile-main">
        <aside className="sidebar">
          <div className="profile-info">
            <div className="avatar-placeholder">👤</div>
            <h2>{user ? (user.firstName || user.name || 'Guest') : 'Guest'}</h2>
          </div>
          <nav className="menu-list">
            <Link to="/profile" className="menu-item"><FaUser /> Profile</Link>
            <Link to="/settings" className="menu-item"><FaCog /> Settings</Link>
            <Link to="/payments" className="menu-item"><FaCreditCard /> Payments</Link>
            <Link to="/address" className="menu-item"><FaMapMarkerAlt /> Address</Link>
          </nav>
        </aside>
        <div className="main-content">
          <h2>Account Settings</h2>
          <form className="settings-form">
          <div className="form-group">
  <label htmlFor="username">Username</label>
  <input type="text" id="username" placeholder="Username" defaultValue={user ? user.username : ""} /> {/* Use user.username if available */}
</div>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" placeholder="Your Name" defaultValue={user ? (user.firstName || user.name) : ""} /> {/* Use user.firstName or user.name */}
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="Email" defaultValue={user ? user.email : ""} /> {/* Use user.email */}

            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input type="text" id="phone" placeholder="Phone Number" defaultValue={user ? user.phoneNumber : ""} /> {/* Use user.phoneNumber */}
            </div>
            {/* ... other form groups */}
            <button type="submit" className="save-button">Save Changes</button> {/* Save button added */}
           </form>
        </div>
      </div>

      {/* Space for footer */}
            <div style={{ height: "150px" }}></div>
    </div>
  );
};

export default Settings;

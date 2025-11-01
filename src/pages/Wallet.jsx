// src/pages/Wallet.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FaUser,
  FaCheckCircle,
  FaCreditCard,
  FaMapMarkerAlt,
  FaArrowDown,
  FaArrowUp,
} from "react-icons/fa";
import { useUser } from "../contexts/UserContext";
import LogoutButton from "../components/LogoutButton";
import "./profile.css"; // for layout consistency
import "./Wallet.css"; // new wallet styles

const Wallet = () => {
  const { user } = useUser();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) return;
    const fetchWallet = async () => {
      try {
        const res = await axios.get(
          `https://bookstore-yl7q.onrender.com/api/wallet`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setWallet(res.data);
      } catch (err) {
        console.error("Failed to fetch wallet:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [user]);

  if (loading) {
    return (
      <div className="app" style={{ minHeight: "100vh" }}>
        <div className="profile-main" style={{ minHeight: "calc(100vh - 150px)" }}>
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
              <Link to="/my-purchases" className="menu-item">
                <FaCheckCircle /> My Purchases
              </Link>
              <Link to="/wallet" className="menu-item active">
                <FaCreditCard /> My Wallet
              </Link>
              <Link to="/address" className="menu-item">
                <FaMapMarkerAlt /> Address
              </Link>
            </nav>
          </aside>

          <div className="main-content">
            <div className="wallet-details">
              <p>Loading wallet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="app" style={{ minHeight: "100vh" }}>
        <div className="profile-main" style={{ minHeight: "calc(100vh - 150px)" }}>
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
              <Link to="/my-purchases" className="menu-item">
                <FaCheckCircle /> My Purchases
              </Link>
              <Link to="/wallet" className="menu-item active">
                <FaCreditCard /> My Wallet
              </Link>
              <Link to="/address" className="menu-item">
                <FaMapMarkerAlt /> Address
              </Link>
            </nav>
          </aside>

          <div className="main-content">
            <div className="wallet-details">
              <p>Wallet not found.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ minHeight: "100vh" }}>
      <div className="profile-main" style={{ minHeight: "calc(100vh - 150px)" }}>
        {/* Sidebar */}
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
            <Link to="/my-purchases" className="menu-item">
              <FaCheckCircle /> My Purchases
            </Link>
            <Link to="/wallet" className="menu-item active">
              <FaCreditCard /> My Wallet
            </Link>
            <Link to="/address" className="menu-item">
              <FaMapMarkerAlt /> Address
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="main-content">
          <div className="wallet-details">
            <h2>💰 My Wallet</h2>

            <div className="wallet-balance-card">
              <p className="balance-label">Current Balance</p>
              <h3 className="balance-amount">₱{wallet.balance.toFixed(2)}</h3>
            </div>

            <h3 className="section-title">Recent Transactions</h3>
            {wallet.transactions?.length === 0 ? (
              <p className="no-transactions">No transactions yet.</p>
            ) : (
              <ul className="transaction-list">
                {wallet.transactions
                  .slice()
                  .reverse()
                  .map((t, i) => (
                    <li key={i} className={`transaction-item ${t.type}`}>
                      <div className="transaction-icon">
                        {t.type === "credit" ? (
                          <FaArrowUp className="credit-icon" />
                        ) : (
                          <FaArrowDown className="debit-icon" />
                        )}
                      </div>
                      <div className="transaction-info">
                        <p className="transaction-desc">
                          {t.description || "Transaction"}
                        </p>
                        <small className="transaction-date">
                          {new Date(t.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <div className="transaction-amount">
                        {t.type === "credit" ? "+" : "-"}₱
                        {t.amount.toFixed(2)}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;

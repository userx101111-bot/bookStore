// ============================================================
// Profile.jsx (FINAL — NO RELOAD FLICKER)
// Supports Google-only, Email-only, and Unified accounts
// Smooth soft-refresh, instant updates, fade animations
// ============================================================

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import {
  FaUser,
  FaCog,
  FaCreditCard,
  FaMapMarkerAlt,
  FaChevronDown,
  FaEnvelope,
  FaCheckCircle,
  FaLock,
  FaKey,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import "./profile.css";
import { useUser } from "../contexts/UserContext";
import LogoutButton from "../components/LogoutButton";

const API_URL = "https://bookstore-yl7q.onrender.com";

// ============================================================
// DropdownPortal — Renders dropdown outside normal flow
// ============================================================
function DropdownPortal({ targetRef, open, onClose, children, width }) {
  const elRef = useRef(null);
  const portalRootRef = useRef(null);
  const [style, setStyle] = useState({ top: 0, left: 0, minWidth: width || 240 });

  useEffect(() => {
    const container = document.createElement("div");
    container.className = "dropdown-portal-root";
    portalRootRef.current = container;
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
      portalRootRef.current = null;
    };
  }, []);

  const updatePosition = () => {
    const target = targetRef?.current;
    const portal = portalRootRef.current;
    if (!target || !portal) return;
    const rect = target.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const top = rect.bottom + window.scrollY + 6;
    const computedWidth = width || Math.max(240, Math.round(rect.width));
    setStyle({ top, left, minWidth: computedWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onResize = () => updatePosition();
    const onScroll = () => updatePosition();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, targetRef, onClose, width]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      const portalEl = portalRootRef.current;
      if (!portalEl) return;
      if (!portalEl.contains(e.target) && !targetRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("pointerdown", handleDown);
    return () => document.removeEventListener("pointerdown", handleDown);
  }, [open, onClose, targetRef]);

  if (!portalRootRef.current || !open) return null;

  return ReactDOM.createPortal(
    <div
      ref={elRef}
      className="dropdown-portal"
      style={{
        position: "absolute",
        top: `${style.top}px`,
        left: `${style.left}px`,
        minWidth:
          typeof style.minWidth === "number" ? `${style.minWidth}px` : style.minWidth,
        zIndex: 2147483647,
      }}
    >
      {children}
    </div>,
    portalRootRef.current
  );
}

// ============================================================
// Profile Component
// ============================================================
const Profile = () => {
  const { user, refreshUser } = useUser();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [securityStep, setSecurityStep] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [isVerifiedForManage, setIsVerifiedForManage] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState(1);

  const [googleDisconnected, setGoogleDisconnected] = useState(false);
  const [showVerifiedBox, setShowVerifiedBox] = useState(false);



  useEffect(() => {
  if (!user?.createdAt || !user?.phone) {
    console.log("🔁 Missing fields, reloading profile data...");
    refreshUser();
  }
}, [user, refreshUser]);

  // ============================================================
  // Verified Fade Animation
  // ============================================================
  useEffect(() => {
    if (securityStep === "verified") {
      setShowVerifiedBox(true);
      const timer = setTimeout(() => setShowVerifiedBox(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [securityStep]);

  // ============================================================
  // Account Type Detection
  // ============================================================
  const loginMethod = Array.isArray(user?.loginMethod)
    ? user.loginMethod
    : [user?.loginMethod || "email"];
  const isGoogleOnly = loginMethod.includes("google") && !loginMethod.includes("email");
  const isManualOnly = loginMethod.includes("email") && !loginMethod.includes("google");
  const isUnified = loginMethod.includes("google") && loginMethod.includes("email");

  // ============================================================
  // Orders Fetch
  // ============================================================
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || user.isGuest) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/orders/myorders`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data);
      } catch {
        setError("Failed to load orders.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  // ============================================================
  // Security Step Handler
  // ============================================================
  const handleSecurityCheck = async () => {
    setIsLoading(true);
    setSecurityMessage("");
    try {
      if (isManualOnly || isUnified) {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, password: passwordInput }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Incorrect password");
        setIsVerifiedForManage(true);
        setSecurityStep("verified");
        setSecurityMessage("✅ Password verified.");
        setIsDropdownOpen(true);
      } else if (isGoogleOnly && securityStep === "idle") {
        const res = await fetch(`${API_URL}/api/email/send-verification-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSecurityStep("code");
        setSecurityMessage("📧 Code sent to your email.");
      } else if (isGoogleOnly && securityStep === "code") {
        const res = await fetch(`${API_URL}/api/email/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, code: securityCode }),
        });
        const data = await res.json();
        if (!res.ok || !data.verified) throw new Error("Invalid code");
        setIsVerifiedForManage(true);
        setSecurityStep("verified");
        setSecurityMessage("✅ Email verified.");
        setIsDropdownOpen(true);
      }
    } catch (err) {
      setSecurityMessage("❌ " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Manage Account Dropdown
  // ============================================================
  const handleToggleManageAccount = () => {
    if (!isVerifiedForManage) {
      if (isManualOnly || isUnified) setSecurityStep("password");
      else if (isGoogleOnly) setSecurityStep("idle");
      setIsDropdownOpen(false);
      return;
    }
    setIsDropdownOpen((prev) => !prev);
  };

  // ============================================================
  // Email Change Logic
  // ============================================================
  const handleSendEmailCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/change-email`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage("✅ " + data.message);
      setStep(2);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailCode = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const oldEmail = user?.email;
    const formattedDate = new Date().toLocaleString();

    try {
      const res = await fetch(`${API_URL}/api/users/verify-new-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ newEmail, code: verificationCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage(`✅ Email successfully changed to ${newEmail}`);
      setStep(1);
      setActiveOption(null);

      await fetch(`${API_URL}/api/email/notify-old-email-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldEmail,
          newEmail,
          date: formattedDate,
        }),
      });

      // ✅ Smooth soft-refresh (no reload)
      document.querySelector(".profile-details")?.classList.add("refreshing");
      if (refreshUser) await refreshUser();
      document.querySelector(".profile-details")?.classList.remove("refreshing");

      // Fade out success message
      setTimeout(() => {
        document.querySelector(".success-message")?.classList.add("fade-out");
      }, 2500);

      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const headerRef = useRef(null);
  const onSelectChangeEmail = () => {
    setActiveOption("changeEmail");
    setIsDropdownOpen(false);
  };

  // ============================================================
  // Render
  // ============================================================
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
            <Link to="/profile" className="menu-item active">
              <FaUser /> Profile
            </Link>
            <Link to="/settings" className="menu-item">
              <FaCog /> Settings
            </Link>
            <Link to="/payments" className="menu-item">
              <FaCreditCard /> Payments
            </Link>
            <Link to="/address" className="menu-item">
              <FaMapMarkerAlt /> Address
            </Link>
          </nav>
        </aside>

        <div className="main-content">
          <div className="profile-details">
<h2>Account Information</h2>

<p>
  <strong>Name:</strong>{" "}
  {user?.firstName || user?.lastName
    ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
    : user?.name || "—"}
</p>

<p><strong>Email:</strong> {user?.email || "—"}</p>

<p><strong>Phone:</strong> {user?.phone || "—"}</p>

<p><strong>Login Method:</strong> {loginMethod.join(", ")}</p>

<p>
  <strong>Registered:</strong>{" "}
  {user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "—"}
</p>


            <div className="manage-account-section">
              <div
                className="dropdown-header"
                onClick={handleToggleManageAccount}
                ref={headerRef}
                role="button"
                aria-expanded={isDropdownOpen}
                tabIndex={0}
              >
                <h3>
                  Manage Account{" "}
                  <FaChevronDown className={`dropdown-icon ${isDropdownOpen ? "open" : ""}`} />
                </h3>
              </div>

              <DropdownPortal
                targetRef={headerRef}
                open={isDropdownOpen && isVerifiedForManage}
                onClose={() => setIsDropdownOpen(false)}
                width={240}
              >
                <div className="dropdown-menu-inner">
                  <div className="dropdown-item" onClick={onSelectChangeEmail}>
                    <FaEnvelope /> Change Email
                  </div>
                </div>
              </DropdownPortal>

              {/* Password or Code Security */}
              {securityStep === "password" && (
                <div className="security-box">
                  <label><FaLock /> Enter Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                  <button onClick={handleSecurityCheck} disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </button>
                  {securityMessage && <p className="error-message">{securityMessage}</p>}
                </div>
              )}

              {securityStep === "idle" && isGoogleOnly && (
                <div className="security-box">
                  <p>Send code to verify your account.</p>
                  <button onClick={handleSecurityCheck} disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Code"}
                  </button>
                  {securityMessage && <p className="error-message">{securityMessage}</p>}
                </div>
              )}

              {securityStep === "code" && (
                <div className="security-box">
                  <label><FaKey /> Enter Verification Code</label>
                  <input
                    type="text"
                    value={securityCode}
                    onChange={(e) => setSecurityCode(e.target.value)}
                  />
                  <button onClick={handleSecurityCheck} disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </button>
                  {securityMessage && <p className="error-message">{securityMessage}</p>}
                </div>
              )}

              {showVerifiedBox && (
                <div className={`verified-box fade ${showVerifiedBox ? "visible" : ""}`}>
                  <FaCheckCircle color="green" /> Verified access granted 👇
                </div>
              )}

              {/* Change Email Section */}
              {activeOption === "changeEmail" && (
                <div className="account-action">
                  <label><FaEnvelope /> Change Email</label>

                  {/* Email-only or Google-only */}
                  {(isGoogleOnly || isManualOnly) && (
                    <>
                      {step === 1 && (
                        <form onSubmit={handleSendEmailCode}>
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter new email"
                            required
                          />
                          <button type="submit" disabled={isLoading}>
                            {isLoading ? "Sending..." : "Send Verification Code"}
                          </button>
                        </form>
                      )}

                      {step === 2 && (
                        <form onSubmit={handleVerifyEmailCode}>
                          <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="Enter verification code"
                            required
                          />
                          <button type="submit" disabled={isLoading}>
                            {isLoading ? "Verifying..." : "Verify & Change"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            style={{ marginLeft: "10px", background: "#ccc", color: "#000" }}
                          >
                            Back
                          </button>
                        </form>
                      )}

                      {message && (
                        <div
                          className={
                            message.startsWith("✅") ? "success-message" : "error-message"
                          }
                        >
                          {message}
                        </div>
                      )}
                    </>
                  )}

                  {/* Unified (Google + Email) */}
                  {isUnified && (
                    <>
                      {!googleDisconnected ? (
                        <div className="info-box">
                          <p>
                            ⚠️ Your account is linked with both <strong>Google</strong> and{" "}
                            <strong>Email</strong>.
                          </p>
                          <p>
                            To update your email, please first{" "}
                            <strong>disconnect Google</strong>.
                          </p>
                          <button
                            type="button"
                            className="disconnect-btn"
                            onClick={async () => {
                              if (!window.confirm("Are you sure you want to disconnect Google?"))
                                return;
                              try {
                                setIsLoading(true);
                                const res = await fetch(`${API_URL}/api/users/disconnect-google`, {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                                  },
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message);

                                if (refreshUser) await refreshUser();
                                setGoogleDisconnected(true);
                                setMessage("✅ Google disconnected successfully.");
                                setTimeout(() => setMessage(""), 3000);
                              } catch (err) {
                                setMessage("❌ " + err.message);
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? "Disconnecting..." : "Disconnect Google"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="info-box">
                            ✅ Google disconnected. You can now change your email below.
                          </p>

                          {step === 1 && (
                            <form onSubmit={handleSendEmailCode}>
                              <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="Enter new email"
                                required
                              />
                              <button type="submit" disabled={isLoading}>
                                {isLoading ? "Sending..." : "Send Verification Code"}
                              </button>
                            </form>
                          )}

                          {step === 2 && (
                            <form onSubmit={handleVerifyEmailCode}>
                              <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="Enter verification code"
                                required
                              />
                              <button type="submit" disabled={isLoading}>
                                {isLoading ? "Verifying..." : "Verify & Change"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{ marginLeft: "10px", background: "#ccc", color: "#000" }}
                              >
                                Back
                              </button>
                            </form>
                          )}

                          {message && (
                            <div
                              className={
                                message.startsWith("✅")
                                  ? "success-message"
                                  : "error-message"
                              }
                            >
                              {message}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Orders */}
            <div className="order-section" style={{ marginTop: 20 }}>
              <h2>Completed Orders</h2>
              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : orders.length ? (
                <div className="order-grid">
                  {orders.map((o) => (
                    <div key={o._id} className="order-card">
                      <div className="order-header">
                        <span>Order #{o._id.slice(0, 8)}</span>
                        <span className="order-date">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="order-items">
                        {o.orderItems.map((i, idx) => (
                          <div key={idx} className="order-item">
                            <img src={i.image} alt={i.name} />
                            <div>
                              <p>{i.name}</p>
                              <p>Qty: {i.qty}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="order-footer">
                        <p>Status: {o.status}</p>
                        <p>Total: ₱{o.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No orders yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

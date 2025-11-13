// ============================================================
// ForgotPassword.jsx 
// ============================================================

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const API_URL = "https://bookstore-yl7q.onrender.com";

// ✅ Inline fallback icons (no dependency needed)
const Eye = ({ size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOff = ({ size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.9 21.9 0 0 1 5.06-5.94"></path>
    <path d="M1 1l22 22"></path>
  </svg>
);

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1=email, 2=verify, 3=reset
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Send reset code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send code.");
      setMessage("✅ " + data.message);
      setStep(2);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCodeOnly = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length < 4) {
      setMessage("❌ Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Code verification failed.");
      setMessage("✅ " + data.message);
      setStep(3);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("❌ Passwords do not match.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setMessage("❌ Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed.");
      setMessage("✅ " + data.message);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Render UI
  // ============================================================
  return (
    <div className="login-container">
      <img
        src="/assets/anime-logo.png"
        alt="Side Logo"
        className="background-logo"
      />

      <div className="login-box">
        <div className="login-left">
          <h2>RESET YOUR PASSWORD</h2>

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleSendCode}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="sign-in" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={handleVerifyCodeOnly}>
              <p className="info-message">
                A verification code was sent to <strong>{email}</strong>.
              </p>
              <input
                type="text"
                placeholder="Enter verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="sign-in" disabled={loading}>
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setMessage("");
                    setCode("");
                  }}
                  style={{
                    background: "#ccc",
                    color: "#000",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                  }}
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <p className="info-message">
                Code verified. Enter your new password for{" "}
                <strong>{email}</strong>.
              </p>

              {/* New Password */}
              <div className="password-field">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff /> : <Eye />}
                </span>
              </div>

              {/* Confirm Password */}
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="sign-in" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setMessage("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  style={{
                    background: "#ccc",
                    color: "#000",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "none",
                  }}
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Message */}
          {message && (
            <p
              className={
                message.startsWith("✅") ? "success-message" : "error-message"
              }
              style={{ marginTop: 12 }}
            >
              {message}
            </p>
          )}

          <div className="back-to-login" style={{ marginTop: 12 }}>
            <Link to="/login" className="auth-link">
              Back to Login
            </Link>
          </div>
        </div>

        <div className="login-right">
          <img src="/assets/logo.png" alt="Logo" className="logo-image" />
          <img
            src="/assets/anime-slogan.png"
            alt="Slogan"
            className="slogan-image"
          />
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

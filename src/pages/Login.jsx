// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import './Login.css';

// ✅ Automatically detect backend
const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://bookstore-yl7q.onrender.com'
    : 'http://localhost:5000');

const GOOGLE_CLIENT_ID =
  '511179588658-8e82oafm9llk795hav0v46iccddngjj3.apps.googleusercontent.com';

const Login = () => {
  const navigate = useNavigate();
  const { login, continueAsGuest, refreshUser } = useUser();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleEmailChange = (e) => setEmailInput(e.target.value);
  const handlePasswordFocus = () => setPasswordFocused(true);
  const handlePasswordBlur = () => setTimeout(() => setPasswordFocused(false), 10);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // -------------------------
  // EMAIL / PASSWORD LOGIN
  // -------------------------
const handleSubmit = async (event) => {
  event.preventDefault();
  setLoading(true);
  setError('');

  const email = event.target.email.value.trim();
  const password = event.target.password.value;

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid email or password');

    // ✅ Get detailed profile (from /api/users/profile)
    const profileRes = await fetch(`${API_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const profileData = await profileRes.json();

    // Merge and save
    const userData = {
      ...profileData,
      token: data.token,
      isLoggedIn: true,
      isGuest: false,
    };

    await login(userData);

    // ✅ Force refresh right after login to ensure consistency
    // Optional: only refresh if phone or createdAt missing
if (!userData.phone || !userData.createdAt) {
  await refreshUser?.();
}


    navigate(userData.role === 'admin' ? '/admin' : '/');
  } catch (err) {
    console.error('Login error:', err);
    setError(err.message || 'Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // -------------------------
  // GOOGLE LOGIN
  // -------------------------
  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned HTML. Check backend API.');
      }

      if (!res.ok) throw new Error(data.message || 'Google login failed');

      await login(data);
      navigate('/');
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <img src="/assets/anime-logo.png" alt="Side Logo" className="background-logo" />
      <div className="login-box">
        {/* Left Side: Login Form */}
        <div className="login-left">
          <h2>LOGIN</h2>
          {error && <p className="error-message">{error}</p>}
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              type={emailInput === 'admin' ? 'text' : 'email'}
              id="email"
              placeholder="Email"
              value={emailInput}
              onChange={handleEmailChange}
              required
            />

            <label htmlFor="password">Password</label>
            <div className="password-group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Password"
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                autoComplete="current-password"
                required
              />
              {passwordFocused && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              )}
            </div>

            <div className="forgot">
              <Link to="/forgot-password" className="auth-link forgot-password">
                Forgot Password?
              </Link>
            </div>

            <div className="login-options">
              <button type="submit" className="sign-in" disabled={loading}>
                {loading ? 'LOGGING IN...' : 'LOG IN'}
              </button>

              <div className="google-login">
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <GoogleLogin
                    onSuccess={handleGoogleLogin}
                    onError={() => setError('Google login failed. Please try again.')}
                    useOneTap
                  />
                </GoogleOAuthProvider>
              </div>
            </div>

            <div className="create-account">
              <Link to="/create-account" className="auth-link create-account-btn">
                Create Account
              </Link>
              <a
                href="#"
                className="auth-link"
                onClick={(e) => {
                  e.preventDefault();
                  continueAsGuest();
                  navigate('/');
                }}
              >
                Continue as Guest
              </a>
            </div>
          </form>
        </div>

        {/* Right Side: Images */}
        <div className="login-right">
          <img src="/assets/logo.png" alt="Logo" className="logo-image" />
          <img src="/assets/anime-slogan.png" alt="Slogan" className="slogan-image" />
        </div>
      </div>
    </div>
  );
};

export default Login;

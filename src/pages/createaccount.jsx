// ============================================================
// src/pages/CreateAccount.jsx (UPDATED)
// ============================================================
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./Login.css";

const API_URL = "https://bookstore-yl7q.onrender.com";

const CreateAccount = () => {
  const navigate = useNavigate();
  const { login } = useUser();

  const [step, setStep] = useState("email");
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 1️⃣ Send verification code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    if (!formData.email) {
      setErrors({ email: "Email is required." });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/email/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();

      // 🟡 Case 1: Manual account exists → skip verification
      if (data.skipVerification) {
        setMessage("⚠️ This email already has a manual password. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2500);
        return;
      }

      if (!res.ok) throw new Error(data.message);
      setMessage("✅ Verification code sent. Check your inbox.");
      setStep("code");
    } catch (err) {
      setErrors({ email: err.message });
    }
  };

  // 2️⃣ Verify code
// ============================================================
// STEP 2 - VERIFY CODE (ENHANCED)
// ============================================================
const handleVerifyCode = async (e) => {
  e.preventDefault();
  setMessage("");
  setErrors({});
  setIsLoading(true);

  try {
    const res = await fetch(`${API_URL}/api/email/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.email,
        code: verificationCode,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // 🟢 CASE 1: Google-linked account (prefill info)
    if (data.existing && data.googleLinked) {
      setIsGoogleLinked(true);

      // Autofill existing data if present
      setFormData((prev) => ({
        ...prev,
        firstName: data.userData?.firstName || "",
        lastName: data.userData?.lastName || "",
        phone: data.userData?.phone || "",
      }));

      setMessage(
        "✅ This email is linked with a Google account. You can update your name (optional), add your phone number, and create a manual password."
      );

      setStep("details");
      return;
    }

    // 🟡 CASE 2: Manual account exists
    if (data.existing && !data.googleLinked) {
      setMessage("⚠️ This email is already registered with a manual password. Redirecting to login...");
      setTimeout(() => navigate("/login"), 2500);
      return;
    }

    // 🆕 CASE 3: Brand new user
    setMessage("✅ Email verified. You can now create your account.");
    setStep("details");
  } catch (err) {
    setMessage("❌ " + (err.message || "Verification failed."));
  } finally {
    setIsLoading(false);
  }
};
  // 3️⃣ Final submission (same as before)
  const validateForm = () => {
    const newErrors = {};
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!formData.firstName) newErrors.firstName = "First name required.";
    if (!formData.lastName) newErrors.lastName = "Last name required.";
    if (!formData.phone) newErrors.phone = "Phone number required.";
    if (!formData.password) newErrors.password = "Password required.";
    else if (!passwordRegex.test(formData.password))
      newErrors.password =
        "Password must be 8+ chars, include a letter, number, and symbol.";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isGoogleLinked
        ? `${API_URL}/api/auth/add-manual-password`
        : `${API_URL}/api/auth/register`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (isGoogleLinked) {
        setMessage("✅ Manual password added successfully! You can now log in manually.");
        navigate("/login");
      } else {
        login({ ...data, isLoggedIn: true });
        localStorage.setItem("token", data.token);
        navigate("/");
      }
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <img src="/assets/anime-logo.png" alt="Side Logo" className="background-logo" />
      <div className="login-box">
        <div className="login-left">
          <h2>CREATE ACCOUNT</h2>
          {message && (
            <p style={{ color: message.startsWith("❌") ? "red" : "green" }}>{message}</p>
          )}
          {errors.submit && <div className="error-message">{errors.submit}</div>}

          <form
            onSubmit={
              step === "email"
                ? handleSendCode
                : step === "code"
                ? handleVerifyCode
                : handleSubmit
            }
          >
            <div className="form-fields">
              {step === "email" && (
                <>
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    {errors.email && <span className="error">{errors.email}</span>}
                  </div>
                  <button type="submit" className="sign-in">SEND CODE</button>
                </>
              )}

              {step === "code" && (
                <>
                  <div className="input-group">
                    <label>Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      required
                    />
                  </div>
                  <button type="submit" className="sign-in">VERIFY CODE</button>
                </>
              )}

              {step === "details" && (
                <>
                  {isGoogleLinked && (
                    <p style={{ background: "#e0f7fa", padding: "8px", borderRadius: "6px", color: "#00796b" }}>
                      This email is linked with Google. You can update details and add a manual password.
                    </p>
                  )}

                  {["firstName", "lastName", "phone"].map((field) => (
                    <div className="input-group" key={field}>
                      <label>
                        {field === "phone"
                          ? "Phone Number *"
                          : field.replace(/^\w/, (c) => c.toUpperCase())}
                      </label>
                      <input
                        type={field === "phone" ? "tel" : "text"}
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        placeholder={isGoogleLinked && field !== "phone" ? "(optional)" : ""}
                        required={field === "phone"}
                      />
                      {errors[field] && <span className="error">{errors[field]}</span>}
                    </div>
                  ))}

                  <div className="input-group">
                    <label>Password</label>
                    <div className="password-group">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.password && <span className="error">{errors.password}</span>}
                  </div>

                  <div className="input-group">
                    <label>Confirm Password</label>
                    <div className="password-group">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="error">{errors.confirmPassword}</span>
                    )}
                  </div>

                  <button type="submit" className="sign-in" disabled={isLoading}>
                    {isLoading
                      ? isGoogleLinked
                        ? "ADDING PASSWORD..."
                        : "CREATING ACCOUNT..."
                      : isGoogleLinked
                      ? "ADD MANUAL PASSWORD"
                      : "REGISTER"}
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="back-to-login">
            <Link to="/login" className="auth-link">Back to Login</Link>
          </div>
        </div>

        <div className="login-right">
          <img src="/assets/logo.png" alt="Logo" className="logo-image" />
          <img src="/assets/anime-slogan.png" alt="Slogan" className="slogan-image" />
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;

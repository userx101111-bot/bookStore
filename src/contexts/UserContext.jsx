// src/contexts/UserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

// Create User Context
const UserContext = createContext();

/**
 * UserProvider — handles global user state for authentication and profile.
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({ isGuest: true }); // ✅ default non-null
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ Sanitize user data
   */
  const sanitizeUserData = (data) => {
    if (!data || typeof data !== "object") return { isGuest: true };

    const {
      _id,
      name,
      firstName,
      lastName,
      email,
      role,
      loginMethod,
      createdAt,
      phone,
      address,
      token,
    } = data;

    return {
      _id,
      name,
      firstName,
      lastName,
      email,
      role,
      loginMethod,
      createdAt,
      phone,
      address,
      token,
      isGuest: false,
    };
  };

  /**
   * 🔁 Refresh user from backend
   */
      // inside src/contexts/UserContext.jsx
const refreshUser = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    let data;

    // 🔹 Try /api/auth/profile first
    let res = await fetch("https://bookstore-yl7q.onrender.com/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 🔹 Fallback to /api/users/profile if auth route fails OR missing fields
    if (!res.ok) {
      console.warn("⚠️ /api/auth/profile failed, falling back to /api/users/profile");
      res = await fetch("https://bookstore-yl7q.onrender.com/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      data = await res.json();
    } else {
      data = await res.json();

      // 🧠 Check for missing fields (phone or createdAt)
      if (!data?.createdAt || !data?.phone) {
        console.warn("⚠️ Incomplete user data, retrying via /api/users/profile");
        const retry = await fetch("https://bookstore-yl7q.onrender.com/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (retry.ok) data = await retry.json();
      }
    }

    // 🚨 Defensive check: verify we got the key profile fields
    if (!data || !data.email) {
      console.error("❌ Failed to refresh user:", data?.message || data);
      return;
    }

    // 🧹 Normalize field names & timestamps
    const cleanUser = {
      _id: data._id,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      name:
        data.firstName || data.lastName
          ? `${data.firstName || ""} ${data.lastName || ""}`.trim()
          : data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      role: data.role || "user",
      loginMethod: Array.isArray(data.loginMethod)
        ? data.loginMethod
        : [data.loginMethod || "email"],
      createdAt: data.createdAt || data.timestamp || null,
      isGuest: false,
      token,
    };

    // 🗄️ Persist & update state
    localStorage.setItem("user", JSON.stringify(cleanUser));
    setUser(cleanUser);
    setIsGuest(false);

    console.log("🔄 User refreshed:", cleanUser);
  } catch (err) {
    console.error("❌ Refresh user error:", err);
  }
};



  /**
   * 🟢 Login handler
   */
  const login = async (userData) => {
    try {
      if (!userData) return;
      const cleanUser = sanitizeUserData(userData);

      if (userData.token) localStorage.setItem("token", userData.token);
      localStorage.setItem("user", JSON.stringify(cleanUser));

      setUser(cleanUser);
      setIsGuest(false);
      console.log("🟢 User logged in:", cleanUser);
    } catch (err) {
      console.error("❌ Error saving user data:", err);
    }
  };

  /**
   * 🔴 Logout handler
   */
  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("cart");
      localStorage.removeItem("orders");
      sessionStorage.clear();

      // ✅ never null — safe fallback
      setUser({ isGuest: true });
      setIsGuest(true);

      console.log("🔴 User logged out and cache cleared");
    } catch (err) {
      console.error("❌ Error clearing cache during logout:", err);
    }
  };

  /**
   * 🟠 Continue as guest
   */
  const continueAsGuest = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser({ isGuest: true });
    setIsGuest(true);
    console.log("🟠 Continued as guest");
  };

  /**
   * 🔵 Load user from localStorage on first load
   */
useEffect(() => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      const cleanUser = sanitizeUserData(storedUser);
      setUser(cleanUser);
      setIsGuest(false);
      console.log("🔵 Loaded user from storage:", cleanUser);

      // 🔹 Auto-refresh if critical fields missing
      if (!cleanUser.createdAt || !cleanUser.phone) {
        console.log("🔄 Missing fields detected — refreshing from API");
        refreshUser();
      }
    } else {
      setUser({ isGuest: true });
      setIsGuest(true);
    }
  } catch (err) {
    console.error("❌ Failed to load stored user:", err);
    setUser({ isGuest: true });
    setIsGuest(true);
  } finally {
    setLoading(false);
  }
}, []);


  const getToken = () => localStorage.getItem("token");
  const isAdmin = () => user?.role === "admin";

  return (
    <UserContext.Provider
      value={{
        user,
        isGuest,
        loading,
        login,
        logout,
        continueAsGuest,
        getToken,
        isAdmin,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

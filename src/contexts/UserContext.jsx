import React, { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

/**
 *  UserProvider — handles global user state, login, logout, and address updates.
 */
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({ isGuest: true });
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);

  /**
   * 🧹 Sanitize user data (prevents nulls and ensures safe structure)
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
      wallet, // ✅ include wallet
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
      wallet: wallet || { balance: 0, transactions: [] }, 
      token,
      isGuest: false,
    };
  };

  /**
   *  Refresh user from backend
   */
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      let data;

      // Try `/api/auth/profile`
      let res = await fetch("https://bookstore-yl7q.onrender.com/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn("⚠️ /api/auth/profile failed, falling back to /api/users/profile");
        res = await fetch("https://bookstore-yl7q.onrender.com/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = await res.json();
      } else {
        data = await res.json();
        if (!data?.createdAt || !data?.phone) {
          console.warn("⚠️ Missing fields, retrying via /api/users/profile");
          const retry = await fetch("https://bookstore-yl7q.onrender.com/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (retry.ok) data = await retry.json();
        }
      }

      if (!data || !data.email) {
        console.error("❌ Failed to refresh user:", data?.message || data);
        return;
      }

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
        address: data.address || {},
        createdAt: data.createdAt || data.timestamp || null,
        isGuest: false,
        token,
      };

      localStorage.setItem("user", JSON.stringify(cleanUser));
      setUser(cleanUser);
      setIsGuest(false);

      console.log("🔄 User refreshed:", cleanUser);
    } catch (err) {
      console.error("❌ Refresh user error:", err);
    }
  };

  //  ADDED: Refresh wallet balance from backend
  const refreshWallet = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("https://bookstore-yl7q.onrender.com/api/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("❌ Wallet fetch failed:", res.status);
        return;
      }

      const wallet = await res.json();
      setUser((prev) => {
        const updated = { ...prev, wallet };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });

      console.log("💰 Wallet refreshed:", wallet);
    } catch (err) {
      console.error("❌ Failed to refresh wallet:", err);
    }
  };
  //  END ADDED

  /**
   *  Login handler
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

      // ✅ Auto-refresh if missing key data
      if (!cleanUser.phone || !cleanUser.createdAt) {
        console.log("🔁 Auto-refreshing user after login (missing fields)...");
        await refreshUser();
      }

      //  ADDED: Also refresh wallet after login
      await refreshWallet();
    } catch (err) {
      console.error("❌ Error saving user data:", err);
    }
  };

  /**
   * 🟢 Update user locally (used after address or profile update)
   */
  const updateUser = (newData) => {
    try {
      const cleanUser = sanitizeUserData({ ...user, ...newData });
      setUser(cleanUser);
      localStorage.setItem("user", JSON.stringify(cleanUser));
      console.log("🟢 User updated:", cleanUser);
    } catch (err) {
      console.error("❌ Failed to update user:", err);
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

        // Auto-refresh if key data missing
        if (!cleanUser.createdAt || !cleanUser.phone) {
          console.log("🔄 Missing fields detected — refreshing user...");
          refreshUser();
        }

        // 🪙 ADDED: Refresh wallet when user is loaded
        refreshWallet();
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
        updateUser, // ✅ for updating address/profile
        continueAsGuest,
        getToken,
        isAdmin,
        refreshUser,
        refreshWallet, // 🪙 ADDED export
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

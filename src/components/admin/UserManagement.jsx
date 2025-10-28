//src/components/admin/UserManagement.jsx
// ============================================================
// ✅ UserManagement.jsx (Fixed with Token Header + Safe Auth)
// ============================================================
import React, { useState, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./UserManagement.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, logout } = useUser();
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ==========================
  // 🔹 Fetch all users (admin)
  // ==========================
  const fetchUsers = async () => {
    try {
      if (!user?.token) {
        console.warn("⚠️ No token yet, skipping user fetch...");
        return;
      }
      setLoading(true);
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users`,
        {},
        user.token
      );

      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
      console.error("❌ Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // 🔹 Lifecycle: load users once user is available
  // ==========================
  useEffect(() => {
    if (user?.token) {
      fetchUsers();
    }
  }, [user]);

  // ==========================
  // 🔹 Promote to admin
  // ==========================
  const handleMakeAdmin = async (userId) => {
    if (!window.confirm("Make this user an admin?")) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users/${userId}/make-admin`,
        { method: "PUT" },
        user.token
      );

      if (!response.ok) throw new Error("Failed to promote user to admin");
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, role: "admin", isAdmin: true } : u
        )
      );
    } catch (err) {
      console.error("❌ Error promoting user:", err);
      alert("Failed to update user role.");
    }
  };

  // ==========================
  // 🔹 Remove admin privileges
  // ==========================
  const handleRemoveAdmin = async (userId) => {
    if (!window.confirm("Remove admin privileges from this user?")) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users/${userId}/remove-admin`,
        { method: "PUT" },
        user.token
      );

      if (!response.ok) throw new Error("Failed to remove admin privileges");
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, role: "user", isAdmin: false } : u
        )
      );
    } catch (err) {
      console.error("❌ Error removing admin:", err);
      alert("Failed to update user role.");
    }
  };

  // ==========================
  // 🔹 Delete user
  // ==========================
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/admin/users/${userId}`,
        { method: "DELETE" },
        user.token
      );

      if (!response.ok) throw new Error("Failed to delete user");
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      console.error("❌ Error deleting user:", err);
      alert("Failed to delete user.");
    }
  };

  // ==========================
  // 🔹 View user details
  // ==========================
  const viewUserDetails = (u) => {
    setSelectedUser(u);
    setShowModal(true);
  };

  // ==========================
  // 🔹 Logout if unauthorized
  // ==========================
  useEffect(() => {
    if (error?.includes("Unauthorized")) {
      alert("Session expired. Please log in again.");
      logout();
    }
  }, [error, logout]);

  // ==========================
  // 🔹 Render
  // ==========================
  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="user-management">
      <h2>👥 User Management</h2>

      <div className="users-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u) => (
                <tr key={u._id}>
                  <td>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                      "Unnamed"}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.isAdmin ? "Admin" : "User"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button
                      className="btn-view"
                      onClick={() => viewUserDetails(u)}
                    >
                      View
                    </button>

                    {!u.isAdmin ? (
                      <button
                        className="btn-make-admin"
                        onClick={() => handleMakeAdmin(u._id)}
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button
                        className="btn-remove-admin"
                        onClick={() => handleRemoveAdmin(u._id)}
                      >
                        Remove Admin
                      </button>
                    )}

                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(u._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-users">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======================
          🔹 User Detail Modal
      ====================== */}
      {showModal && selectedUser && (
        <div className="user-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>User Details</h3>
              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p>
                <strong>ID:</strong> {selectedUser._id}
              </p>
              <p>
                <strong>Name:</strong>{" "}
                {[selectedUser.firstName, selectedUser.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>Role:</strong>{" "}
                {selectedUser.isAdmin ? "Admin" : "User"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(selectedUser.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Updated:</strong>{" "}
                {new Date(selectedUser.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

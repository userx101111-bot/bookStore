// src/components/admin/UserManagement.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./UserManagement.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UserManagement = () => {
  const { user, logout } = useUser();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("users"); // "users" or "admins"
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // 🔹 Fetch all users
  const fetchUsers = async () => {
    try {
      if (!user?.token) return;
      setLoading(true);
      const response = await fetchWithAuth(`${API_URL}/api/admin/users`, {}, user.token);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchUsers();
  }, [user]);

  // 🔍 Search
  useEffect(() => {
    const q = search.toLowerCase();
    const list = users.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
    setFilteredUsers(list);
  }, [search, users]);

  // 🔧 Promote/Demote/Delete
const handleAction = async (userId, action) => {
  let confirmMsg = "";
  if (action === "makeAdmin") confirmMsg = "Promote this user to admin?";
  if (action === "removeAdmin") confirmMsg = "Remove this admin role?";
  if (action === "delete") confirmMsg = "Delete this account permanently?";
  if (!window.confirm(confirmMsg)) return;

  let method = "PUT";
  let url = `${API_URL}/api/admin/users/${userId}`;

  if (action === "makeAdmin") url += "/make-admin";
  if (action === "removeAdmin") url += "/remove-admin";
  if (action === "delete") {
    url = `${API_URL}/api/admin/users/${userId}`;
    method = "DELETE";
  }

  const res = await fetchWithAuth(url, { method }, user.token);
  if (res.ok) {
    await fetchUsers(); // refresh table
    // 🟢 If the admin promoted themselves, refresh their user context
    if (userId === user._id && action === "makeAdmin") {
      const refresh = await fetchWithAuth(`${API_URL}/api/auth/me`, {}, user.token);
      if (refresh.ok) {
        const updated = await refresh.json();
        localStorage.setItem("user", JSON.stringify(updated)); // refresh local cache
        window.location.reload(); // reload to re-run isAdmin()
      }
    }
  }
};


  const viewUserDetails = (u) => {
    setSelectedUser(u);
    setShowModal(true);
  };

  const visibleList = filteredUsers.filter((u) =>
    activeTab === "admins" ? u.isAdmin : !u.isAdmin
  );

  if (loading)
    return (
      <div className="user-loading">
        <div className="skeleton-table" />
      </div>
    );

  return (
    <div className="user-management">
      <div className="user-header">
        <h2>👥 User & Admin Management</h2>
        <input
          type="text"
          placeholder="Search by name or email..."
          className="user-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="user-tabs">
        <button
          className={activeTab === "users" ? "tab active" : "tab"}
          onClick={() => setActiveTab("users")}
        >
          Users ({users.filter((u) => !u.isAdmin).length})
        </button>
        <button
          className={activeTab === "admins" ? "tab active" : "tab"}
          onClick={() => setActiveTab("admins")}
        >
          Admins ({users.filter((u) => u.isAdmin).length})
        </button>
      </div>

      <div className="users-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleList.length > 0 ? (
              visibleList.map((u) => (
                <tr key={u._id}>
                  <td>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unnamed"}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.isAdmin ? "admin-role" : "user-role"}`}>
                      {u.isAdmin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button className="btn-view" onClick={() => viewUserDetails(u)}>
                      View
                    </button>
                    {u.isAdmin ? (
                      <button
                        className="btn-remove-admin"
                        onClick={() => handleAction(u._id, "removeAdmin")}
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        className="btn-make-admin"
                        onClick={() => handleAction(u._id, "makeAdmin")}
                      >
                        Promote
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => handleAction(u._id, "delete")}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-users">
                  No {activeTab === "admins" ? "admins" : "users"} found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedUser && (
        <div className="user-modal fade-in">
          <div className="modal-content slide-up">
            <div className="modal-header">
              <h3>👤 User Details</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                <strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>Role:</strong>{" "}
                <span className={`role-badge ${selectedUser.isAdmin ? "admin-role" : "user-role"}`}>
                  {selectedUser.isAdmin ? "Admin" : "User"}
                </span>
              </p>
              <p>
                <strong>Joined:</strong>{" "}
                {new Date(selectedUser.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Last Updated:</strong>{" "}
                {new Date(selectedUser.updatedAt).toLocaleString()}
              </p>
              <p>
                <strong>ID:</strong> {selectedUser._id}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

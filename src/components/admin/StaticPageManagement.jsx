// ============================================================
//  src/components/admin/StaticPageManagement.jsx 
// ============================================================
import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "../AdminDashboard.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const StaticPageManagement = () => {
  const { user } = useUser();
  const [pages, setPages] = useState([]);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    content: "",
    isActive: true,
  });
  const [editingPage, setEditingPage] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // 🔧 Utility: Generate slug from title
  // ============================================================
  const generateSlug = (title) => {
    return title
      .trim()
      .toLowerCase()
      .replace(/^\/+/, "") // remove leading slashes
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/[^a-z0-9\-]/g, ""); // remove invalid chars
  };

  // ============================================================
  // 🔄 Fetch all pages
  // ============================================================
  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/static-pages`, {}, user.token);
      const data = await res.json();
      setPages(data);
    } catch (err) {
      console.error("❌ Error fetching pages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchPages();
  }, [user?.token]);

  // ============================================================
  // 🧠 Handle form submit (slug auto-cleaned)
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanSlug = formData.slug
      .trim()
      .replace(/^\/+/, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    const cleanData = { ...formData, slug: cleanSlug };

    const method = editingPage ? "PUT" : "POST";
    const url = editingPage
      ? `${API_URL}/api/static-pages/${editingPage._id}`
      : `${API_URL}/api/static-pages`;

    try {
      const res = await fetchWithAuth(
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanData),
        },
        user.token
      );

      if (!res.ok) throw new Error("Failed to save page");

      fetchPages();
      resetForm();
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  };

  // ============================================================
  // ✏️ Handle edits
  // ============================================================
  const handleEdit = (page) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      isActive: page.isActive,
    });
  };

  // ============================================================
  // 🗑️ Handle delete
  // ============================================================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this page?")) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/static-pages/${id}`,
        { method: "DELETE" },
        user.token
      );
      if (!res.ok) throw new Error("Failed to delete");
      fetchPages();
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }
  };

  // ============================================================
  // 🔄 Reset form
  // ============================================================
  const resetForm = () => {
    setFormData({ slug: "", title: "", content: "", isActive: true });
    setEditingPage(null);
  };

  // ============================================================
  // 🧩 Render
  // ============================================================
  if (loading) return <div className="loading">Loading pages...</div>;

  return (
    <div className="admin-container">
      <h2>📄 Manage Static Pages</h2>

      <form onSubmit={handleSubmit} className="product-form">
        {/* Title Field */}
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={(e) => {
              const newTitle = e.target.value;
              setFormData({
                ...formData,
                title: newTitle,
                // Auto-generate slug only if not editing or slug matches old title-based slug
                slug:
                  editingPage && formData.slug !== generateSlug(editingPage.title)
                    ? formData.slug
                    : generateSlug(newTitle),
              });
            }}
            required
          />
        </div>

        {/* Slug Field (Auto-Generated) */}
        <div className="form-group">
          <label>Slug (auto-generated)</label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={(e) => {
              // Allow manual override if needed
              setFormData({ ...formData, slug: generateSlug(e.target.value) });
            }}
            required
          />
          <small className="slug-hint">
            Will appear at: <strong>/{formData.slug || "your-slug"}</strong>
          </small>
        </div>

        {/* Content Field */}
        <div className="form-group full-width">
          <label>Content</label>
          <textarea
            name="content"
            value={formData.content}
            rows="6"
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
        </div>

        {/* Active Checkbox */}
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            Active
          </label>
        </div>

        {/* Buttons */}
        <div className="form-buttons">
          <button type="submit" className="btn-submit">
            {editingPage ? "Update Page" : "Add Page"}
          </button>
          {editingPage && (
            <button type="button" className="btn-cancel" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Existing Pages Table */}
      <h3>Existing Pages</h3>
      <table className="products-table">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Title</th>
            <th>Active</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p._id}>
              <td>/{p.slug}</td>
              <td>{p.title}</td>
              <td>{p.isActive ? "✅" : "❌"}</td>
              <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
              <td className="actions">
                <button className="btn-edit" onClick={() => handleEdit(p)}>
                  Edit
                </button>
                <button className="btn-delete" onClick={() => handleDelete(p._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StaticPageManagement;

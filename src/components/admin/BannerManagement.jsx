// ============================================================
//  BannerManagement.jsx — Full Modern Interactive Version
// ============================================================

import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "../AdminDashboard.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const BannerManagement = () => {
  const { user } = useUser();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [previewDesktop, setPreviewDesktop] = useState(null);
  const [previewMobile, setPreviewMobile] = useState(null);
  const fileDesktopRef = useRef(null);
  const fileMobileRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    ctaText: "",
    ctaLink: "",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    animationType: "fade",
    order: 0,
    isActive: true,
    imageDesktop: null,
    imageMobile: null,
  });

  // ============================================================
  // 🔹 Fetch Banners
  // ============================================================
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/cms/banners`, {}, user.token);
      const data = await res.json();
      setBanners(data);
    } catch (err) {
      console.error("❌ Error fetching banners:", err);
      alert("Failed to fetch banners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchBanners();
  }, [user]);

  // ============================================================
  // 🔹 Handle Input Changes
  // ============================================================
  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "file" && files.length > 0) {
      const file = files[0];
      setFormData((prev) => ({ ...prev, [name]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        if (name === "imageDesktop") setPreviewDesktop(reader.result);
        else if (name === "imageMobile") setPreviewMobile(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ============================================================
  // 🔹 Submit Banner
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API_URL}/api/cms/banners/${currentBanner._id}`
        : `${API_URL}/api/cms/banners`;
      const method = isEditing ? "PUT" : "POST";

      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) data.append(key, value);
      });

      const res = await fetchWithAuth(url, { method, body: data }, user.token);
      if (!res.ok) throw new Error("Failed to save banner");

      await fetchBanners();
      resetForm();
      alert(isEditing ? "✅ Banner updated!" : "✅ Banner added!");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Failed to save banner. Check console for details.");
    }
  };

  // ============================================================
  // 🔹 Edit Banner
  // ============================================================
  const handleEdit = (b) => {
    setIsEditing(true);
    setCurrentBanner(b);
    setFormData({
      title: b.title,
      subtitle: b.subtitle || "",
      ctaText: b.ctaText || "",
      ctaLink: b.ctaLink || "",
      backgroundColor: b.backgroundColor || "#ffffff",
      textColor: b.textColor || "#000000",
      animationType: b.animationType || "fade",
      order: b.order || 0,
      isActive: b.isActive,
      imageDesktop: b.imageDesktop,
      imageMobile: b.imageMobile,
    });
    setPreviewDesktop(b.imageDesktop);
    setPreviewMobile(b.imageMobile);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================
  // 🔹 Delete Banner
  // ============================================================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/api/cms/banners/${id}`, { method: "DELETE" }, user.token);
      if (!res.ok) throw new Error("Failed to delete");
      await fetchBanners();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete banner.");
    }
  };

  // ============================================================
  // 🔹 Reset Form
  // ============================================================
  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      ctaText: "",
      ctaLink: "",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      animationType: "fade",
      order: 0,
      isActive: true,
      imageDesktop: null,
      imageMobile: null,
    });
    setPreviewDesktop(null);
    setPreviewMobile(null);
    setIsEditing(false);
    setCurrentBanner(null);
    if (fileDesktopRef.current) fileDesktopRef.current.value = "";
    if (fileMobileRef.current) fileMobileRef.current.value = "";
  };

  // ============================================================
  // 🔹 Render
  // ============================================================
  if (loading) return <div className="loading">Loading banners...</div>;

  return (
    <div className="admin-container">
      <h2>🖼️ Banner Management</h2>

      <form onSubmit={handleSubmit} className="banner-form">
        <div className="form-group">
          <label>Title *</label>
          <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Subtitle</label>
          <input type="text" name="subtitle" value={formData.subtitle} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>CTA Text</label>
          <input type="text" name="ctaText" value={formData.ctaText} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>CTA Link</label>
          <input type="text" name="ctaLink" value={formData.ctaLink} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Desktop Image *</label>
          <input
            type="file"
            name="imageDesktop"
            accept="image/*"
            ref={fileDesktopRef}
            onChange={handleInputChange}
            required={!isEditing}
          />
          {previewDesktop && <img src={previewDesktop} alt="desktop preview" className="banner-thumb" />}
        </div>

        <div className="form-group">
          <label>Mobile Image</label>
          <input
            type="file"
            name="imageMobile"
            accept="image/*"
            ref={fileMobileRef}
            onChange={handleInputChange}
          />
          {previewMobile && <img src={previewMobile} alt="mobile preview" className="banner-thumb" />}
        </div>

        <div className="form-group">
          <label>Background Color</label>
          <input type="color" name="backgroundColor" value={formData.backgroundColor} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Text Color</label>
          <input type="color" name="textColor" value={formData.textColor} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Animation</label>
          <select name="animationType" value={formData.animationType} onChange={handleInputChange}>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="zoom">Zoom</option>
          </select>
        </div>

        <div className="form-group">
          <label>Display Order</label>
          <input type="number" name="order" value={formData.order} onChange={handleInputChange} />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} />
            Active
          </label>
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn-submit">
            {isEditing ? "Update Banner" : "Add Banner"}
          </button>
          {isEditing && (
            <button type="button" className="btn-cancel" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Banners Table */}
      <div className="banners-list">
        <h3>Existing Banners</h3>
        {banners.length === 0 ? (
          <div className="no-banners">No banners found.</div>
        ) : (
          <table className="banners-table">
            <thead>
              <tr>
                <th>Desktop</th>
                <th>Title</th>
                <th>Order</th>
                <th>Animation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b._id}>
                  <td><img src={b.imageDesktop} alt={b.title} className="banner-thumb" /></td>
                  <td>{b.title}</td>
                  <td>{b.order}</td>
                  <td>{b.animationType}</td>
                  <td>{b.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(b)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(b._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BannerManagement;

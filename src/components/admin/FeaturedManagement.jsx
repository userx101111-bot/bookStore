// src/components/admin/FeaturedManagement.jsx
import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "../AdminDashboard.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

/**
 * Simple featured management UI:
 * - Lists admin products
 * - Allows toggling isPromotion / isNewArrival / isPopular
 * - Saves each product individually (quick) or "Save All" to bulk update
 *
 * Note: Uses admin endpoints already implemented (PUT /api/admin/products/:id)
 */

const FeaturedManagement = () => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.token) fetchProducts();
    // eslint-disable-next-line
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/admin/products`, {}, user.token);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fetch products failed:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = (index, flag) => {
    setProducts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [flag]: !copy[index][flag] };
      return copy;
    });
  };

  const saveProduct = async (prod) => {
    try {
      setSaving(true);
      // Build FormData similar to ProductManagement to send minimal fields and variants
      const data = new FormData();
      // send only flags and minimal fields
      data.append("isPromotion", prod.isPromotion ? "true" : "false");
      data.append("isNewArrival", prod.isNewArrival ? "true" : "false");
      data.append("isPopular", prod.isPopular ? "true" : "false");
      // Also append essential fields to avoid overwriting with undefined
      data.append("name", prod.name || "");
      data.append("slug", prod.slug || "");
      data.append("status", prod.status || "Active");
      // send variants as JSON string (send existing variants to avoid being overwritten)
      data.append("variants", JSON.stringify(prod.variants || []));

      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products/${prod._id}`,
        { method: "PUT", body: data },
        user.token
      );
      if (!res.ok) throw new Error("Failed to save product");
      const updated = await res.json();
      return updated;
    } catch (err) {
      console.error("❌ Save product failed:", err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      for (const p of products) {
        await saveProduct(p);
      }
      alert("✅ All featured flags saved!");
      fetchProducts();
    } catch (err) {
      alert("Error saving some products. Check console.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <div className="admin-container">
      <h2>Featured Products Management</h2>
      <p>Toggle which products appear in Promotions / New Arrivals / Popular.</p>

      <div className="featured-list">
        {products.map((p, i) => (
          <div key={p._id} className="featured-row">
            <div className="featured-left">
              <strong>{p.name}</strong>
              <div className="muted">{p.category} • {p.slug}</div>
            </div>
            <div className="featured-flags">
              <label>
                <input
                  type="checkbox"
                  checked={!!p.isPromotion}
                  onChange={() => toggleFlag(i, "isPromotion")}
                />{" "}
                Promo
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!p.isNewArrival}
                  onChange={() => toggleFlag(i, "isNewArrival")}
                />{" "}
                New
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={!!p.isPopular}
                  onChange={() => toggleFlag(i, "isPopular")}
                />{" "}
                Popular
              </label>
              <button
                className="btn-save-small"
                onClick={async () => {
                  try {
                    await saveProduct(p);
                    alert("✅ Saved");
                    fetchProducts();
                  } catch {
                    alert("Failed to save");
                  }
                }}
                disabled={saving}
              >
                Save
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn-submit" onClick={handleSaveAll} disabled={saving}>
          Save All
        </button>
        <button className="btn-cancel" style={{ marginLeft: 8 }} onClick={fetchProducts}>
          Reload
        </button>
      </div>
    </div>
  );
};

export default FeaturedManagement;

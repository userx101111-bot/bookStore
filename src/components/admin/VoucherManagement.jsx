import React, { useState, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./VoucherManagement.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const VoucherManagement = () => {
  const { user } = useUser();
  const [vouchers, setVouchers] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    type: "discount",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    max_discount: "",
    min_spend: "",
    start_date: "",
    end_date: "",
    is_active: true,
    productIds: [],
    variantLinks: [],
  });

  // ✅ Fetch vouchers and products
  useEffect(() => {
    if (user?.token) {
      fetchVouchers();
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ Get ALL vouchers (not just active)
  const fetchVouchers = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/vouchers/all`, {}, user.token);
      const data = await res.json();

      console.log("📦 Admin vouchers fetched:", data);

      // Sort newest first
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];

      setVouchers(sorted);
    } catch (err) {
      console.error("❌ Fetch vouchers failed:", err);
      setVouchers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/admin/products`, {}, user.token);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("❌ Fetch products failed:", err);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingVoucher(null);
    setFormData({
      name: "",
      type: "discount",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      max_discount: "",
      min_spend: "",
      start_date: "",
      end_date: "",
      is_active: true,
      productIds: [],
      variantLinks: [],
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProductToggle = (productId) => {
    setFormData((prev) => {
      const newIds = new Set(prev.productIds);
      if (newIds.has(productId)) newIds.delete(productId);
      else newIds.add(productId);
      return { ...prev, productIds: Array.from(newIds) };
    });
  };

  const handleVariantToggle = (productId, variantId) => {
    setFormData((prev) => {
      const existing = [...prev.variantLinks];
      const idx = existing.findIndex(
        (v) => v.product === productId && v.variant_id === variantId
      );
      if (idx >= 0) existing.splice(idx, 1);
      else existing.push({ product: productId, variant_id: variantId });
      return { ...prev, variantLinks: existing };
    });
  };

  const handleExpandToggle = (productId) => {
    setExpandedProducts((prev) => {
      const copy = new Set(prev);
      if (copy.has(productId)) copy.delete(productId);
      else copy.add(productId);
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingVoucher ? "PUT" : "POST";
      const url = editingVoucher
        ? `${API_URL}/api/vouchers/${editingVoucher._id}`
        : `${API_URL}/api/vouchers`;

      const body = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value || 0),
        max_discount: Number(formData.max_discount || 0),
        min_spend: Number(formData.min_spend || 0),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        applicable_products: formData.productIds,
        applicable_variants: formData.variantLinks,
      };

      console.log("🧾 Voucher payload being sent:", body);

      const res = await fetchWithAuth(
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        user.token
      );

      const responseText = await res.text();
      console.log("📩 Voucher save response:", res.status, responseText);

      if (!res.ok) throw new Error(`Failed to save voucher: ${res.status} ${responseText}`);

      await fetchVouchers();
      resetForm();
      alert("✅ Voucher saved successfully!");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert(`Error saving voucher: ${err.message}`);
    }
  };

  const handleEdit = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      ...voucher,
      productIds: voucher.applicable_products?.map((p) => p._id) || [],
      variantLinks:
        voucher.applicable_variants?.map((v) => ({
          product: v.product?._id || v.product,
          variant_id: v.variant_id,
        })) || [],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this voucher?")) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/vouchers/${id}`,
        { method: "DELETE" },
        user.token
      );
      if (!res.ok) throw new Error("Failed to delete voucher");
      fetchVouchers();
      alert("🗑️ Voucher deleted successfully!");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete voucher.");
    }
  };

  // ✅ Voucher status helper (color-coded)
  const getVoucherStatus = (voucher) => {
    const now = new Date();
    const start = new Date(voucher.start_date);
    const end = new Date(voucher.end_date);

    if (!voucher.is_active) return { label: "Inactive", color: "#999" };
    if (end < now) return { label: "Expired", color: "#e74c3c" };
    if (start > now) return { label: "Upcoming", color: "#f39c12" };
    return { label: "Active", color: "#2ecc71" };
  };

  if (loading) return <div className="loading">Loading vouchers...</div>;

  return (
    <div className="admin-container">
      <h2>{editingVoucher ? "Edit Voucher" : "Create Voucher"}</h2>

      {/* =========================
          VOUCHER FORM
      ========================== */}
      <form onSubmit={handleSubmit} className="voucher-form">
        <label>Voucher Name</label>
        <input name="name" value={formData.name} onChange={handleInputChange} required />

        <label>Type</label>
        <select name="type" value={formData.type} onChange={handleInputChange}>
          <option value="discount">Discount</option>
          <option value="free_shipping">Free Shipping</option>
        </select>

        <label>Discount Type</label>
        <select
          name="discount_type"
          value={formData.discount_type}
          onChange={handleInputChange}
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </select>

        <label>Discount Value</label>
        <input
          type="number"
          name="discount_value"
          value={formData.discount_value}
          onChange={handleInputChange}
        />

        <label>Max Discount</label>
        <input
          type="number"
          name="max_discount"
          value={formData.max_discount}
          onChange={handleInputChange}
        />

        <label>Minimum Spend</label>
        <input
          type="number"
          name="min_spend"
          value={formData.min_spend}
          onChange={handleInputChange}
        />

        <label>Start Date</label>
        <input
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleInputChange}
        />

        <label>End Date</label>
        <input
          type="date"
          name="end_date"
          value={formData.end_date}
          onChange={handleInputChange}
        />

        <label>
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleInputChange}
          />
          Active
        </label>

        {/* =========================
            PRODUCT / VARIANT SELECTOR
        ========================== */}
        <h4>Select Applicable Products / Variants</h4>

        <div className="product-selector">
          {/* 🔎 Filters */}
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search products..."
              className="filter-search"
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              value={searchQuery}
            />

            <select
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory("");
              }}
            >
              <option value="">All Categories</option>
              {Array.from(new Set(products.map((p) => p.category))).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              disabled={!selectedCategory}
            >
              <option value="">All Subcategories</option>
              {Array.from(
                new Set(
                  products
                    .filter((p) => p.category === selectedCategory)
                    .map((p) => p.subcategory)
                    .filter(Boolean)
                )
              ).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="filter-btn"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  productIds: products.map((p) => p._id),
                  variantLinks: products.flatMap((p) =>
                    p.variants.map((v) => ({ product: p._id, variant_id: v._id }))
                  ),
                }))
              }
            >
              Select All
            </button>

            <button
              type="button"
              className="filter-btn clear"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  productIds: [],
                  variantLinks: [],
                }))
              }
            >
              Unselect All
            </button>
          </div>

          {/* Product List */}
          <div className="selector-list">
            {products
              .filter(
                (p) =>
                  (!selectedCategory || p.category === selectedCategory) &&
                  (!selectedSubcategory || p.subcategory === selectedSubcategory) &&
                  p.name.toLowerCase().includes(searchQuery)
              )
              .map((p) => {
                const productSelected = formData.productIds.includes(p._id);
                const expanded = expandedProducts.has(p._id);

                return (
                  <div
                    key={p._id}
                    className={`product-card ${productSelected ? "selected" : ""}`}
                  >
                    <div
                      className="product-card-header"
                      onClick={() => handleExpandToggle(p._id)}
                    >
                      <div className="product-main">
                        <input
                          type="checkbox"
                          checked={productSelected}
                          onChange={() => handleProductToggle(p._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="product-title">{p.name}</span>
                        <span className="meta-info">
                          {p.category} → {p.subcategory || "—"}
                        </span>
                        {p.isPromotion && <span className="tag">Promo</span>}
                      </div>
                      <button
                        type="button"
                        className="expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandToggle(p._id);
                        }}
                      >
                        {expanded ? "▲" : "▼"}
                      </button>
                    </div>

                    {expanded && (
                      <div className="variant-grid">
                        {p.variants?.length ? (
                          p.variants.map((v) => {
                            const isChecked = formData.variantLinks.some(
                              (link) =>
                                link.product === p._id && link.variant_id === v._id
                            );
                            return (
                              <label
                                key={v._id}
                                className={`variant-box ${isChecked ? "checked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleVariantToggle(p._id, v._id)}
                                />
                                <span>
                                  {v.format || "Default"} – ₱{v.price}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="no-variants">No variants</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <button type="submit" className="btn-submit">
          {editingVoucher ? "Update Voucher" : "Create Voucher"}
        </button>
        {editingVoucher && (
          <button type="button" className="btn-cancel" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      {/* =========================
          EXISTING VOUCHERS TABLE
      ========================== */}
      <div className="voucher-table-container">
        <h2>Existing Vouchers</h2>
        {vouchers.length === 0 ? (
          <div>No vouchers found.</div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Period</th>
                <th>Status</th>
                <th>Linked Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => {
                const status = getVoucherStatus(v);
                return (
                  <tr key={v._id}>
                    <td>{v.name}</td>
                    <td>{v.type}</td>
                    <td>
                      {v.discount_type === "percentage"
                        ? `${v.discount_value}%`
                        : `₱${v.discount_value}`}
                    </td>
                    <td>
                      {v.start_date?.slice(0, 10)} → {v.end_date?.slice(0, 10)}
                    </td>
                    <td>
                      <span
                        className="voucher-status"
                        style={{
                          backgroundColor: status.color,
                          color: "#fff",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontWeight: "600",
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td>
                      {v.applicable_products?.length || 0} products,{" "}
                      {v.applicable_variants?.length || 0} variants
                    </td>
                    <td>
                      <button onClick={() => handleEdit(v)}>Edit</button>
                      <button onClick={() => handleDelete(v._id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default VoucherManagement;

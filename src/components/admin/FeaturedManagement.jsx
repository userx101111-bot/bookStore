import React, { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./FeaturedManagement.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const FeaturedManagement = () => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  // Modal state
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState("");
  const [selectedVariants, setSelectedVariants] = useState([]);

  useEffect(() => {
    if (user?.token) {
      fetchProducts();
      fetchVouchers();
    }
    // eslint-disable-next-line
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_URL}/api/admin/products`, {}, user.token);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      setFilteredProducts(Array.isArray(data) ? data : []);
      const uniqueCategories = Array.from(new Set(data.map((p) => p.category).filter(Boolean)));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error("❌ Fetch products failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVouchers = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/vouchers`, {}, user.token);
      const data = await res.json();
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Fetch vouchers failed:", err);
    }
  };

  const toggleFlag = async (index, flag) => {
    const product = filteredProducts[index];
    const updatedProducts = [...filteredProducts];
    updatedProducts[index] = { ...product, [flag]: !product[flag] };
    setFilteredProducts(updatedProducts);

    // 🧩 If setting promo ON for a product that has no voucher -> open modal
    if (flag === "isPromotion" && !product.isPromotion) {
      setModalProduct(product);
      setShowVoucherModal(true);
    }
  };

  const handleApplyVoucher = async () => {
    try {
      if (!selectedVoucher || selectedVariants.length === 0) {
        alert("Please select a voucher and at least one variant.");
        return;
      }

      setSaving(true);
      const payload = {
        productIds: [],
        variantLinks: selectedVariants.map((variantId) => ({
          product: modalProduct._id,
          variant_id: variantId,
        })),
      };

      const res = await fetchWithAuth(
        `${API_URL}/api/vouchers/${selectedVoucher}/link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        user.token
      );

      if (!res.ok) throw new Error("Failed to link voucher");

      alert("✅ Voucher successfully applied!");
      setShowVoucherModal(false);
      setModalProduct(null);
      setSelectedVoucher("");
      setSelectedVariants([]);
      fetchProducts();
    } catch (err) {
      console.error("❌ Apply voucher failed:", err);
      alert("Error applying voucher. See console.");
    } finally {
      setSaving(false);
    }
  };

  const handleVariantSelect = (variantId) => {
    setSelectedVariants((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleSearchAndFilter = () => {
    let result = [...products];
    const q = searchQuery.toLowerCase();
    if (searchQuery.trim() !== "")
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    if (selectedCategory) result = result.filter((p) => p.category === selectedCategory);
    if (selectedSubcategory) result = result.filter((p) => p.subcategory === selectedSubcategory);
    setFilteredProducts(result);
  };

  useEffect(() => {
    handleSearchAndFilter();
  }, [searchQuery, selectedCategory, selectedSubcategory]);

  if (loading) return <div className="loading">Loading products...</div>;

  const subcategories = selectedCategory
    ? Array.from(
        new Set(
          products
            .filter((p) => p.category === selectedCategory)
            .map((p) => p.subcategory)
            .filter(Boolean)
        )
      )
    : [];

  return (
    <div className="admin-container">
      <h2>Featured Products Management</h2>
      <p>Manage Promotions, New Arrivals, and Popular items.</p>

      {/* ===================== FILTER BAR ===================== */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="🔍 Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="filter-search"
        />
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubcategory("");
          }}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={selectedSubcategory}
          onChange={(e) => setSelectedSubcategory(e.target.value)}
          className="filter-select"
          disabled={!selectedCategory}
        >
          <option value="">
            {selectedCategory ? "All Subcategories" : "Select Category First"}
          </option>
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
        <button
          className="btn-reset"
          onClick={() => {
            setSearchQuery("");
            setSelectedCategory("");
            setSelectedSubcategory("");
          }}
        >
          Reset
        </button>
      </div>

      {/* ===================== PRODUCT LIST ===================== */}
      <div className="featured-list">
        {filteredProducts.length === 0 ? (
          <div className="no-results">No matching products.</div>
        ) : (
          filteredProducts.map((p, i) => (
            <div key={p._id} className="featured-row">
              <div className="featured-left">
                <strong>{p.name}</strong>
                <div className="muted">
                  {p.category} {p.subcategory && `→ ${p.subcategory}`} • {p.slug}
                </div>
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===================== VOUCHER MODAL ===================== */}
      {showVoucherModal && modalProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Apply Voucher for: {modalProduct.name}</h3>

            <label>🎟️ Select Voucher</label>
            <select
              value={selectedVoucher}
              onChange={(e) => setSelectedVoucher(e.target.value)}
            >
              <option value="">-- Select Voucher --</option>
              {vouchers.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name} ({v.discount_type === "percentage"
                    ? `${v.discount_value}%`
                    : `₱${v.discount_value}`})
                </option>
              ))}
            </select>

            <h4>📚 Select Product Variants</h4>
            <div className="variant-list">
              {modalProduct.variants?.length > 0 ? (
                modalProduct.variants.map((v) => (
                  <label key={v._id} className="variant-item">
                    <input
                      type="checkbox"
                      checked={selectedVariants.includes(v._id)}
                      onChange={() => handleVariantSelect(v._id)}
                    />
                    {v.format} – ₱{v.price}
                  </label>
                ))
              ) : (
                <p>No variants available.</p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-submit"
                onClick={handleApplyVoucher}
                disabled={saving}
              >
                {saving ? "Applying..." : "Apply Voucher"}
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowVoucherModal(false);
                  setModalProduct(null);
                  setSelectedVoucher("");
                  setSelectedVariants([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedManagement;

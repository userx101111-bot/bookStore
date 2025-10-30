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
  // ✅ Update a single flag (New, Popular, etc.)
const updateProductFlag = async (productId, flag, value) => {
  try {
    const res = await fetchWithAuth(
      `${API_URL}/api/admin/products/${productId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: value }),
      },
      user.token
    );

    if (!res.ok) throw new Error("Failed to update product flag");
    console.log(`✅ ${flag} updated successfully`);
  } catch (err) {
    console.error("❌ Error updating flag:", err);
    alert("Failed to update product flag.");
  }
};


const toggleFlag = async (index, flag) => {
  const product = filteredProducts[index];
  const newValue = !product[flag];
  const updatedProducts = [...filteredProducts];
  updatedProducts[index] = { ...product, [flag]: newValue };
  setFilteredProducts(updatedProducts);

  // ✅ If setting promo ON and has no voucher → open voucher modal
  if (flag === "isPromotion" && newValue) {
    setModalProduct(product);
    setShowVoucherModal(true);
    return;
  }

  // ✅ If unchecking promo → call backend to unlink vouchers & unset promo
  if (flag === "isPromotion" && !newValue) {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products/${product._id}/unset-promo`,
        { method: "PATCH" },
        user.token
      );
      if (!res.ok) throw new Error("Failed to unset promo");
      console.log("✅ Promo unset and vouchers unlinked");
    } catch (err) {
      console.error("❌ Error unsetting promo:", err);
      alert("Failed to remove promo status.");
    }
    return;
  }

  // ✅ For normal flags (New, Popular) → update product flag
  await updateProductFlag(product._id, flag, newValue);
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

      {/* 🎟️ Select Voucher */}
      <label>🎟️ Select Voucher</label>
      <select
        value={selectedVoucher}
        onChange={(e) => setSelectedVoucher(e.target.value)}
      >
        <option value="">-- Select Voucher --</option>
        {vouchers.map((v) => (
          <option key={v._id} value={v._id}>
            {v.name} (
            {v.discount_type === "percentage"
              ? `${v.discount_value}%`
              : `₱${v.discount_value}`}
            )
          </option>
        ))}
      </select>

      {/* 📚 Variant Selection */}
      <h4>📚 Select Product Variants</h4>
      <div className="variant-list">
        {modalProduct.variants?.length > 0 ? (
          modalProduct.variants.map((v) => {
            const price = Number(v.price) || 0;
            const isChecked = selectedVariants.includes(v._id);

            // Compute variant-specific discount summary if selectedVoucher chosen
            const voucher = vouchers.find((vv) => vv._id === selectedVoucher);
            let discount = 0;
            let finalPrice = price;

            if (voucher && isChecked) {
              if (voucher.discount_type === "percentage") {
                discount = (voucher.discount_value / 100) * price;
              } else if (voucher.discount_type === "fixed") {
                discount = voucher.discount_value;
              }

              if (voucher.max_discount && discount > voucher.max_discount) {
                discount = voucher.max_discount;
              }

              finalPrice = Math.max(price - discount, 0);
            }

            return (
              <div
                key={v._id}
                className={`variant-box ${isChecked ? "selected" : ""}`}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                  marginBottom: "8px",
                  background: isChecked ? "#eef6ff" : "#fff",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleVariantSelect(v._id)}
                  />
                  <span>
                    {v.format} – ₱{price.toLocaleString()}
                  </span>
                </label>

                {/* 🧾 Per-variant summary if voucher selected */}
                {selectedVoucher && isChecked && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px",
                      background: "#f9f9f9",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      color: "#333",
                    }}
                  >
                    <p style={{ margin: "2px 0" }}>
                      Original: <b>₱{price.toLocaleString()}</b>
                    </p>
                    <p style={{ margin: "2px 0" }}>
                      Discount:{" "}
                      <b>
                        ₱{discount.toLocaleString()}{" "}
                        {voucher.discount_type === "percentage"
                          ? `(${voucher.discount_value}%)`
                          : ""}
                      </b>
                    </p>
                    <p style={{ margin: "2px 0" }}>
                      Final Price:{" "}
                      <b style={{ color: "#007bff" }}>
                        ₱{finalPrice.toLocaleString()}
                      </b>
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p>No variants available.</p>
        )}
      </div>

      {/* ✅ Optional: Grand Total Summary */}
      {selectedVoucher && selectedVariants.length > 0 && (() => {
        const voucher = vouchers.find((v) => v._id === selectedVoucher);
        const selectedVarObjects = modalProduct.variants.filter((v) =>
          selectedVariants.includes(v._id)
        );

        const originalTotal = selectedVarObjects.reduce(
          (sum, v) => sum + (Number(v.price) || 0),
          0
        );

        const discountedTotal = selectedVarObjects.reduce((sum, v) => {
          const price = Number(v.price) || 0;
          let discount = 0;

          if (voucher.discount_type === "percentage") {
            discount = (voucher.discount_value / 100) * price;
          } else if (voucher.discount_type === "fixed") {
            discount = voucher.discount_value;
          }

          if (voucher.max_discount && discount > voucher.max_discount) {
            discount = voucher.max_discount;
          }

          return sum + Math.max(price - discount, 0);
        }, 0);

        return (
          <div
            className="voucher-summary"
            style={{
              background: "#f0f8f5",
              border: "1px solid #b2d8b2",
              borderRadius: "8px",
              padding: "12px",
              marginTop: "10px",
            }}
          >
            <h4>💰 Summary for Selected Variants</h4>
            <p>Original Total: <b>₱{originalTotal.toLocaleString()}</b></p>
            <p>After Discount: <b>₱{discountedTotal.toLocaleString()}</b></p>
          </div>
        );
      })()}

      {/* 🧩 Action Buttons */}
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

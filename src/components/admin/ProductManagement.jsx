// ============================================================
// ✅ src/components/admin/ProductManagement.jsx (Full Corrected)
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "./ProductManagement.css";

console.log(process.env.NEXT_PUBLIC_API_URL);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const ProductManagement = () => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [productVouchers, setProductVouchers] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [openPromos, setOpenPromos] = useState({});
    // ✅ Toggle visibility for promo details per product
    const togglePromo = (productId) => {
      setOpenPromos((prev) => ({
        ...prev,
        [productId]: !prev[productId],
      }));
    };
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    subcategory: "",
    seriesTitle: "",
    volumeNumber: "",
    publisher: "",
    slug: "",
    author: "",
    authorBio: "",
    publicationDate: "",
    age: "",
    variants: [],
    status: "Active",
    isPromotion: false,
    isNewArrival: false,
    isPopular: false,
  });

  // ✅ Simplified useEffect
  useEffect(() => {
    if (user?.token) {
      fetchProducts();
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ Fetch vouchers linked to each product (moved outside useEffect)
// ✅ Fetch vouchers linked to each product (moved outside useEffect)
const fetchVouchersForProducts = async (productList) => {
  try {
    const map = {};
    const res = await fetchWithAuth(`${API_URL}/api/vouchers`, {}, user.token);
    const allVouchers = await res.json();

    // normalize product ids as strings for easier comparison
    for (const p of productList) {
      const pIdStr = String(p._id);

      const linked = (allVouchers || []).filter((v) => {
        // product-level matches (array elements could be ObjectId, string or populated doc)
        const productMatch =
          (v.applicable_products || []).some(
            (ap) => String(ap?._id ?? ap) === pIdStr
          );

        // variant-level matches (each applicable_variants item has { product, variant_id })
        const variantMatch =
          (v.applicable_variants || []).some(
            (av) => String(av?.product?._id ?? av?.product) === pIdStr
          );

        return productMatch || variantMatch;
      });

      map[p._id] = linked;
    }

    setProductVouchers(map);
  } catch (err) {
    console.error("❌ Error fetching vouchers for products:", err);
  }
};


  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products`,
        {},
        user.token
      );
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      if (Array.isArray(data)) fetchVouchersForProducts(data);
    } catch (err) {
      console.error("❌ Fetch products failed:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("❌ Fetch categories failed:", err);
    }
  };

  const handleRemoveNew = async (id) => {
    if (!window.confirm("Remove this product from New Arrivals?")) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products/${id}/remove-new`,
        { method: "PATCH" },
        user.token
      );
      if (!res.ok) throw new Error("Failed to remove from new arrivals");
      alert("✅ Product removed from New Arrivals");
      fetchProducts();
    } catch (err) {
      console.error("❌ Remove new failed:", err);
      alert("Failed to update product.");
    }
  };

const handleRemoveVoucher = async (productId, variantId = null) => {
  try {
    const res = await fetchWithAuth(
      `${API_URL}/api/admin/products/${productId}/remove-voucher`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variantId ? { variantId } : {}),
      },
      user.token
    );

    if (!res.ok) throw new Error("Failed to remove voucher links");

    // ✅ Refresh and close the promo section if all vouchers are gone
    await fetchProducts();
    setOpenPromos((prev) => ({ ...prev, [productId]: false }));
  } catch (err) {
    console.error("❌ Remove voucher failed:", err);
    alert("Failed to unlink voucher.");
  }
};



  const generateSlug = (name, volumeNumber) => {
    const base = name
      ?.toLowerCase()
      ?.trim()
      ?.replace(/[^\w\s-]/g, "")
      ?.replace(/\s+/g, "-")
      ?.replace(/--+/g, "-");
    return volumeNumber ? `${base}-vol-${volumeNumber}` : base;
  };

const handleInputChange = async (e) => {
  const { name, value, type, checked } = e.target;

  // ✅ Handle promo uncheck: remove all linked vouchers
  if (name === "isPromotion" && !checked && isEditing && currentProduct?._id) {
    if (window.confirm("Remove this product from promotion and unlink all vouchers?")) {
      try {
        await fetchWithAuth(
          `${API_URL}/api/admin/products/${currentProduct._id}/unset-promo`,
          { method: "PATCH" },
          user.token
        );
        alert("✅ Product promotion unset and vouchers unlinked");
        fetchProducts();
      } catch (err) {
        console.error("❌ Failed to unset promo:", err);
        alert("Failed to remove promo.");
      }
    }
  }

  // Normal update
  setFormData((prev) => {
    const next = {
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "name" || name === "volumeNumber") {
      next.slug = generateSlug(next.name, next.volumeNumber);
    }

    if (name === "category") {
      next.subcategory = "";
    }

    return next;
  });
};


  const selectedCategory = categories.find(
    (cat) => cat.slug === formData.category
  );
  const subcategories = selectedCategory?.subcategories || [];

  const addVariant = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          format: "Paperback",
          price: "",
          countInStock: "",
          isbn: "",
          trimSize: "",
          pages: "",
          mainImage: null,
          mainPreview: null,
          albumImages: [],
        },
      ],
    }));
  }, []);

  const removeVariant = useCallback((index) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated.splice(index, 1);
      return { ...prev, variants: updated };
    });
  }, []);

  const updateVariant = useCallback((index, field, value) => {
    setFormData((prev) => {
      const updated = prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      );
      return { ...prev, variants: updated };
    });
  }, []);

  const handleVariantMainImage = useCallback((index, file) => {
    if (!file || !(file instanceof File)) return;
    setFormData((prev) => {
      const updated = prev.variants.map((variant, i) =>
        i === index
          ? { ...variant, mainImage: file, mainPreview: URL.createObjectURL(file) }
          : variant
      );
      return { ...prev, variants: updated };
    });
  }, []);

const handleVariantAlbumImages = useCallback((index, files) => {
  if (!files || files.length === 0) return;

  setFormData((prev) => {
    const updated = [...prev.variants];
    const existing = updated[index].albumImages || [];

    const newImages = Array.from(files)
      .filter(
        (file) =>
          !existing.some(
            (img) => img.file?.name === file.name && img.file?.size === file.size
          )
      )
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    updated[index].albumImages = [...existing, ...newImages];
    return { ...prev, variants: updated };
  });
}, []);


  const removeAlbumImage = (variantIndex, imageIndex) => {
    setFormData((prev) => {
      const updated = [...prev.variants];
      updated[variantIndex].albumImages.splice(imageIndex, 1);
      return { ...prev, variants: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API_URL}/api/admin/products/${currentProduct._id}`
        : `${API_URL}/api/admin/products`;
      const method = isEditing ? "PUT" : "POST";
      const data = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key !== "variants") {
          const val = formData[key];
          data.append(key, val === undefined || val === null ? "" : val);
        }
      });

      formData.variants.forEach((v, idx) => {
        if (v.mainImage instanceof File) {
          data.append(`variantMainImages_${idx}`, v.mainImage);
        }
        v.albumImages.forEach((imgObj) => {
          if (imgObj.file instanceof File) {
            data.append(`variantAlbumImages_${idx}`, imgObj.file);
          }
        });
      });

      const serializedVariants = formData.variants.map((v) => ({
        format: v.format,
        price: v.price,
        countInStock: v.countInStock,
        isbn: v.isbn,
        trimSize: v.trimSize,
        pages: v.pages,
        mainImage:
          v.mainImage instanceof File
            ? null
            : v.mainPreview || v.mainImage || "",
        albumImages: v.albumImages.map((img) => img.preview || ""),
      }));

      data.append("variants", JSON.stringify(serializedVariants));

      const res = await fetchWithAuth(url, { method, body: data }, user.token);
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Failed to save product ${res.status} ${errText}`);
      }

const savedProduct = await res.json();

setProducts((prev) => {
  if (isEditing) {
    return prev.map((p) => (p._id === savedProduct._id ? savedProduct : p));
  } else {
    return [savedProduct, ...prev];
  }
});

resetForm();
alert(isEditing ? "✅ Product updated!" : "✅ Product created!");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Error saving product. Check console for details.");
    }
  };

  const handleEdit = (p) => {
    setCurrentProduct(p);
    setFormData({
      name: p.name,
      description: p.description,
      category: p.category,
      subcategory: p.subcategory,
      seriesTitle: p.seriesTitle || "",
      volumeNumber: p.volumeNumber || "",
      publisher: p.publisher || "",
      slug: p.slug || "",
      author: p.author || "",
      authorBio: p.authorBio || "",
      publicationDate: p.publicationDate?.split("T")[0] || "",
      age: p.age || "",
      variants:
        p.variants?.map((v) => ({
          format: v.format,
          price: v.price,
          countInStock: v.countInStock,
          isbn: v.isbn,
          trimSize: v.trimSize,
          pages: v.pages,
          mainImage: null,
          mainPreview: v.mainImage || null,
          albumImages: v.albumImages?.map((url) => ({ preview: url })) || [],
        })) || [],
      status: p.status || "Active",
      isPromotion: !!p.isPromotion,
      isNewArrival: !!p.isNewArrival,
      isPopular: !!p.isPopular,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products/${id}`,
        { method: "DELETE" },
        user.token
      );
      if (!res.ok) throw new Error("Failed to delete");
      fetchProducts();
      alert("🗑️ Product deleted successfully!");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete product.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      subcategory: "",
      seriesTitle: "",
      volumeNumber: "",
      publisher: "",
      slug: "",
      author: "",
      authorBio: "",
      publicationDate: "",
      age: "",
      variants: [],
      status: "Active",
      isPromotion: false,
      isNewArrival: false,
      isPopular: false,
    });
    setIsEditing(false);
    setCurrentProduct(null);
  };

 // ✅ Filter logic (⬇️ paste right before return)
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.publisher?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !filterCategory || p.category === filterCategory;
    const matchesSubcategory =
      !filterSubcategory || p.subcategory === filterSubcategory;
    const matchesType =
      filterType === "all" ||
      (filterType === "promo" && p.isPromotion) ||
      (filterType === "new" && p.isNewArrival) ||
      (filterType === "popular" && p.isPopular);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubcategory &&
      matchesType
    );
  });

  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <div className="admin-container">
      <div className="product-form-container">
        <h2>{isEditing ? "Edit Product" : "Add New Product"}</h2>
        <form onSubmit={handleSubmit} className="product-form">
          {/* Core Text Fields */}
          {[
            { name: "name", label: "Product Name", type: "text", required: true },
            { name: "slug", label: "Slug (auto)", type: "text" },
            { name: "seriesTitle", label: "Series Title", type: "text" },
            { name: "volumeNumber", label: "Volume Number", type: "number" },
            { name: "publisher", label: "Publisher", type: "text" },
            { name: "author", label: "Author", type: "text" },
            { name: "publicationDate", label: "Publication Date", type: "date" },
            { name: "age", label: "Age Range", type: "text" },
          ].map((field) => (
            <div className="form-group floating-label" key={field.name}>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                required={field.required}
                onChange={handleInputChange}
              />
              <label className={formData[field.name] ? "filled" : ""}>
                {field.label}
              </label>
            </div>
          ))}

          {/* ✅ Category Dropdown */}
          <div className="form-group">
            <label>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ Subcategory Dropdown */}
          <div className="form-group">
            <label>Subcategory</label>
            <select
              name="subcategory"
              value={formData.subcategory}
              onChange={handleInputChange}
              disabled={!formData.category}
            >
              <option value="">
                {formData.category
                  ? "Select Subcategory"
                  : "Select a Category First"}
              </option>

              {formData.category &&
                selectedCategory &&
                selectedCategory.subcategories?.map((sub) => (
                  <option key={sub.slug} value={sub.slug}>
                    {sub.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>
            {(() => {
              const totalStock = formData.variants.reduce(
                (sum, v) => sum + (parseInt(v.countInStock) || 0),
                0
              );
              const hasStock = totalStock > 0;
              const statusOptions = hasStock
                ? ["Active", "Inactive"]
                : ["Inactive", "Out of Stock"];
              if (!statusOptions.includes(formData.status)) {
                setFormData((prev) => ({ ...prev, status: statusOptions[0] }));
              }
              return (
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>

          {/* Featured Flags */}
          <div className="form-group">
            <label>Featured Sections</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isPromotion"
                  checked={formData.isPromotion}
                  onChange={handleInputChange}
                />{" "}
                Promotion
              </label>
              <label>
                <input
                  type="checkbox"
                  name="isNewArrival"
                  checked={formData.isNewArrival}
                  onChange={handleInputChange}
                />{" "}
                New Arrival
              </label>
              <label>
                <input
                  type="checkbox"
                  name="isPopular"
                  checked={formData.isPopular}
                  onChange={handleInputChange}
                />{" "}
                Popular
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Variants */}
          <div className="form-group full-width">
            <label>Product Variants</label>
            <div className="variants-section">
              {formData.variants.map((v, idx) => (
                <div key={idx} className="variant-row">
                  <select
                    value={v.format}
                    onChange={(e) =>
                      updateVariant(idx, "format", e.target.value)
                    }
                  >
                    <option value="Paperback">Paperback</option>
                    <option value="Hardcover">Hardcover</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) => updateVariant(idx, "price", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.countInStock}
                    onChange={(e) =>
                      updateVariant(idx, "countInStock", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="ISBN"
                    value={v.isbn}
                    onChange={(e) => updateVariant(idx, "isbn", e.target.value)}
                  />
                  <label>Main Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleVariantMainImage(idx, e.target.files[0])
                    }
                  />
                  {v.mainPreview && (
                    <img
                      src={v.mainPreview}
                      alt="Main Preview"
                      style={{
                        width: "200px",
                        borderRadius: "8px",
                        marginTop: "8px",
                      }}
                    />
                  )}
                  <label>Album Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      handleVariantAlbumImages(idx, e.target.files)
                    }
                  />
                  <div className="album-preview">
                    {v.albumImages.map((img, i) => (
                      <div key={i} className="album-item">
                        <img
                          src={img.preview}
                          alt="Album"
                          className="album-thumb"
                        />
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeAlbumImage(idx, i)}
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-delete"
                    onClick={() => removeVariant(idx)}
                  >
                    Remove Variant
                  </button>
                </div>
              ))}
              <button type="button" className="btn-submit" onClick={addVariant}>
                + Add Variant
              </button>
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" className="btn-submit">
              {isEditing ? "Update Product" : "Add Product"}
            </button>
            {isEditing && (
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Product List */}
{/* ==========================
    📋 Product List + Filters
========================== */}
<div className="products-list-container">
  <h2>Product List</h2>

  {/* 🔍 Search & Filters */}
  <div className="filter-bar">
    <input
      type="text"
      placeholder="Search by name, author, or publisher..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="filter-search"
    />

    {/* Category Filter */}
    <select
      value={filterCategory}
      onChange={(e) => {
        setFilterCategory(e.target.value);
        setFilterSubcategory("");
      }}
    >
      <option value="">All Categories</option>
      {categories.map((cat) => (
        <option key={cat.slug} value={cat.slug}>
          {cat.name}
        </option>
      ))}
    </select>

    {/* Subcategory Filter */}
    <select
      value={filterSubcategory}
      onChange={(e) => setFilterSubcategory(e.target.value)}
      disabled={!filterCategory}
    >
      <option value="">
        {filterCategory ? "All Subcategories" : "Select Category First"}
      </option>
      {filterCategory &&
        categories
          .find((cat) => cat.slug === filterCategory)
          ?.subcategories?.map((sub) => (
            <option key={sub.slug} value={sub.slug}>
              {sub.name}
            </option>
          ))}
    </select>

    {/* Featured Type Filter */}
    <select
      value={filterType}
      onChange={(e) => setFilterType(e.target.value)}
    >
      <option value="all">All Products</option>
      <option value="promo">Promotions</option>
      <option value="new">New Arrivals</option>
      <option value="popular">Popular</option>
    </select>

    {/* Reset Button */}
    <button
      className="btn-reset"
      onClick={() => {
        setSearchQuery("");
        setFilterCategory("");
        setFilterSubcategory("");
        setFilterType("all");
      }}
    >
      Reset
    </button>
  </div>

  {/* ==========================
      🧾 Product Table
  ========================== */}
  {filteredProducts.length === 0 ? (
    <div className="no-products">No matching products found.</div>
  ) : (
    <table className="products-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Category</th>
          <th>Variants</th>
          <th>Stock</th>
          <th>Status</th>
          <th>Featured</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredProducts.map((p) => (
          <React.Fragment key={p._id}>
            <tr>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>
                {p.variants?.map((v) => `${v.format}: ₱${v.price}`).join(" | ")}
              </td>
              <td>
                {p.variants?.reduce(
                  (sum, v) => sum + (v.countInStock || 0),
                  0
                )}
              </td>
              <td>{p.status}</td>
              <td>
                <div className="featured-labels">
                  {p.isPromotion && (
                    <div className="featured-wrapper">
                      <div className="featured-label promo">Promo</div>
                      <button
                        className="hover-action-btn"
                        onClick={() => togglePromo(p._id)}
                      >
                        {openPromos[p._id] ? "Close Promo" : "Remove Promo"}
                      </button>
                    </div>
                  )}
                  {p.isNewArrival && (
                    <div className="featured-wrapper">
                      <div className="featured-label new">New</div>
                      <button
                        className="hover-action-btn"
                        onClick={() => handleRemoveNew(p._id)}
                      >
                        Remove New
                      </button>
                    </div>
                  )}
                  {p.isPopular && (
                    <div className="featured-wrapper">
                      <div className="featured-label popular">Popular</div>
                    </div>
                  )}
                </div>
              </td>

              <td className="actions">
                <button className="btn-edit" onClick={() => handleEdit(p)}>
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(p._id)}
                >
                  Delete
                </button>
              </td>
            </tr>

            {/* 🧾 Voucher Row */}
            {openPromos[p._id] &&
              productVouchers[p._id] &&
              productVouchers[p._id].length > 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: 0, border: "none" }}>
                    <div className="voucher-list">
                      <strong>Linked Vouchers:</strong>
                      <ul
                        style={{ listStyle: "none", padding: 0, margin: 0 }}
                      >
                        {productVouchers[p._id].map((v) => (
                          <li key={v._id} style={{ marginBottom: "1rem" }}>
                            🎟️ <b>{v.name}</b> —{" "}
                            {v.discount_type === "percentage"
                              ? `${v.discount_value}%`
                              : `₱${v.discount_value}`}{" "}
                            ({v.start_date?.slice(0, 10)} →{" "}
                            {v.end_date?.slice(0, 10)})

                            {/* ✅ VARIANT LEVEL */}
                            {(v.applicable_variants || []).length > 0 && (
                              <div
                                style={{
                                  marginLeft: "1.5rem",
                                  marginTop: "0.4rem",
                                  border: "1px solid #ccc",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  background: "#fdfdfd",
                                }}
                              >
                                <ul
                                  style={{
                                    listStyle: "none",
                                    padding: 0,
                                    margin: 0,
                                  }}
                                >
                                  {(v.applicable_variants || [])
                                    .filter((av) => {
                                      const pid = String(
                                        av?.product?._id ?? av?.product
                                      );
                                      return pid === String(p._id);
                                    })
                                    .map((av) => {
                                      const variant = (p.variants || []).find(
                                        (vv) =>
                                          String(vv._id) ===
                                          String(av.variant_id)
                                      );
                                      return (
                                        <li
                                          key={String(av.variant_id)}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            marginBottom: "6px",
                                            padding: "6px 8px",
                                            background: "#eef5ff",
                                            borderRadius: "5px",
                                            border: "1px solid #bbb",
                                          }}
                                        >
                                          <span>
                                            ↳ Variant:{" "}
                                            <b>
                                              {variant?.format ||
                                                `Variant ${String(
                                                  av.variant_id
                                                ).slice(0, 6)}`}
                                            </b>{" "}
                                            — Stock:{" "}
                                            {variant?.countInStock ?? "N/A"}
                                          </span>
                                          <button
                                            className="hover-action-btn"
                                            onClick={() =>
                                              handleRemoveVoucher(
                                                p._id,
                                                av.variant_id
                                              )
                                            }
                                          >
                                            Remove Variant
                                          </button>
                                        </li>
                                      );
                                    })}
                                </ul>
                              </div>
                            )}

                            {/* ✅ Product-level link */}
                            {(!v.applicable_variants ||
                              v.applicable_variants.length === 0) && (
                              <div style={{ marginTop: "8px" }}>
                                <button
                                  className="hover-action-btn"
                                  style={{
                                    background: "#e74c3c",
                                    color: "#fff",
                                    borderRadius: "5px",
                                    padding: "5px 12px",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => handleRemoveVoucher(p._id)}
                                >
                                  Remove Voucher (All Variants)
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  )}
</div>

    </div>
  );
};

export default ProductManagement;

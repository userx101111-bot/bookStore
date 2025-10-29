// ============================================================
// ✅ src/components/admin/ProductManagement.jsx (Full Corrected)
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "../../contexts/UserContext";
import { fetchWithAuth } from "../../utils/fetchWithAuth";
import "../AdminDashboard.css";

console.log(process.env.NEXT_PUBLIC_API_URL);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const ProductManagement = () => {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productVouchers, setProductVouchers] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);

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
  const fetchVouchersForProducts = async (productList) => {
    try {
      const map = {};
      const res = await fetch(`${API_URL}/api/vouchers`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const allVouchers = await res.json();

      for (const p of productList) {
        const linked = allVouchers.filter(
          (v) =>
            v.applicable_products?.some(
              (ap) => ap === p._id || ap._id === p._id
            ) ||
            v.applicable_variants?.some(
              (av) => av.product === p._id || av.product?._id === p._id
            )
        );
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

  const handleRemoveVoucher = async (id) => {
    if (!window.confirm("Remove all vouchers linked to this product?")) return;

    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/admin/products/${id}/remove-voucher`,
        { method: "PATCH" },
        user.token
      );

      if (!res.ok) throw new Error("Failed to remove voucher links");

      alert("✅ All vouchers removed from this product");
      fetchProducts(); // Refresh table to show updated promo status
    } catch (err) {
      console.error("❌ Remove voucher failed:", err);
      alert("Failed to unlink product from vouchers.");
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "name" || name === "volumeNumber") {
        next.slug = generateSlug(next.name, next.volumeNumber);
      }

      // ✅ Reset subcategory when category changes
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
      const newImages = Array.from(files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      updated[index].albumImages = [
        ...(updated[index].albumImages || []),
        ...newImages,
      ];
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

      await fetchProducts();
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
      <div className="products-list-container">
        <h2>Product List</h2>
        {products.length === 0 ? (
          <div className="no-products">No products found.</div>
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
              {products.map((p) => (
                <React.Fragment key={p._id}>
                  <tr>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      {p.variants
                        ?.map((v) => `${v.format}: ₱${v.price}`)
                        .join(" | ")}
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
                              onClick={() => handleRemoveVoucher(p._id)}
                            >
                              Remove Voucher
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
                            <div className="featured-label popular">
                              Popular
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(p)}
                      >
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

                  {/* 🧾 Voucher Viewer Row */}
                  {productVouchers[p._id] &&
                    productVouchers[p._id].length > 0 && (
                      <tr className="voucher-row">
                        <td colSpan="7">
                          <div className="voucher-list">
                            <strong>Linked Vouchers:</strong>
                            <ul>
                              {productVouchers[p._id].map((v) => (
                                <li key={v._id}>
                                  🎟️ <b>{v.name}</b> —{" "}
                                  {v.discount_type === "percentage"
                                    ? `${v.discount_value}%`
                                    : `₱${v.discount_value}`}{" "}
                                  ({v.start_date?.slice(0, 10)} →{" "}
                                  {v.end_date?.slice(0, 10)})
                                  {v.applicable_variants?.some(
                                    (av) =>
                                      av.product === p._id ||
                                      av.product?._id === p._id
                                  ) && (
                                    <ul
                                      style={{
                                        marginLeft: "1rem",
                                        color: "#555",
                                      }}
                                    >
                                      {v.applicable_variants
                                        .filter(
                                          (av) =>
                                            av.product === p._id ||
                                            av.product?._id === p._id
                                        )
                                        .map((av) => {
                                          const variant = p.variants.find(
                                            (vv) =>
                                              vv._id === av.variant_id
                                          );
                                          return (
                                            <li key={av.variant_id}>
                                              ↳ Variant:{" "}
                                              {variant?.format || "Unknown"}
                                            </li>
                                          );
                                        })}
                                    </ul>
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

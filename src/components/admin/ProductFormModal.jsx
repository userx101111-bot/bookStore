import React from "react";
import "./ProductFormModal.css";

const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isEditing,
  formData,
  categories,
  handleInputChange,
  addVariant,
  removeVariant,
  updateVariant,
  handleVariantMainImage,
  handleVariantAlbumImages,
  removeAlbumImage,
}) => {
  if (!isOpen) return null;

  const selectedCategory = categories.find(
    (cat) => cat.slug === formData.category
  );
  const subcategories = selectedCategory?.subcategories || [];

  return (
    <div className="modal-overlay">
      <div className="modal-content fullscreen">
        <div className="modal-header">
          <h2>{isEditing ? "Edit Product" : "Add New Product"}</h2>
          <button className="modal-close" onClick={onClose}>
            ✖
          </button>
        </div>

        <form onSubmit={onSubmit} className="product-form">
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

          <div className="form-group full-width">
            <label>Author Bio</label>
            <textarea
              name="authorBio"
              value={formData.authorBio}
              onChange={handleInputChange}
              placeholder="Write a short biography of the author..."
            />
          </div>

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

              {subcategories.map((sub) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Featured Sections</label>
            <div className="checkbox-group">
              {["isPromotion", "isNewArrival", "isPopular"].map((flag) => (
                <label key={flag}>
                  <input
                    type="checkbox"
                    name={flag}
                    checked={formData[flag]}
                    onChange={handleInputChange}
                  />{" "}
                  {flag === "isPromotion"
                    ? "Promotion"
                    : flag === "isNewArrival"
                    ? "New Arrival"
                    : "Popular"}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
          </div>

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
                  <input
                    type="text"
                    placeholder="Trim Size"
                    value={v.trimSize}
                    onChange={(e) =>
                      updateVariant(idx, "trimSize", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="Pages"
                    value={v.pages}
                    onChange={(e) => updateVariant(idx, "pages", e.target.value)}
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
                      className="variant-image-preview"
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
                        <img src={img.preview} alt="Album" />
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
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;

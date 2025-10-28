// ============================================================
// ✅ ProductPage.jsx — Show Buy Now only if stock > 0
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProductPage.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const ProductPage = () => {
  const { slug, variant } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [albumImages, setAlbumImages] = useState([]);
  const [activeTab, setActiveTab] = useState("description");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const descriptionTabRef = useRef(null);

  // ============================================================
  // 🔹 Fetch product details (handles variant URL param)
  // ============================================================
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/products/${slug}`);
        const data = res.data;

        if (data.status === "Inactive") {
          setError("This product is currently unavailable.");
          setLoading(false);
          return;
        }

        setProduct(data);

        // ✅ Select variant from URL or fallback
        if (data.variants && data.variants.length > 0) {
          const matched =
            data.variants.find(
              (v) => v.format?.toLowerCase() === variant?.toLowerCase()
            ) || data.variants[0];

          setSelectedVariant(matched);

          const baseMain = matched.mainImage || "/assets/placeholder-image.png";
          const album = matched.albumImages?.length ? matched.albumImages : [];
          const uniqueAlbum = [
            baseMain,
            ...album.filter((img) => img !== baseMain),
          ];

          setMainImage(baseMain);
          setAlbumImages(uniqueAlbum);

          // ✅ If URL missing variant, redirect to first variant
          if (!variant) {
            navigate(`/product/${slug}/${matched.format.toLowerCase()}`, {
              replace: true,
            });
          }
        } else {
          const baseMain = data.image || "/assets/placeholder-image.png";
          const album = data.albumImages?.length ? data.albumImages : [];
          const uniqueAlbum = [
            baseMain,
            ...album.filter((img) => img !== baseMain),
          ];
          setMainImage(baseMain);
          setAlbumImages(uniqueAlbum);
        }
      } catch (err) {
        console.error("❌ Failed to load product:", err);
        setError("Product not found or server error.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, variant, navigate]);

  // ============================================================
  // 🔹 Handlers
  // ============================================================
  const handleVariantClick = (v) => {
    setSelectedVariant(v);
    const baseMain = v.mainImage || "/assets/placeholder-image.png";
    const album = v.albumImages?.length ? v.albumImages : [];
    const uniqueAlbum = [baseMain, ...album.filter((img) => img !== baseMain)];
    setMainImage(baseMain);
    setAlbumImages(uniqueAlbum);

    // ✅ Update URL dynamically without reload
    navigate(`/product/${slug}/${v.format?.toLowerCase()}`);
  };

  const handleAlbumClick = (img) => setMainImage(img);

  const handleReadMoreClick = () => {
    setShowFullDescription(true);
    setActiveTab("description");
    setTimeout(() => {
      descriptionTabRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 300);
  };

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "N/A";

  // ============================================================
  // 🔹 UI Logic
  // ============================================================
  if (loading) return <div className="loading">Loading product...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!product) return <div className="error">Product not found.</div>;

  const totalStock = product.variants?.reduce(
    (sum, v) => sum + (v.countInStock || 0),
    0
  );
  const computedStatus =
    totalStock === 0 ? "Out of Stock" : product.status || "Active";

  const variantOutOfStock = selectedVariant?.countInStock === 0;

  // ============================================================
  // 🔹 Render Component
  // ============================================================
  return (
    <div className="product-page">
      <div className="product-container">
        {/* 🖼 LEFT — Images */}
        <div className="product-left">
          <div className="product-images">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="main-image"
                onError={(e) =>
                  (e.target.src = "/assets/placeholder-image.png")
                }
              />
            ) : (
              <div className="no-image">No image available</div>
            )}

            {albumImages?.length > 0 && (
              <div className="album-thumbnails">
                {albumImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`album-${i}`}
                    className={mainImage === img ? "active" : ""}
                    onClick={() => handleAlbumClick(img)}
                    onError={(e) =>
                      (e.target.src = "/assets/placeholder-image.png")
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 📘 CENTER — Info + Buy Box */}
        <div className="product-center">
          <h1 className="product-title">{product.name}</h1>

          {product.seriesTitle && (
            <h3 className="subtitle">{product.seriesTitle}</h3>
          )}

          {product.volumeNumber && (
            <p className="volume-number">Volume: {product.volumeNumber}</p>
          )}

          <p className="author">By {product.author || "Unknown Author"}</p>
          <p className="age">Age: {product.age || "All Ages"}</p>

          <p
            className={`product-status ${
              computedStatus === "Active"
                ? "status-active"
                : computedStatus === "Inactive"
                ? "status-inactive"
                : "status-out"
            }`}
          >
            Status: {computedStatus}
          </p>

          {product.variants?.length > 0 && (
            <div className="variant-options">
              {product.variants.map((v) => (
                <button
                  key={v._id}
                  className={`variant-btn ${
                    selectedVariant?._id === v._id ? "active" : ""
                  }`}
                  onClick={() => handleVariantClick(v)}
                >
                  {v.format} — ₱{v.price?.toLocaleString() || "N/A"}
                </button>
              ))}
            </div>
          )}

          {selectedVariant && (
            <div className="variant-meta">
              <p className="price">
                ₱{selectedVariant.price?.toLocaleString() || "N/A"}
              </p>
              <p className="stock">
                In Stock:{" "}
                <strong>{selectedVariant.countInStock || 0} available</strong>
              </p>
            </div>
          )}

          <p className="pub-date">
            Publication Date: {formatDate(product.publicationDate)}
          </p>

          <div className="description-preview">
            <p>
              {showFullDescription
                ? product.description
                : `${product.description?.slice(0, 200)}...`}
            </p>
            {product.description?.length > 200 && (
              <button className="read-more" onClick={handleReadMoreClick}>
                Read More
              </button>
            )}
          </div>

          {/* 🛒 Buy Box */}
          <div className="buy-box inline">
            {/* ✅ Always show Add to Cart */}
            <button
              className="add-to-cart-btn"
              disabled={computedStatus === "Inactive"}
            >
              Add to Cart
            </button>

            {/* ✅ Only show Buy Now if variant has stock */}
            {!variantOutOfStock && computedStatus !== "Inactive" && (
              <button className="sign-in-button">Buy Now</button>
            )}
          </div>
        </div>
      </div>

      {/* === Tabs Section === */}
      <div className="product-tabs-wrapper" ref={descriptionTabRef}>
        <div className="product-tabs">
          <div className="tab-buttons">
            <button
              onClick={() => setActiveTab("description")}
              className={activeTab === "description" ? "active" : ""}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={activeTab === "details" ? "active" : ""}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("author")}
              className={activeTab === "author" ? "active" : ""}
            >
              Author Bio
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "description" && (
              <div>
                <p>{product.description}</p>
              </div>
            )}

            {activeTab === "details" && (
              <div className="details-grid">
                <p>
                  <strong>Format:</strong> {selectedVariant?.format || "N/A"}
                </p>
                <p>
                  <strong>ISBN:</strong> {selectedVariant?.isbn || "N/A"}
                </p>
                <p>
                  <strong>Pages:</strong> {selectedVariant?.pages || "N/A"}
                </p>
                <p>
                  <strong>Trim Size:</strong>{" "}
                  {selectedVariant?.trimSize || "N/A"}
                </p>
                <p>
                  <strong>Publisher:</strong> {product.publisher || "N/A"}
                </p>
                <p>
                  <strong>Publication Date:</strong>{" "}
                  {formatDate(product.publicationDate)}
                </p>
                {product.volumeNumber && (
                  <p>
                    <strong>Volume:</strong> {product.volumeNumber}
                  </p>
                )}
              </div>
            )}

            {activeTab === "author" && (
              <div>
                <p>{product.authorBio || "No author bio available."}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;

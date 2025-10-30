// ============================================================
// ✅ ProductPage.jsx — Show Buy Now only if stock > 0 + True NEW/PROMO badges + Variant Discount Display
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProductPage.css";
import "./homepage.css"; // ✅ reuse badge + discount styles

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
  const [vouchers, setVouchers] = useState([]);
  const descriptionTabRef = useRef(null);

  // ============================================================
  // 🔹 Fetch product
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
        if (data.variants?.length > 0) {
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
        console.error("❌ Error loading product:", err);
        setError("Product not found or server error.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug, variant, navigate]);

  // ============================================================
  // 🔹 Fetch vouchers
  // ============================================================
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/vouchers`);
        const active = Array.isArray(res.data)
          ? res.data.filter((v) => v.is_active)
          : [];
        setVouchers(active);
      } catch (err) {
        console.error("❌ Error fetching vouchers:", err);
      }
    };
    fetchVouchers();
  }, []);

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

    navigate(`/product/${slug}/${v.format?.toLowerCase()}`);
  };

  const handleAlbumClick = (img) => setMainImage(img);






  // ============================================================
// 🛒 Add to Cart + Inline Confirmation Drawer
// ============================================================
const [showMiniCart, setShowMiniCart] = useState(false);
const [miniCartData, setMiniCartData] = useState(null);
const [cartLoading, setCartLoading] = useState(false);

const handleAddToCart = async () => {
  if (!selectedVariant) return;

  try {
    setCartLoading(true);

    const cartItem = {
      productId: product._id,
      variantId: selectedVariant._id,
      quantity: 1,
    };

    // ✅ POST to backend cart route
    const res = await axios.post(`${API_URL}/api/cart/add`, cartItem, {
      withCredentials: true,
    });

    // ✅ Show confirmation popover
    setMiniCartData({
      name: product.name,
      format: selectedVariant.format,
      image: selectedVariant.mainImage || product.image,
      price: discountedPrice || selectedVariant.price,
      subtotal: res.data.cartTotal || (discountedPrice || selectedVariant.price),
    });

    setShowMiniCart(true);

    // Auto-hide after 3.5s
    setTimeout(() => setShowMiniCart(false), 3500);
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    alert("Failed to add to cart. Please sign in first or try again.");
  } finally {
    setCartLoading(false);
  }
};


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
  // 🎟️ PROMO logic
  // ============================================================
  const getVoucherForVariant = (variant) => {
    const cleanParentId = (product.parentId || product._id)?.split("-")[0];
    const cleanVariantId = variant?._id?.split("-").pop();

    return (
      vouchers.find((v) =>
        v.applicable_variants?.some((vv) => {
          const prodId = vv.product?._id || vv.product;
          const variantId = vv.variant_id;
          return prodId === cleanParentId && variantId === cleanVariantId;
        })
      ) ||
      vouchers.find((v) =>
        v.applicable_products?.some((p) => (p._id || p) === cleanParentId)
      )
    );
  };

  const linkedVoucher = getVoucherForVariant(selectedVariant);

  const originalPrice = selectedVariant?.price || 0;
  let discountedPrice = originalPrice;
  let badgeText = "";

  if (linkedVoucher) {
    const value = linkedVoucher.discount_value || 0;
    if (linkedVoucher.discount_type === "percentage") {
      discountedPrice = originalPrice - (originalPrice * value) / 100;
      badgeText = `-${value}% OFF`;
    } else if (linkedVoucher.discount_type === "fixed") {
      discountedPrice = Math.max(originalPrice - value, 0);
      badgeText = `₱${value.toFixed(0)} OFF`;
    }
  }

  // ============================================================
  // 🔹 Render Component
  // ============================================================
  return (
    <div className="product-page">
      <div className="product-container">
        {/* 🖼 LEFT — Images */}
        <div className="product-left">
          <div className="product-images" style={{ position: "relative" }}>
            {/* ✅ BADGES */}
            {product.isNewArrival && <span className="badge-new">NEW</span>}
            {linkedVoucher && <span className="badge-voucher">{badgeText}</span>}

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

          {/* 💰 Price */}
          {linkedVoucher ? (
            <p className="price discounted">
              <span className="original">₱{originalPrice.toFixed(2)}</span>{" "}
              <span className="discounted">
                ₱{discountedPrice.toFixed(2)}
              </span>
            </p>
          ) : (
            <p className="price">₱{originalPrice.toFixed(2)}</p>
          )}

          {linkedVoucher && (
            <p className="limited-offer">🔥 Limited-time offer!</p>
          )}

          {/* 🔘 Variant buttons with discount */}
          {product.variants?.length > 0 && (
            <div className="variant-options">
              {product.variants.map((v) => {
                const variantVoucher = getVoucherForVariant(v);
                let vOriginal = v.price || 0;
                let vDiscounted = vOriginal;

                if (variantVoucher) {
                  const val = variantVoucher.discount_value || 0;
                  if (variantVoucher.discount_type === "percentage")
                    vDiscounted = vOriginal - (vOriginal * val) / 100;
                  else if (variantVoucher.discount_type === "fixed")
                    vDiscounted = Math.max(vOriginal - val, 0);
                }

                return (
                  <button
                    key={v._id}
                    className={`variant-btn ${
                      selectedVariant?._id === v._id ? "active" : ""
                    }`}
                    onClick={() => handleVariantClick(v)}
                  >
                    {v.format} —{" "}
                    {variantVoucher ? (
                      <>
                        <span className="original">
                          ₱{vOriginal.toFixed(2)}
                        </span>{" "}
                        <span className="discounted">
                          ₱{vDiscounted.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <>₱{vOriginal.toFixed(2)}</>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedVariant && (
            <div className="variant-meta">
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
              <button
                className="add-to-cart-btn"
                disabled={computedStatus === "Inactive" || cartLoading}
                onClick={handleAddToCart}
              >
                {cartLoading ? "Adding..." : "Add to Cart"}
              </button>

            {!variantOutOfStock && computedStatus !== "Inactive" && (
              <button className="sign-in-button">Buy Now</button>
            )}
          </div>
        </div>
      </div>

      {/* === Tabs === */}
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
            {activeTab === "description" && <p>{product.description}</p>}
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
                  <strong>Trim Size:</strong> {selectedVariant?.trimSize || "N/A"}
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
              <p>{product.authorBio || "No author bio available."}</p>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 🛒 Mini Cart Confirmation Drawer */}
      {/* ============================================================ */}
      {showMiniCart && miniCartData && (
        <div className="mini-cart-drawer">
          <div className="mini-cart-content">
            <img
              src={miniCartData.image || "/assets/placeholder-image.png"}
              alt={miniCartData.name}
              className="mini-cart-thumb"
            />
            <div className="mini-cart-details">
              <p className="mini-cart-name">{miniCartData.name}</p>
              <p className="mini-cart-variant">{miniCartData.format}</p>
              <p className="mini-cart-price">
                ₱{miniCartData.price.toFixed(2)}
              </p>
              <p className="mini-cart-subtotal">
                Subtotal: ₱{miniCartData.subtotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mini-cart-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowMiniCart(false)}
            >
              Continue Shopping
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate("/cart")}
            >
              View Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
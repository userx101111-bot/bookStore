// ============================================================
// ✅ ProductPage.jsx — Fixed Variant Routing & Redirect Logic
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./ProductPage.css";
import ProductReviewsModal from "../components/ProductReviewsModal";
import ReviewWriteModal from "../components/ReviewWriteModal";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useWishlist } from "../contexts/WishlistContext";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const ProductPage = () => {
  const { slug, variant } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [showReviewsModal, setShowReviewsModal] = useState(false);
const [showWriteModal, setShowWriteModal] = useState(false);
const [reviewsSummary, setReviewsSummary] = useState({ avg: 0, count: 0 });
const [recentlyViewed, setRecentlyViewed] = useState([]);
const { handleAddToWishlist, handleRemoveFromWishlist, isInWishlist } = useWishlist();
const inWishlist = isInWishlist(product?._id, selectedVariant?._id);
const [relatedProducts, setRelatedProducts] = useState([]);




const scrollRef = useRef(null);
const scrollHorizontally = (direction) => {
  const el = scrollRef.current;
  if (!el) return;
  const scrollAmount = el.clientWidth * 0.6;
  el.scrollBy({
    left: direction === "left" ? -scrollAmount : scrollAmount,
    behavior: "smooth",
  });
};

  // ============================================================
  // 🔹 Fetch product (with correct variant sync)
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

      // ✅ fetch reviews summary here after product is set
      const revRes = await axios.get(`${API_URL}/api/reviews/product/${data._id}`);
      const list = revRes.data || [];
      const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
      setReviewsSummary({ avg, count: list.length });

      if (data.variants?.length > 0) {
        const matched =
          data.variants.find(
            (v) => v.format?.toLowerCase() === variant?.toLowerCase()
          ) || data.variants[0];
        setSelectedVariant(matched);
        const baseMain = matched.mainImage || "/assets/placeholder-image.png";
        const album = matched.albumImages?.length ? matched.albumImages : [];
        const uniqueAlbum = [baseMain, ...album.filter((img) => img !== baseMain)];
        setMainImage(baseMain);
        setAlbumImages(uniqueAlbum);
        if (!variant && matched?.format) {
          navigate(`/product/${slug}/${matched.format.toLowerCase()}`, { replace: true });
        }
      } else {
        const baseMain = data.image || "/assets/placeholder-image.png";
        const album = data.albumImages?.length ? data.albumImages : [];
        const uniqueAlbum = [baseMain, ...album.filter((img) => img !== baseMain)];
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
}, [slug, variant]);


// ============================================================
// 🎯 Fetch "You May Also Like" Products (same category)
// ============================================================
useEffect(() => {
  const fetchRelated = async () => {
    if (!product?.category) return;

    try {
      const res = await axios.get(`${API_URL}/api/products`);
      const all = res.data || [];
      // Filter by same category, exclude current product
      const related = all
        .filter(
          (p) =>
            p.category === product.category &&
            p._id !== product._id
        )
        .slice(0, 10); // show up to 10
      setRelatedProducts(related);
    } catch (err) {
      console.error("❌ Error fetching related products:", err);
    }
  };

  fetchRelated();
}, [product]);


// 🍔 Record this product as recently viewed
useEffect(() => {
  const recordView = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.token || !product?._id) return;

    const targetId = product.parentId || product._id;

    try {
      await axios.post(
        `${API_URL}/api/recently-viewed/${targetId}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    } catch (err) {
      console.warn("⚠️ Failed to record recently viewed:", err.message);
    }
  };

  if (product) recordView();
}, [product]);

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

  // 🍔 Fetch Recently Viewed Products for Logged-In User
// 🍔 Fetch Recently Viewed Products (debounced)
// 🍔 Fetch Recently Viewed Products (normalized)
useEffect(() => {
  let mounted = true;

  const fetchRecentlyViewed = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.token) return;

    try {
      const res = await axios.get(`${API_URL}/api/recently-viewed`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const raw = res.data;

      // ✅ Normalize same as Homepage
      const normalized = raw
        .filter((p) => p && p._id)
        .map((p) => {
          const hasFlatVariant = typeof p.price === "number" && !!p.format;

          const variants = hasFlatVariant
            ? [
                {
                  _id: p._id,
                  format: p.format || "Standard",
                  price: Number(p.price) || 0,
                  countInStock: p.countInStock || 0,
                  mainImage:
                    p.mainImage || "/assets/placeholder-image.png",
                },
              ]
            : Array.isArray(p.variants)
            ? p.variants.map((v) => ({
                _id: v._id,
                format: v.format || "Standard",
                price: Number(v.price) || 0,
                countInStock: v.countInStock || 0,
                mainImage:
                  v.mainImage ||
                  p.mainImage ||
                  "/assets/placeholder-image.png",
              }))
            : [];

          return {
            _id: p._id,
            parentId: p.parentId || p._id,
            name: p.name,
            slug:
              p.slug ||
              p.name?.toLowerCase().replace(/\s+/g, "-") ||
              "",
            author: p.author || "",
            volumeNumber: p.volumeNumber,
            category: p.category || "Misc",
            mainImage: p.mainImage || "/assets/placeholder-image.png",
            isPromotion: !!p.isPromotion,
            isNewArrival: !!p.isNewArrival,
            isCurrentlyNew: !!p.isCurrentlyNew,
            variants,
          };
        });

      if (mounted) setRecentlyViewed(normalized);
    } catch (err) {
      console.error("❌ Error fetching recently viewed:", err);
    }
  };

  const timeout = setTimeout(fetchRecentlyViewed, 500);
  return () => {
    mounted = false;
    clearTimeout(timeout);
  };
}, [slug]);



    // ============================================================
  // 🧩 Listen for "openWriteReviewModal" events from the Reviews Modal
  // ============================================================
  useEffect(() => {
    const handleOpenWriteModal = (e) => {
      const { productId } = e.detail;
      setShowWriteModal(true);
    };
    window.addEventListener("openWriteReviewModal", handleOpenWriteModal);
    return () =>
      window.removeEventListener("openWriteReviewModal", handleOpenWriteModal);
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    try {
      setCartLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        // redirect user to login and remember where they came from
        alert("Please log in to add items to your cart.");
        navigate("/login", { state: { from: location.pathname } });
        return;
      }

      // Clean IDs (handle cases where variant or product id is composite like "parentId-variantId")
      const cleanVariantId = String(selectedVariant._id).includes("-")
        ? String(selectedVariant._id).split("-").pop()
        : String(selectedVariant._id);

      const cleanProductId = String(product._id).includes("-")
        ? String(product._id).split("-")[0]
        : String(product._id);

      const cartItem = {
        productId: cleanProductId,
        variantId: cleanVariantId,
        quantity: 1,
      };

      const res = await axios.post(`${API_URL}/api/cart/add`, cartItem, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Backend response format: { message: "Added to cart", cart }
      const cart = res.data?.cart || null;

      // Try to find the newly added item in the cart to show correct pricing/subtotal
      let addedItem = null;
      if (cart?.items && Array.isArray(cart.items)) {
        addedItem = cart.items.find(
          (i) =>
            String(i.product) === cleanProductId &&
            String(i.variant_id).endsWith(cleanVariantId)
        ) || cart.items[cart.items.length - 1];
      }

      const priceToShow =
        (addedItem && (addedItem.final_price ?? addedItem.price)) ||
        (typeof discountedPrice !== "undefined" && discountedPrice) ||
        selectedVariant.price;

      const subtotalToShow =
        (addedItem && (addedItem.subtotal ?? priceToShow)) ||
        priceToShow;

      setMiniCartData({
        name: product.name,
        format: selectedVariant.format,
        image: selectedVariant.mainImage || product.image || "/assets/placeholder-image.png",
        price: Number(priceToShow),
        subtotal: Number(subtotalToShow),
      });

      setShowMiniCart(true);
      setTimeout(() => setShowMiniCart(false), 3500);
    } catch (err) {
      console.error("❌ Error adding to cart:", err);
      // If token expired or unauthorized, force login
      if (err?.response?.status === 401) {
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert("Failed to add to cart. Please try again.");
    } finally {
      setCartLoading(false);
    }
  };

const handleReadMoreClick = () => {
  setActiveTab("description");
  setShowFullDescription(false);

  setTimeout(() => {
    const tabElement = descriptionTabRef.current;
    if (tabElement) {
      const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 80;
      const y = tabElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 400;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
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
// 🧠 Helper — Group products by parent & merge variants
// ============================================================
const groupProductsByParent = (products) => {
  const grouped = {};

  for (const p of products) {
    const key = p.parentId || p._id;

    if (!grouped[key]) {
      grouped[key] = {
        ...p,
        variants: [],
      };
    }

    const normalizedVariants = Array.isArray(p.variants)
      ? p.variants.map((v) => ({
          ...v,
          price: Number(v.price) || 0,
        }))
      : [
          {
            _id: p._id,
            format: p.format || "Standard",
            price: Number(p.price) || 0,
            countInStock: p.countInStock || 0,
            mainImage: p.mainImage || grouped[key].mainImage,
          },
        ];

    grouped[key].variants.push(...normalizedVariants);
  }

  return Object.values(grouped);
};

// ============================================================
// 🧱 VariantCard — identical to Homepage ProductCard
// ============================================================
const VariantCard = React.memo(({ product }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [fading, setFading] = useState(false);
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const variants = product.variants || [];
  const hasVariants = variants.length > 1;
  const currentVariant = variants[activeIndex];
  const currentImage =
    currentVariant?.mainImage ||
    product.mainImage ||
    "/assets/placeholder-image.png";

  // 🎟️ Find linked voucher
  const cleanParentId = (product.parentId || product._id)?.split("-")[0];
  const cleanVariantId = currentVariant?._id?.split("-").pop();

  const linkedVoucher =
    vouchers.find((v) =>
      v.applicable_variants?.some((vv) => {
        const prodId = vv.product?._id || vv.product;
        const variantId = vv.variant_id;
        return prodId === cleanParentId && variantId === cleanVariantId;
      })
    ) ||
    vouchers.find((v) =>
      v.applicable_products?.some((p) => (p._id || p) === cleanParentId)
    );

  // 🌀 Auto cycle variants (when not hovered)
  useEffect(() => {
    if (!hasVariants || hovered) return;
    intervalRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % variants.length);
        setFading(false);
      }, 200);
    }, 2000);
    return () => clearInterval(intervalRef.current);
  }, [variants, hovered, hasVariants]);

  const handleMouseEnter = () => setHovered(true);
  const handleMouseLeave = () => setHovered(false);
  const handleVariantHover = (idx) => {
    setActiveIndex(idx);
    setHovered(true);
  };

  const handleVariantClick = (v) =>
    navigate(`/product/${product.slug}/${v.format.toLowerCase()}`);

  const handleCardClick = () => {
    const v = currentVariant || variants[0];
    navigate(`/product/${product.slug}/${v.format?.toLowerCase() || "standard"}`);
  };

  // 💰 Discount logic
  const originalPrice = currentVariant?.price || 0;
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

  const isNewArrival = product.isNewArrival || product.isCurrentlyNew;

  return (
    <div
      className="product-card variant-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      aria-label={`Product card for ${product.name}`}
    >
      <div className="product-image-wrap">
        <img
          src={currentImage}
          alt={product.name}
          className={fading ? "fade" : ""}
          onError={(e) => (e.target.src = "/assets/placeholder-image.png")}
        />

<div className="badge-container">
  <div className="badge-left">
    {isNewArrival && (
      <span className="badge-new" title="New arrival">
        NEW
      </span>
    )}
  </div>

  <div className="badge-right">
    {linkedVoucher && (
      <span className="badge-voucher" title="Special offer applied!">
        {badgeText}
      </span>
    )}
  </div>
</div>

        {hasVariants && (
          <span className="variant-count">{variants.length} Variants</span>
        )}
      </div>

      <p className="product-name">
        {`${product.name}${
          product.volumeNumber ? ` Vol. ${product.volumeNumber}` : ""
        }`}
      </p>

      {linkedVoucher ? (
        <p className="price discounted">
          <span className="original">₱{originalPrice.toFixed(2)}</span>{" "}
          <span className="discounted">₱{discountedPrice.toFixed(2)}</span>
        </p>
      ) : (
        <p className="price">₱{originalPrice.toFixed(2)}</p>
      )}

      {variants.length > 0 && (
        <div
          className={`variant-buttons ${
            variants.length === 1 ? "single-variant" : ""
          }`}
        >
          {variants.map((v, idx) => (
            <button
              key={v._id}
              className={`variant-btn ${idx === activeIndex ? "active" : ""}`}
              onMouseEnter={() => handleVariantHover(idx)}
              onClick={(e) => {
                e.stopPropagation();
                handleVariantClick(v);
              }}
              disabled={variants.length === 1}
            >
              {v.format} — ₱{v.price?.toFixed(2) || "N/A"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});



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
{/* ✅ BADGES (use proper flex container to align left/right) */}
<div className="badge-container">
  <div className="badge-left">
    {product.isNewArrival && (
      <span className="badge-new" title="New arrival">
        NEW
      </span>
    )}
  </div>
  <div className="badge-right">
    {linkedVoucher && (
      <span className="badge-voucher" title="Discount applied">
        {badgeText}
      </span>
    )}
  </div>
</div>

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
          <h1 className="product-title">{product.name}
{/* ❤️ Wishlist Button */}
<div className="wishlist-icon-container">
  <button
    className={`wishlist-btn ${inWishlist ? "active" : ""}`}
    onClick={() =>
      inWishlist
        ? handleRemoveFromWishlist(product._id, selectedVariant?._id)
        : handleAddToWishlist(product._id, selectedVariant?._id)
    }
    title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
  >
    {inWishlist ? <FaHeart color="red" /> : <FaRegHeart />}
  </button>
</div>


          </h1>





{/* ⭐ Ratings Summary (always show See all reviews) */}
<div className="ratings-summary">
  {reviewsSummary.count > 0 ? (
    <>
      <span className="stars">
        {"★".repeat(Math.round(reviewsSummary.avg))}
        {"☆".repeat(5 - Math.round(reviewsSummary.avg))}
      </span>
      <span>
        {reviewsSummary.avg.toFixed(1)} / 5 • {reviewsSummary.count} ratings
      </span>
    </>
  ) : (
    <span>No reviews yet</span>
  )}

  <button className="see-all-btn" onClick={() => setShowReviewsModal(true)}>
    See all reviews
  </button>
</div>


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
  {`${product.description?.slice(0, 200)}...`}
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
              disabled={
                computedStatus === "Inactive" || variantOutOfStock || cartLoading
              }
              onClick={handleAddToCart}
            >
              {cartLoading ? "Adding..." : "Add to Cart"}
            </button>




            

            {!variantOutOfStock && computedStatus !== "Inactive" && (
<button
  className="sign-in-button"
  disabled={variantOutOfStock || computedStatus === "Inactive"}
  onClick={() => setShowConfirmModal(true)}
>
  Buy Now
</button>
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
      {/* ============================================================ */}
{/* 🧾 Confirmation Modal Before Checkout */}
{/* ============================================================ */}
{showConfirmModal && selectedVariant && (
  <div className="confirm-modal-overlay">
    <div className="confirm-modal">
      <h3>Confirm Purchase</h3>

      <div className="confirm-modal-body">
        <img
          src={selectedVariant.mainImage || product.image || "/assets/placeholder-image.png"}
          alt={product.name}
          className="confirm-product-image"
        />

        <div className="confirm-product-details">
          <h4>{product.name}</h4>
          <p>Format: <strong>{selectedVariant.format}</strong></p>
          <p>Price: ₱{discountedPrice.toFixed(2)}</p>

          <div className="quantity-control">
            <button
              onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span>{selectedQuantity}</span>
            <button
              onClick={() =>
                setSelectedQuantity((q) =>
                  Math.min(selectedVariant.countInStock || 99, q + 1)
                )
              }
            >
              +
            </button>
          </div>

          <p className="total-line">
            Total: <strong>₱{(discountedPrice * selectedQuantity).toFixed(2)}</strong>
          </p>
        </div>
      </div>

      <div className="confirm-modal-actions">
        <button
          className="btn-cancel"
          onClick={() => setShowConfirmModal(false)}
        >
          Cancel
        </button>

        <button
          className="btn-confirm"
          onClick={() => {
            setShowConfirmModal(false);
            navigate("/checkout", {
              state: {
                cartItems: [
                  {
                    id: selectedVariant._id,
                    productId: product._id,
                    name: product.name,
                    format: selectedVariant.format,
                    image:
                      selectedVariant.mainImage ||
                      product.image ||
                      "/assets/placeholder-image.png",
                    price: selectedVariant.price,
                    final_price: discountedPrice,
                    quantity: selectedQuantity,
                  },
                ],
              },
            });
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)}
{showReviewsModal && (
  <ProductReviewsModal
    productId={product._id}
    onClose={() => setShowReviewsModal(false)}
  />
)}

{showWriteModal && (
  <ReviewWriteModal
    productId={product._id}
    token={localStorage.getItem("token")}
    onClose={() => setShowWriteModal(false)}
    onSubmitSuccess={() => {
      setShowWriteModal(false);
      setShowReviewsModal(true);
    }}
  />
)}


<div className="product-bottom-sections">
  {recentlyViewed.length > 0 && (
    <div className={`product-section recently-viewed ${recentlyViewed.length ? "loaded" : ""}`}>
      <div className="section-header">
        <h2 className="section-heading">Recently Viewed</h2>
        <div className="scroll-controls">
          <button className="scroll-btn left" onClick={() => scrollHorizontally("left")}>←</button>
          <button className="scroll-btn right" onClick={() => scrollHorizontally("right")}>→</button>
        </div>
      </div>

      <div className="product-scroll modern" ref={scrollRef}>
        {groupProductsByParent(recentlyViewed).map((p) => (
          <VariantCard key={p._id} product={p} />
        ))}
      </div>
    </div>
  )}
</div>
{/* ============================================================ */}
{/* 💡 You May Also Like Section */}
{/* ============================================================ */}
{relatedProducts.length > 0 && (
  <div className="product-section you-may-also-like">
    <div className="section-header">
      <h2 className="section-heading">You May Also Like</h2>
      <div className="scroll-controls">
        <button
          className="scroll-btn left"
          onClick={() => scrollHorizontally("left")}
        >
          ←
        </button>
        <button
          className="scroll-btn right"
          onClick={() => scrollHorizontally("right")}
        >
          →
        </button>
      </div>
    </div>

    <div className="product-scroll modern" ref={scrollRef}>
      {groupProductsByParent(relatedProducts).map((p) => (
        <VariantCard key={p._id} product={p} />
      ))}
    </div>
  </div>
)}



    </div>
  );
};

export default ProductPage;

// ============================================================
// ✅ Homepage.jsx — Modern Scroll-Snap + Dynamic Category Colors + Voucher Discounts
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./homepage.css";

const normalizeSlug = (str) => str?.toLowerCase().replace(/\s+/g, "-").trim();

const Homepage = () => {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [productData, setProductData] = useState({});
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState({
    promotions: [],
    newArrivals: [],
    popular: [],
  });
  const [vouchers, setVouchers] = useState([]); // 🧩 all active vouchers

  const navigate = useNavigate();

  const API_URL =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bookstore-yl7q.onrender.com";

  // Fetch CMS banners
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch(`${API_URL}/api/cms/banners?active=true`);
        const data = await res.json();
        const active = data
          .filter((b) => b.isActive)
          .sort((a, b) => a.order - b.order);
        setBanners(active);
      } catch (err) {
        console.error("❌ Error fetching banners:", err);
      }
    };
    fetchBanners();
  }, [API_URL]);

  // Fetch categories (with color info)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("❌ Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, [API_URL]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const allProducts = await res.json();

        const grouped = allProducts.reduce((acc, product) => {
          const catSlug = normalizeSlug(product.category);
          if (!acc[catSlug]) acc[catSlug] = [];
          acc[catSlug].push(product);
          return acc;
        }, {});

        setProductData(grouped);
      } catch (err) {
        console.error("❌ Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [API_URL]);

  // Fetch featured products
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/featured`);
        if (!res.ok) throw new Error("Failed to fetch featured");
        const data = await res.json();
        setFeatured({
          promotions: data.promotions || [],
          newArrivals: data.newArrivals || [],
          popular: data.popular || [],
        });
      } catch (err) {
        console.error("❌ Error fetching featured:", err);
      }
    };
    fetchFeatured();
  }, [API_URL]);

  // Fetch all active vouchers once globally
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vouchers`);
        const data = await res.json();
        const active = Array.isArray(data)
          ? data.filter((v) => v.is_active)
          : [];
        setVouchers(active);
      } catch (err) {
        console.error("❌ Error fetching vouchers:", err);
      }
    };
    fetchVouchers();
  }, [API_URL]);

  // Disclaimer modal
  useEffect(() => {
    if (!localStorage.getItem("hasSeenDisclaimer")) setShowDisclaimer(true);
  }, []);

  const handleProceed = () => {
    localStorage.setItem("hasSeenDisclaimer", "true");
    setShowDisclaimer(false);
  };

  const user = JSON.parse(localStorage.getItem("user"));

  // Carousel auto-slide
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners]);

  // Group variants by parent product
  const groupProductsByParent = (products) => {
    const grouped = {};
    for (const p of products) {
      const key = p.parentId || p._id;
      if (!grouped[key]) grouped[key] = { ...p, variants: [] };
      grouped[key].variants.push({
        _id: p._id,
        format: p.format,
        price: p.price,
        mainImage: p.mainImage,
      });
    }
    return Object.values(grouped);
  };

  // 🎨 Dynamic Category Color Helper
  const getContrastColor = (bgColor) => {
    if (!bgColor) return "#111111";
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? "#111111" : "#ffffff";
  };

  const getCategoryColors = (slug) => {
    const found = categories.find(
      (cat) => normalizeSlug(cat.name) === normalizeSlug(slug)
    );
    const bg = found?.color || "#f4f4f4";
    const text = found?.textColor || getContrastColor(bg);
    return { bg, text };
  };

  // ============================================================
  // 🧱 Product Card (with Variants + Voucher + New Badge)
  // ============================================================
  const VariantCard = ({ product }) => {
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

// 🎟️ Find linked voucher (variant-specific or fallback to product-level)
const linkedVoucher =
  vouchers.find((v) =>
    v.applicable_variants?.some(
      (vv) =>
        vv.product?._id === (product.parentId || product._id) &&
        vv.variant_id === currentVariant?._id
    )
  ) ||
  vouchers.find((v) =>
    v.applicable_products?.some(
      (p) => p._id === (product.parentId || product._id)
    )
  );


    // 🌀 Cycle variants when not hovered
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
      navigate(
        `/product/${product.slug}/${v.format?.toLowerCase() || "standard"}`
      );
    };

    // ✅ Compute discounted price
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

{/* ✅ Unified badge container */}
<div className="badge-container">
  {isNewArrival && <span className="badge-new">NEW</span>}
  {linkedVoucher && (
    <span className="badge-voucher" title="Special offer applied!">
      {badgeText}
    </span>
  )}
</div>

          {/* Variant count */}
          {hasVariants && (
            <span className="variant-count">{variants.length} Variants</span>
          )}
        </div>

        <p className="product-name">{product.name}</p>

        {/* 🏷️ Price display */}
        {linkedVoucher ? (
          <p className="price discounted">
            <span className="original">₱{originalPrice.toFixed(2)}</span>{" "}
            <span className="discounted">₱{discountedPrice.toFixed(2)}</span>
          </p>
        ) : (
          <p className="price">₱{originalPrice.toFixed(2)}</p>
        )}

        {/* 🔘 Variant buttons */}
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
  };

  // ============================================================
  // 🧭 Product Section Component (Category-based)
  // ============================================================
  const ProductSection = ({ slug, products }) => {
    const { bg, text } = getCategoryColors(slug);
    const grouped = groupProductsByParent(products);
    const scrollRef = useRef(null);

    const handleArrowScroll = (direction) => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = el.clientWidth * 0.6;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    };

    return (
      <div
        className="product-section"
        style={{
          "--section-color": bg,
          "--section-text-color": text,
          backgroundColor: `color-mix(in srgb, ${bg} 20%, white)`,
          color: text,
        }}
      >
        <div className="section-header">
          <h2 className="section-heading">
            {slug.replace(/-/g, " ").toUpperCase()}
          </h2>
          {grouped.length > 1 && (
            <div className="scroll-controls">
              <button className="scroll-btn left" onClick={() => handleArrowScroll("left")}>
                ←
              </button>
              <button className="scroll-btn right" onClick={() => handleArrowScroll("right")}>
                →
              </button>
            </div>
          )}
        </div>

        <div className="product-scroll modern" ref={scrollRef}>
          {grouped.map((p) => (
            <VariantCard key={p._id} product={p} />
          ))}
        </div>

        <Link to={`/${slug}`} className="view-all">
          View All →
        </Link>
      </div>
    );
  };

  // ============================================================
  // ⭐ Featured Block Component
  // ============================================================
  const FeaturedBlock = ({ title, list, className }) => {
    const grouped = groupProductsByParent(list);
    const scrollRef = useRef(null);

    const handleArrowScroll = (direction) => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = el.clientWidth * 0.6;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    };

    return (
      <div className={`product-section ${className}`}>
        <div className="section-header">
          <h2 className="section-heading">{title}</h2>
          {grouped.length > 1 && (
            <div className="scroll-controls">
              <button className="scroll-btn left" onClick={() => handleArrowScroll("left")}>
                ←
              </button>
              <button className="scroll-btn right" onClick={() => handleArrowScroll("right")}>
                →
              </button>
            </div>
          )}
        </div>

        <div className="product-scroll modern" ref={scrollRef}>
          {grouped.map((p) => (
            <VariantCard key={p._id} product={p} />
          ))}
        </div>

        <Link
          to={`/${title.toLowerCase().replace(/\s+/g, "-")}`}
          className="view-all"
        >
          View All →
        </Link>
      </div>
    );
  };

  // ============================================================
  // 🏁 Render Page
  // ============================================================
  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <div className="app">
      <Navbar />

      {showDisclaimer && (
        <div className="disclaimer-overlay">
          <div className="disclaimer-box">
            <img src="/assets/logo.png" alt="Logo" className="disclaimer-logo" />
            <h6 className="disclaimer-header">Welcome!</h6>
            <p className="disclaimer-text">
              {user
                ? `Hello ${user.firstName} ${user.lastName}!`
                : "Welcome to our bookstore!"}
            </p>
            <button className="disclaimer-button" onClick={handleProceed}>
              Proceed
            </button>
          </div>
        </div>
      )}

      {/* Banner Carousel */}
      <div className="carousel-wrapper">
        {banners.length > 0 ? (
          banners.map((b, i) => (
            <div
              key={b._id}
              className={`carousel-slide ${i === current ? "active" : ""}`}
              style={{ backgroundColor: b.backgroundColor || "#fff" }}
            >
              <picture>
                {b.imageMobile && (
                  <source srcSet={b.imageMobile} media="(max-width:768px)" />
                )}
                <img
                  src={b.imageDesktop}
                  alt={b.title}
                  className="carousel-image"
                />
              </picture>
              <div className="carousel-content">
                <h2 className="carousel-title">{b.title}</h2>
                {b.subtitle && <p className="carousel-subtitle">{b.subtitle}</p>}
                {b.ctaText && (
                  <button
                    className="carousel-btn"
                    onClick={() => navigate(b.ctaLink || "/")}
                  >
                    {b.ctaText}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <img
            src="/assets/default-banner.png"
            alt="Default Banner"
            className="banner-image"
          />
        )}
      </div>

      {/* Featured Sections */}
      <div className="featured-wrapper">
        <FeaturedBlock
          title="Promotions"
          list={featured.promotions}
          className="featured promotions"
        />
        <FeaturedBlock
          title="New Arrivals"
          list={featured.newArrivals}
          className="featured new-arrivals"
        />
        <FeaturedBlock
          title="Popular Products"
          list={featured.popular}
          className="featured popular"
        />
      </div>

      {/* Category Sections */}
      {Object.entries(productData).map(([slug, products]) => (
        <ProductSection key={slug} slug={slug} products={products} />
      ))}
    </div>
  );
};

export default Homepage;

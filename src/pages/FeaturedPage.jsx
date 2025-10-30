// ============================================================
// ✅ FeaturedPage.jsx — Unified with Badges + Discount Display
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./FeaturedPage.css";
import "../pages/homepage.css"; // ✅ reuse badge & discount styles

const normalizeSlug = (str) => str?.toLowerCase().replace(/\s+/g, "-").trim();

const FeaturedPage = ({ featureType }) => {
  const navigate = useNavigate();
  const [productsData, setProductsData] = useState([]);
  const [vouchers, setVouchers] = useState([]); // ✅ new
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("default");

  const API_URL =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bookstore-yl7q.onrender.com";

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/products/featured`);
        if (!res.ok) throw new Error("Failed to fetch featured products");
        const data = await res.json();
        let selected = [];
        if (featureType === "promotions") selected = data.promotions || [];
        else if (featureType === "new-arrivals") selected = data.newArrivals || [];
        else if (featureType === "popular-products") selected = data.popular || [];
        setProductsData(selected);
      } catch (err) {
        console.error("Error fetching featured:", err);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, [API_URL, featureType]);

  // Fetch vouchers
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/vouchers`);
        const data = await res.json();
        const active = Array.isArray(data) ? data.filter((v) => v.is_active) : [];
        setVouchers(active);
      } catch (err) {
        console.error("Error fetching vouchers:", err);
      }
    };
    fetchVouchers();
  }, [API_URL]);

  const handleSortChange = (e) => setSortOption(e.target.value);

  const getSortedProducts = () => {
    switch (sortOption) {
      case "price-low-to-high":
        return [...productsData].sort((a, b) => a.price - b.price);
      case "price-high-to-low":
        return [...productsData].sort((a, b) => b.price - a.price);
      default:
        return productsData;
    }
  };

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

  const VariantCard = ({ product }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [fading, setFading] = useState(false);
    const intervalRef = useRef(null);
    const variants = product.variants || [];
    const hasVariants = variants.length > 1;
    const currentVariant = variants[activeIndex];
    const currentImage =
      currentVariant?.mainImage ||
      product.mainImage ||
      "/assets/placeholder-image.png";

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

    // Voucher & badge logic
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

    const originalPrice = currentVariant?.price || product.price || 0;
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

    return (
      <div
        className="product-card variant-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() =>
          navigate(
            `/product/${product.slug}/${
              currentVariant?.format?.toLowerCase() || "standard"
            }`
          )
        }
      >
        <div className="product-image-wrap">
          <img
            src={currentImage}
            alt={product.name}
            className={fading ? "fade" : ""}
            onError={(e) => (e.target.src = "/assets/placeholder-image.png")}
          />

          {/* ✅ BADGES */}
          {product.isNewArrival && (
            <span className="badge-new" title="New arrival">
              NEW
            </span>
          )}
          {linkedVoucher && (
            <span className="badge-voucher" title="Special offer applied!">
              {badgeText}
            </span>
          )}

          {hasVariants && (
            <span className="variant-count">{variants.length} Variants</span>
          )}
        </div>

        <p className="product-name">{product.name}</p>

        {/* 💰 Price */}
        {linkedVoucher ? (
          <p className="price discounted">
            <span className="original">₱{originalPrice.toFixed(2)}</span>
            <span className="discounted">₱{discountedPrice.toFixed(2)}</span>
          </p>
        ) : (
          <p className="price">₱{originalPrice.toFixed(2)}</p>
        )}
      </div>
    );
  };

  const groupedProducts = groupProductsByParent(getSortedProducts());

  if (loading) return <div className="loading">Loading featured products...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="app">
      <div className={`product-section featured-page-section ${featureType}`}>
        <h2 className="section-heading">
          {featureType.replace("-", " ").toUpperCase()}
        </h2>

        <div className="sorting-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select id="sort-select" value={sortOption} onChange={handleSortChange}>
            <option value="default">Default</option>
            <option value="price-low-to-high">Price: Low to High</option>
            <option value="price-high-to-low">Price: High to Low</option>
          </select>
        </div>

        <div className="product-list">
          {groupedProducts.length > 0 ? (
            groupedProducts.map((p) => <VariantCard key={p._id} product={p} />)
          ) : (
            <p className="no-products">No products found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedPage;

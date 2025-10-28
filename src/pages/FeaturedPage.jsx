// ============================================================
// ✅ FeaturedPage.jsx — Unified Text + Button Highlight Behavior
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./FeaturedPage.css";


const normalizeSlug = (str) => str?.toLowerCase().replace(/\s+/g, "-").trim();

const FeaturedPage = ({ featureType }) => {
  const navigate = useNavigate();
  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("default");

  const API_URL =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bookstore-yl7q.onrender.com";

  // ===============================
  // 📦 Fetch featured products
  // ===============================
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

  // ===============================
  // ⚙️ Sorting logic
  // ===============================
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

  // ===============================
  // 🧩 Group Variants by Parent
  // ===============================
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

  // ===============================
  // 💳 VariantCard Component
  // ===============================
  const VariantCard = ({ product }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [fading, setFading] = useState(false);
    const intervalRef = useRef(null);

    const variants = product.variants || [];
    const hasVariants = variants.length > 1;
    const currentImage =
      variants[activeIndex]?.mainImage ||
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

    const handleVariantClick = (v) =>
      navigate(`/product/${product.slug}/${v.format.toLowerCase()}`);
    const handleCardClick = () => {
      const v = variants[activeIndex] || variants[0];
      navigate(`/product/${product.slug}/${v.format?.toLowerCase() || "standard"}`);
    };

    return (
      <div
        className="product-card variant-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleCardClick}
      >
        <div className="product-image-wrap">
          <img
            src={currentImage}
            alt={product.name}
            className={fading ? "fade" : ""}
            onError={(e) => (e.target.src = "/assets/placeholder-image.png")}
          />
          {hasVariants && (
            <span className="variant-count">{variants.length} Variants</span>
          )}
        </div>
        <p className="product-name">{product.name}</p>
        <p className="price">
          ₱
          {variants[activeIndex]?.price?.toFixed(2) ||
            product.price?.toFixed(2) ||
            "N/A"}
        </p>

        {variants.length > 0 && (
          <div className="variant-buttons">
            {variants.map((v, idx) => (
              <button
                key={v._id}
                className={`variant-btn ${idx === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleVariantClick(v)}
              >
                {v.format} — ₱{v.price?.toFixed(2) || "N/A"}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ===============================
  // 🎨 Featured Section Colors
  // ===============================
  const getFeaturedStyle = () => {
    switch (featureType) {
      case "promotions":
        return {
          background: "linear-gradient(135deg, #f87171 0%, #fca5a5 100%)",
          color: "#000",
          "--highlight": "#f87171",
        };
      case "new-arrivals":
        return {
          background: "linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%)",
          color: "#000",
          "--highlight": "#60a5fa",
        };
      case "popular-products":
        return {
          background: "linear-gradient(135deg, #facc15 0%, #fde68a 100%)",
          color: "#000",
          "--highlight": "#facc15",
        };
      default:
        return { background: "#f4f4f4", color: "#000", "--highlight": "#111" };
    }
  };

  const { background, color, "--highlight": highlight } = getFeaturedStyle();

  if (loading) return <div className="loading">Loading featured products...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const groupedProducts = groupProductsByParent(getSortedProducts());

  const headingMap = {
    "promotions": "PROMOTIONS",
    "new-arrivals": "NEW ARRIVALS",
    "popular-products": "POPULAR PRODUCTS",
  };
  const heading = headingMap[featureType] || "FEATURED PRODUCTS";

  return (
    <div className="app">
      <div
        className={`product-section featured-page-section ${featureType}`}
        style={{
          background,
          color,
          "--section-color": background,
          "--section-text-color": color,
          "--highlight": highlight,
        }}
      >
        <h2 className="section-heading" style={{ color: "#000" }}>
          {heading}
        </h2>

        <div className="sorting-controls" style={{ color: "#000" }}>
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
            <p className="no-products" style={{ color: "#000" }}>
              No products found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedPage;

// ============================================================
// ✅ MangaCategoryPage.jsx — Click-to-Highlight Multi-Filter
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MangaCategoryPage.css";

const normalizeSlug = (str) => str?.toLowerCase().replace(/\s+/g, "-").trim();

const MangaCategoryPage = ({ baseCategory, heading }) => {
  const navigate = useNavigate();
  const { subcategory } = useParams();

  const [productsData, setProductsData] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("default");
  const [selectedSubs, setSelectedSubs] = useState([]); // ✅ for multi-highlight

  const API_URL =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bookstore-yl7q.onrender.com";

  // 🧩 Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, [API_URL]);

  // 🧩 Fetch vouchers
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
        console.error("Error fetching vouchers:", err);
      }
    };
    fetchVouchers();
  }, [API_URL]);

  // 🧩 Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/products`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const allProducts = await res.json();

        const baseCatNorm = normalizeSlug(baseCategory);
        const subCatNorm = normalizeSlug(subcategory);

        // ✅ Filter by selected subcategories or URL param
        const filtered = allProducts.filter((p) => {
          const cat = normalizeSlug(p.category);
          const sub = normalizeSlug(p.subcategory);

          if (cat !== baseCatNorm) return false;

          if (selectedSubs.length > 0) {
            return selectedSubs.some(
              (sel) => normalizeSlug(sel) === normalizeSlug(sub)
            );
          }

          if (subCatNorm) return sub === subCatNorm;

          return true;
        });

        setProductsData(filtered);

        // extract unique subcategories
        const uniqueSubs = [
          ...new Set(
            allProducts
              .filter((p) => normalizeSlug(p.category) === baseCatNorm)
              .map((p) => p.subcategory)
              .filter(Boolean)
          ),
        ];
        setSubcategories(uniqueSubs);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [API_URL, baseCategory, subcategory, selectedSubs]);

  // 🧩 Sorting logic
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

  // 🧩 Group variants under one product
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

  // 🧩 Category color helper
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
  // 🧱 VariantCard — Displays product + variants + voucher badges
  // ============================================================
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

    const handleVariantClick = (v) =>
      navigate(`/product/${product.slug}/${v.format.toLowerCase()}`);

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
        onClick={() => navigate(`/product/${product.slug}`)}
      >
        <div className="product-image-wrap">
          <img
            src={currentImage}
            alt={product.name}
            className={fading ? "fade" : ""}
            onError={(e) => (e.target.src = "/assets/placeholder-image.png")}
          />
          {product.isNewArrival && <span className="badge-new">NEW</span>}
          {linkedVoucher && (
            <span className="badge-voucher">{badgeText}</span>
          )}
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
            <span className="original">₱{originalPrice.toFixed(2)}</span>
            <span className="discounted">₱{discountedPrice.toFixed(2)}</span>
          </p>
        ) : (
          <p className="price">₱{originalPrice.toFixed(2)}</p>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const groupedProducts = groupProductsByParent(getSortedProducts());
  const { bg, text } = getCategoryColors(baseCategory);

  return (
    <div className="app">
      <h2
        className="section-heading"
        style={{ color: text, borderLeft: `6px solid ${bg}` }}
      >
        {heading}
      </h2>

      {/* ✅ Subcategory multi-highlight filter bar */}
      <div className="subcategory-filter-bar">
        <button
          className={`filter-chip ${selectedSubs.length === 0 ? "active" : ""}`}
          onClick={() => setSelectedSubs([])}
        >
          All
        </button>
        {subcategories.map((sc) => {
          const active = selectedSubs.includes(sc);
          return (
            <button
              key={sc}
              className={`filter-chip ${active ? "active" : ""}`}
              onClick={() =>
                setSelectedSubs((prev) =>
                  active
                    ? prev.filter((s) => s !== sc)
                    : [...prev, sc]
                )
              }
            >
              {sc}
            </button>
          );
        })}
      </div>

      <div className="sorting-controls">
        <label htmlFor="sort-select">Sort by:</label>
        <select id="sort-select" value={sortOption} onChange={handleSortChange}>
          <option value="default">Default</option>
          <option value="price-low-to-high">Price: Low to High</option>
          <option value="price-high-to-low">Price: High to Low</option>
        </select>
      </div>

      <div
        className="product-section"
        style={{
          "--section-color": bg,
          "--section-text-color": text,
          backgroundColor: `color-mix(in srgb, ${bg} 20%, white)`,
          color: text,
        }}
      >
        <div className="product-list">
          {groupedProducts.length > 0 ? (
            groupedProducts.map((p) => <VariantCard key={p._id} product={p} />)
          ) : (
            <p className="no-products">No products found.</p>
          )}
        </div>
      </div>

      <hr className="bottom-line" />
    </div>
  );
};

export default MangaCategoryPage;

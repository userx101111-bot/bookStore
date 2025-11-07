// ============================================================
// ✅ MangaCategoryPage.jsx — FeaturedCard Design + Local Filtering + Fixed Loading
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./MangaCategoryPage.css";
import "../pages/homepage.css"; // ✅ reuse shared styles

const normalizeSlug = (str) => str?.toLowerCase().replace(/\s+/g, "-").trim();

const MangaCategoryPage = ({ baseCategory, heading }) => {
  const navigate = useNavigate();
  const { subcategory } = useParams();

  const [allProducts, setAllProducts] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("default");
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [filtering, setFiltering] = useState(false); // ✅ smooth fade effect

  const API_URL =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://bookstore-yl7q.onrender.com";

  // 🧩 Fetch vouchers (once)
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

  // 🧩 Fetch all products (once)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/products`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setAllProducts(data);
      } catch (err) {
        console.error("❌ Error fetching products:", err);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [API_URL]);

  // 🧩 Local filter logic
  useEffect(() => {
    if (!allProducts.length) return;

    const baseCatNorm = normalizeSlug(baseCategory);
    const subCatNorm = normalizeSlug(subcategory);

    setFiltering(true);

    const filtered = allProducts.filter((p) => {
      const cat = normalizeSlug(p.category);
      const sub = normalizeSlug(p.subcategory);
      if (cat !== baseCatNorm) return false;
      if (selectedSubs.length > 0)
        return selectedSubs.some(
          (sel) => normalizeSlug(sel) === normalizeSlug(sub)
        );
      if (subCatNorm) return sub === subCatNorm;
      return true;
    });

    setProductsData(filtered);

    const uniqueSubs = [
      ...new Set(
        allProducts
          .filter((p) => normalizeSlug(p.category) === baseCatNorm)
          .map((p) => p.subcategory)
          .filter(Boolean)
      ),
    ];
    setSubcategories(uniqueSubs);

    const timer = setTimeout(() => setFiltering(false), 250);
    return () => clearTimeout(timer);
  }, [allProducts, baseCategory, subcategory, selectedSubs]);

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

  // ============================================================
  // 🧱 VariantCard — identical to FeaturedPage + Top Badges
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

    // 🧩 Voucher & Discount Logic
    const cleanParentId = (product.parentId || product._id)?.split("-")[0];
    const cleanVariantId = currentVariant?._id?.split("-").pop();

    const linkedVoucher =
      vouchers.find((v) =>
        v.applicable_variants?.some((vv) => {
          const prodId = vv.product?._id || vv.product;
          const variantId = vv.variant_id || vv.variantId;
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
          {/* ✅ Top badge container */}
          <div className="badge-container">
            {product.isNewArrival && (
              <span className="badge-new">NEW</span>
            )}
            {linkedVoucher && (
              <span className="badge-voucher">{badgeText}</span>
            )}
          </div>

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
                onMouseEnter={() => setActiveIndex(idx)}
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

  const groupedProducts = groupProductsByParent(getSortedProducts());

  if (loading) return <div className="loading">Loading products...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="app">
      <h2 className="section-heading">{heading}</h2>

      {/* ✅ Subcategory multi-select filter */}
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
                  active ? prev.filter((s) => s !== sc) : [...prev, sc]
                )
              }
            >
              {sc}
            </button>
          );
        })}
      </div>

      {/* ✅ Sorting controls */}
      <div className="sorting-controls">
        <label htmlFor="sort-select">Sort by:</label>
        <select id="sort-select" value={sortOption} onChange={handleSortChange}>
          <option value="default">Default</option>
          <option value="price-low-to-high">Price: Low to High</option>
          <option value="price-high-to-low">Price: High to Low</option>
        </select>
      </div>

      {/* ✅ Product grid */}
      <div
        className={`product-section featured-page-section ${
          filtering ? "filtering" : ""
        }`}
      >
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

export default MangaCategoryPage;

// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaShoppingCart, FaBars, FaBookOpen } from "react-icons/fa";
import SearchBar from "./SearchBar";
import "../components/Navbar.css"; // keep using your CSS file

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCategories();
  }, []);

  return (
    <nav className="navbar">
      {/* === Left: Logo === */}
      <div className="logo">
        <Link to="/">
          <img src="/assets/logo.png" alt="Brand Logo" />
        </Link>
      </div>

      {/* === Center: Main Navigation === */}
      <ul className={`nav-links ${menuOpen ? "open" : ""}`}>
        <li
          className="browse-products"
          onMouseEnter={() => setHoveredCategory(null)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <div className="browse-icon">
            <FaBookOpen />
            <span>Browse</span>
          </div>

          {/* === First dropdown: Categories === */}
          <ul className="dropdown-menu browse-menu">
            <li className="featured-title">Featured</li>
            <li>
              <Link to="/promotions">Promotions</Link>
            </li>
            <li>
              <Link to="/new-arrivals">New Arrivals</Link>
            </li>
            <li>
              <Link to="/popular-products">Popular</Link>
            </li>
            <li className="divider"></li>

            {categories.length === 0 ? (
              <li className="loading-categories">Loading categories...</li>
            ) : (
              categories.map((cat) => (
                <li
                  key={cat.slug}
                  className="category-item"
                  onMouseEnter={() => setHoveredCategory(cat.slug)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <Link to={`/${cat.slug}`}>{cat.name}</Link>

                  {hoveredCategory === cat.slug && cat.subcategories?.length > 0 && (
                    <ul className="sub-dropdown-menu">
                      {cat.subcategories.map((sub) => (
                        <li key={sub.slug}>
                          <Link to={`/${cat.slug}/${sub.slug}`}>{sub.name}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))
            )}
          </ul>
        </li>

        {/* You may add more nav links here */}
      </ul>

      {/* === Center-Right: Search Bar === */}
      <div className="navbar-search">
        <SearchBar />
      </div>

      {/* === Right: Icons === */}
      <div className="navbar-icons">
        <Link to="/cart" className="nav-icon">
          <FaShoppingCart />
          <span>Cart</span>
        </Link>
        <Link to="/profile" className="nav-icon">
          <FaUser />
          <span>Account</span>
        </Link>

        {/* Mobile menu toggle */}
        <div
          className="nav-icon mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <FaBars />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

// ============================================================
// ✅ src/components/Footer.jsx — Clean & De-Duplicated Version
// ============================================================
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const Footer = () => {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/static-pages?active=true`);
        if (!res.ok) throw new Error("Failed to fetch pages");
        const data = await res.json();

        // ✅ Filter only common static pages
        const filtered = data.filter((page) =>
          [
            "about-us",
            "privacy-policy",
            "return-policy",
            "contact",
            "faqs",
          ].includes(page.slug)
        );

        // ✅ Sort alphabetically by title
        const sorted = filtered.sort((a, b) =>
          a.title.localeCompare(b.title)
        );

        setPages(sorted);
        console.log("📄 Footer loaded static pages:", sorted);
      } catch (err) {
        console.error("❌ Error fetching static pages:", err);
      }
    };
    fetchPages();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-columns">
        {/* Left Column */}
        <div className="footer-column left-column">
          <Link to="/">
            <img src="/assets/logo.png" alt="Logo" className="footer-logo" />
          </Link>
          <h3 className="footer-left">Follow Us</h3>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <img src="/assets/fb.png" alt="Facebook" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <img src="/assets/ig.png" alt="Instagram" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
              <img src="/assets/tt.png" alt="TikTok" />
            </a>
          </div>
        </div>

        {/* Right Columns Group */}
        <div className="right-columns-group">
          {/* Customer Support Section */}
          <div className="footer-column">
            <h3 className="footer-heading">Customer Support</h3>
            <ul>
              <li><a href="tel:+631234567">+63 1234 5678</a></li>
              <li><Link to="/track-order">Track Order</Link></li>
              {/* ⚠️ Removed duplicate Return Policy */}
            </ul>
          </div>

          {/* Dynamic Static Pages Section */}
          <div className="footer-column">
            <h3 className="footer-heading">Explore</h3>
            <ul>
              {pages.length > 0 ? (
                pages.map((page) => (
                  <li key={page._id}>
                    <Link to={`/${page.slug}`}>{page.title}</Link>
                  </li>
                ))
              ) : (
                <li style={{ opacity: 0.7 }}>No pages yet</li>
              )}

              {/* Extra internal links (not in static pages) */}
              <li><Link to="/varieties">All Products</Link></li>
              <li><Link to="/new-offers">New Offers</Link></li>
              <li><Link to="/">Homepage</Link></li>
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="footer-column right-column">
            <h3 className="footer-heading">Get More Updates</h3>
            <p className="footer-sentence">
              Join us and receive updates on the best offers and new items!
            </p>
            <form
              className="subscribe-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="subscribe-wrapper">
                <input type="email" placeholder="Your email" />
                <button type="submit">I'm in</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <p className="footer-bottom">
        &copy; {new Date().getFullYear()} Komikku Vault. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;

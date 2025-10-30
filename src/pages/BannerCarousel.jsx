// 🖼️ BannerCarousel.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BannerCarousel({ banners }) {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners]);

  return (
    <div className="carousel-wrapper">
      {banners.map((b, i) => (
        <div
          key={b._id}
          className={`carousel-slide ${i === current ? "active" : ""}`}
          style={{ backgroundColor: b.backgroundColor || "#fff" }}
        >
          <picture>
            {b.imageMobile && (
              <source srcSet={b.imageMobile} media="(max-width:768px)" />
            )}
            <img src={b.imageDesktop} alt={b.title} className="carousel-image" />
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
      ))}
    </div>
  );
}

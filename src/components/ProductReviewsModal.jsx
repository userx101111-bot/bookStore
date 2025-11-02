// src/components/ProductReviewsModal.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./ProductReviewsModal.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

export default function ProductReviewsModal({ productId, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const token = localStorage.getItem("token");

  // ============================================================
  // 🟡 Load Reviews
  // ============================================================
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/reviews/product/${productId}`);
        setReviews(res.data || []);
      } catch (err) {
        console.error("❌ Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, [productId]);

  // ============================================================
  // 🟢 Check if user purchased this product
  // ============================================================
  useEffect(() => {
    const checkPurchase = async () => {
      if (!token) return; // not logged in
      try {
        const res = await axios.get(`${API_URL}/api/orders/myorders`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const allOrders = res.data || [];
        const bought = allOrders.some((o) =>
          o.orderItems?.some((i) => String(i.product) === String(productId))
        );

        setHasPurchased(bought);
      } catch (err) {
        console.error("❌ Failed to verify purchase:", err);
      }
    };

    checkPurchase();
  }, [productId, token]);

  // ============================================================
  // ⭐ NEW: Count reviews by star rating
  // ============================================================
  const starCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++;
    });
    return counts;
  }, [reviews]);

  // ============================================================
  // 🔍 Filter Reviews
  // ============================================================
  const filtered = reviews.filter((r) => {
    if (filter === "all") return true;
    if (filter === "withMedia") return !!r.image;
    return r.rating === Number(filter);
  });

  // ============================================================
  // 🧱 Render
  // ============================================================
  return (
    <div className="reviews-modal-overlay">
      <div className="reviews-modal">
        <div className="reviews-header">
          <h3>Ratings & Reviews</h3>
          <button onClick={onClose}>✖</button>
        </div>

        {/* 🧩 Filters */}
        <div className="review-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({reviews.length})
          </button>
          <button
            className={filter === "withMedia" ? "active" : ""}
            onClick={() => setFilter("withMedia")}
          >
            With Media
          </button>

          {/* ⭐ Star Filters with Counts */}
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              className={filter === String(s) ? "active" : ""}
              onClick={() => setFilter(String(s))}
            >
              {s}★ ({starCounts[s]})
            </button>
          ))}
        </div>

        {/* 📝 Write Review Button (only for buyers) */}
        {hasPurchased && (
          <div className="write-review-box">
            <button
              className="btn-write-review"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("openWriteReviewModal", { detail: { productId } })
                );
              }}
            >
              ⭐ Write a Review
            </button>
            <p className="verified-note">You purchased this item ✅</p>
          </div>
        )}

        {/* 📜 Reviews List */}
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="no-reviews">No reviews found.</p>
        ) : (
          <div className="review-list">
            {filtered.map((r) => (
              <div key={r._id} className="review-card">
                <div className="review-header">
                  <strong>{r.user?.firstName || "User"}</strong>
                  <span className="stars">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                <p className="comment">{r.comment}</p>
                {r.image && (
                  <img src={r.image} alt="review" className="review-img" />
                )}
                <small className="date">
                  {new Date(r.createdAt).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

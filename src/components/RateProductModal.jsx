// ============================================================
//  src/components/RateProductModal.jsx
// ============================================================
import React, { useState } from "react";
import axios from "axios";
import "./RateProductModal.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

const RateProductModal = ({ item, orderId, token, onClose, onRated }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return alert("Please select a rating.");

    const formData = new FormData();
    formData.append("productId", item.product?._id || item.product);
    formData.append("variantId", item.variantId || "");
    formData.append("orderId", orderId);
    formData.append("rating", rating);
    formData.append("comment", comment);
    if (image) formData.append("image", image);

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/reviews/add`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert(res.data.message || "Review submitted successfully!");
      onRated(item._id);
      onClose();
    } catch (err) {
      console.error("❌ Rating failed:", err);
      alert(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal rate-modal">
        <h3>⭐ Rate Product</h3>
        <p><strong>{item.name}</strong> ({item.format})</p>

        <div className="stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              className={`star ${rating >= s ? "active" : ""}`}
              onClick={() => setRating(s)}
            >
              ★
            </span>
          ))}
        </div>

        <textarea
          placeholder="Write a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateProductModal;

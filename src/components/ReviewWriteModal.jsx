// src/components/ReviewWriteModal.jsx
import React, { useState } from "react";
import axios from "axios";
import "./ReviewWriteModal.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://bookstore-yl7q.onrender.com";

export default function ReviewWriteModal({ productId, token, onClose, onSubmitSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return alert("Select a star rating first!");
    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("rating", rating);
    fd.append("comment", comment);
    if (image) fd.append("image", image);

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/reviews/add`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Review submitted!");
      onSubmitSuccess?.();
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="write-modal-overlay">
      <div className="write-modal">
        <h3>Write a Review</h3>
        <div className="stars">
          {[1,2,3,4,5].map((s) => (
            <span key={s} className={rating >= s ? "active" : ""} onClick={() => setRating(s)}>★</span>
          ))}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your thoughts..." />
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
        <div className="actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}

// server/models/Product.js
const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  format: String,
  price: Number,
  countInStock: Number,
  isbn: String,
  trimSize: String,
  pages: Number,
  mainImage: String,
  albumImages: [String],
});

const productSchema = new mongoose.Schema(
  {
    // Core product info
    name: { type: String, required: true },
    description: String,
    category: String,
    subcategory: String,
    seriesTitle: String,
    volumeNumber: Number,
    publisher: String,
    author: String,
    authorBio: String,
    slug: { type: String, required: true, unique: true },
    publicationDate: Date,
    age: String,
    variants: [variantSchema],

    // Product status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Out of Stock"],
      default: "Active",
    },

    // Featured flags
    isPromotion: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },

    // ✅ New Arrival management
    dateAdded: { type: Date, default: Date.now }, // when added
    newArrivalUntil: { type: Date }, // expiry date for "new" status
  },
  { timestamps: true }
);

// =============================
// 🔁 Pre-save logic
// =============================
productSchema.pre("save", function (next) {
  // Auto status update based on stock
  const totalStock = this.variants?.reduce(
    (sum, v) => sum + (v.countInStock || 0),
    0
  );
  if (totalStock === 0) this.status = "Out of Stock";

  // Auto-set expiry if missing (default 30 days)
  if (!this.newArrivalUntil) {
    const daysToStayNew = 30;
    this.newArrivalUntil = new Date(
      this.dateAdded.getTime() + daysToStayNew * 24 * 60 * 60 * 1000
    );
  }

  next();
});

// =============================
// 💡 Virtuals
// =============================
productSchema.virtual("isCurrentlyNew").get(function () {
  const now = new Date();
  return this.isNewArrival || (this.newArrivalUntil && now <= this.newArrivalUntil);
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// =============================
// 🧩 Schema Methods
// =============================

// 🥇 Best Practice — remove from new arrivals
productSchema.methods.removeFromNewArrivals = async function () {
  this.isNewArrival = false;
  this.newArrivalUntil = new Date(); // expire immediately
  await this.save();
  return this;
};

// Optional: Extend new-arrival window
productSchema.methods.extendNewArrival = async function (days) {
  const extension = days * 24 * 60 * 60 * 1000;
  this.isNewArrival = true;
  this.newArrivalUntil = new Date(Date.now() + extension);
  await this.save();
  return this;
};
productSchema.virtual("averageRating", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
  justOne: false,
  count: false,
});

module.exports = mongoose.model("Product", productSchema);

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
    status: {
      type: String,
      enum: ["Active", "Inactive", "Out of Stock"],
      default: "Active",
    },

    // Featured flags
    isPromotion: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.pre("save", function (next) {
  const totalStock = this.variants?.reduce(
    (sum, v) => sum + (v.countInStock || 0),
    0
  );
  if (totalStock === 0) this.status = "Out of Stock";
  next();
});

module.exports = mongoose.model("Product", productSchema);

// server/models/Category.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subcategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
});

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  color: { type: String, default: "#ffffff" },      // 🆕 background color
  textColor: { type: String, default: "#111111" },  // 🆕 text color
  subcategories: [subcategorySchema],
});

module.exports = mongoose.model('Category', categorySchema);

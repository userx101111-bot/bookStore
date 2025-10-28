//server/models/addToCart.js
const mongoose = require('mongoose');

const addToCartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product', 
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AddToCart', addToCartSchema);

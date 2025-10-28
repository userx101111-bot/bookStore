//server/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  orderItems: [  // Changed from products to orderItems
    {
      name: { type: String, required: true },
      qty: { type: Number, required: true },  // Changed from quantity to qty
      image: { type: String, required: true },
      price: { type: Number, required: true },
      product: {  // Changed from productId to product
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product'
      }
    }
  ],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: false },
    country: { type: String, default: 'Philippines' }
  },
  paymentMethod: {
    type: String,
    default: 'cash on delivery'
  },
  totalPrice: {  // Changed from totalAmount to totalPrice
    type: Number,
    required: true,
    default: 0.0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveredAt: {  // Added field used in orderRoutes.js
    type: Date
  }
}, {
  timestamps: true  // This will maintain createdAt
});

module.exports = mongoose.model('Order', orderSchema);

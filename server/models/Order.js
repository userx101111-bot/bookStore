const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
orderItems: [
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: false },
    name: { type: String, required: true },
    format: { type: String, required: false },
    originalPrice: { type: Number, required: true },
    discountedPrice: { type: Number, required: true },
    qty: { type: Number, required: true },
    itemTotal: { type: Number, required: true },
    image: { type: String, required: true },
  },
],

shippingAddress: {
  houseNumber: { type: String },
  street: { type: String, required: true },
  barangay: { type: String },
  city: { type: String, required: true },
  region: { type: String, required: true }, 
  postalCode: { type: String },
  country: { type: String, default: "Philippines" },
},

    paymentMethod: {
      type: String,
      required: true,
      enum: ['cash on delivery', 'PayPal'],
      default: 'cash on delivery',
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: { type: Number, default: 0.0 },
    taxPrice: { type: Number, default: 0.0 },
    shippingPrice: { type: Number, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

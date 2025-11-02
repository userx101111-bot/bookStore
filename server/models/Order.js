const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },

    orderItems: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variantId: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String, required: true },
        format: String,
        originalPrice: Number,
        discountedPrice: Number,
        qty: Number,
        itemTotal: Number,
        image: String,
      },
    ],

    shippingAddress: {
      houseNumber: String,
      street: { type: String, required: true },
      barangay: String,
      city: { type: String, required: true },
      region: { type: String, required: true },
      postalCode: String,
      country: { type: String, default: "Philippines" },
    },

    name: String,
    phone: String,

    paymentMethod: {
      type: String,
      enum: ['cash on delivery', 'paypal', 'wallet'],
      default: 'cash on delivery',
    },

    paymentResult: {
      id: String, // PayPal order ID or capture ID
      capture_id: String, // ✅ add this for direct refund lookups
      status: String,
      update_time: String,
      email_address: String,
    },

    itemsPrice: { type: Number, default: 0.0 },
    taxPrice: { type: Number, default: 0.0 },
    shippingPrice: { type: Number, default: 0.0 },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,

status: {
  type: String,
  enum: [
    'pending',        // COD before admin approval
    'processing',     // Paid (PayPal, Wallet, GCash) or COD approved
    'to_ship',        // ✅ newly added
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'return_requested',
    'return_approved',
    'return_rejected',
  ],
  default: 'pending',
},

    deliveredAt: Date,

    // Cancel and Return requests
    cancelRequest: {
      requested: { type: Boolean, default: false },
      reason: String,
      requestedAt: Date,
      handled: { type: Boolean, default: false },
      handledAt: Date,
      revertedAt: { type: Date, default: null },
    },

    returnRequest: {
      requested: { type: Boolean, default: false },
      reason: String,
      requestedAt: Date,
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      handledAt: Date,
    },

    // 🆕 Refund Info (NEW SECTION)
    refundResult: {
      id: String, // PayPal refund ID
      status: String, // Example: COMPLETED, PENDING, FAILED
      amount: {
        value: String,
        currency_code: String,
      },
      update_time: String,
    },
    refundedAt: Date,
  },
  { timestamps: true, minimize: false } 
);

module.exports = mongoose.model('Order', orderSchema);

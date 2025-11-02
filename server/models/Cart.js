const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  variant_format: String,
  price: { type: Number, required: true },
  discount_value: { type: Number, default: 0 },
  discount_type: { type: String, enum: ["percentage", "fixed", null], default: null },
  final_price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
  applied_voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
  createdAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  guestId: { type: String, required: false },
  items: [cartItemSchema],
  total_quantity: { type: Number, default: 0 },
  total_before_discount: { type: Number, default: 0 },
  total_discount: { type: Number, default: 0 },
  total_after_discount: { type: Number, default: 0 },
});

cartSchema.pre("save", function (next) {
  this.total_quantity = this.items.reduce((s, i) => s + i.quantity, 0);
  this.total_before_discount = this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  this.total_after_discount = this.items.reduce((s, i) => s + i.final_price * i.quantity, 0);
  this.total_discount = this.total_before_discount - this.total_after_discount;
  next();
});

module.exports = mongoose.model("Cart", cartSchema);

// server/models/Voucher.js
const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["discount", "free_shipping"], required: true },
    description: String,

    // Discount-only fields
    discount_type: { type: String, enum: ["percentage", "fixed"], default: null },
    discount_value: { type: Number, default: 0 },
    max_discount: { type: Number, default: null },
    min_spend: { type: Number, default: 0 },

    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    is_active: { type: Boolean, default: true },

    // ✅ NEW: Variant-level linkage (in addition to product-level)
    applicable_products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicable_variants: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
    ],
  },
  { timestamps: true }
);

voucherSchema.virtual("isExpired").get(function () {
  return this.end_date < new Date();
});

module.exports = mongoose.model("Voucher", voucherSchema);

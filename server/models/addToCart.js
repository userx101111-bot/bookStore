const mongoose = require("mongoose");

const addToCartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

// ✅ Virtual to calculate total
addToCartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((sum, i) => sum + (i.subtotal || 0), 0);
});

addToCartSchema.set("toJSON", { virtuals: true });
addToCartSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("AddToCart", addToCartSchema);

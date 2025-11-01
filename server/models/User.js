// ============================================================
// server/models/User.js  (Unified Login Version - Enhanced)
// ============================================================
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  houseNumber: String,
  street: String,
  barangay: String,
  city: String,
  region: String,
  zip: String,
  country: { type: String, default: "Philippines" },
  lat: Number,
  lng: Number,
});

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true },
    passwordManual: String,
    passwordGoogle: String,
    googleId: String,
    loginMethod: {
      type: [String],
      enum: ["email", "google"],
      default: ["email"],
    },
    phone: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },

    // ✅ Address info
    address: { type: addressSchema, default: {} },

    // 🪙 WALLET SYSTEM
    wallet: {
      balance: { type: Number, default: 0 },
      transactions: [
        {
          type: {
            type: String,
            enum: ["credit", "debit"],
            required: true,
          },
          amount: { type: Number, required: true },
          description: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
);

// ✅ Wallet helper methods
userSchema.methods.addWalletCredit = async function (amount, description = "") {
  this.wallet.balance += amount;
  this.wallet.transactions.push({
    type: "credit",
    amount,
    description,
  });
  await this.save();
};

userSchema.methods.deductWalletBalance = async function (amount, description = "") {
  if (this.wallet.balance < amount) throw new Error("Insufficient wallet balance");
  this.wallet.balance -= amount;
  this.wallet.transactions.push({
    type: "debit",
    amount,
    description,
  });
  await this.save();
};
// ============================================================
// Virtuals
// ============================================================

// Computed flag for convenience
userSchema.virtual("hasManualPassword").get(function () {
  return Boolean(this.passwordManual && this.passwordManual.length > 0);
});

// ============================================================
// Password comparison helper
// ============================================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordManual) return false;
  return await bcrypt.compare(enteredPassword, this.passwordManual);
};

// ============================================================
// Pre-save middleware
// ============================================================
userSchema.pre("save", async function (next) {
  // 1️⃣ Auto-hash passwordManual if new or changed
  if (this.isModified("passwordManual") && this.passwordManual) {
    // avoid rehashing already-hashed passwords
    if (!this.passwordManual.startsWith("$2b$")) {
      const salt = await bcrypt.genSalt(10);
      this.passwordManual = await bcrypt.hash(this.passwordManual, salt);
    }
  }

  // 2️⃣ Ensure loginMethod array matches state
  const methods = new Set(this.loginMethod || []);

  if (this.googleId || this.passwordGoogle) methods.add("google");
  if (this.passwordManual) methods.add("email");

  this.loginMethod = Array.from(methods);

  next();
});

// ============================================================
// Export Model
// ============================================================
module.exports = mongoose.model("User", userSchema);

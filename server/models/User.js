// ============================================================
// server/models/User.js  (Unified Login Version - Enhanced)
// ============================================================
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, required: true, unique: true },

    // Separate password fields for each login method
    passwordManual: { type: String },
    passwordGoogle: { type: String },

    googleId: { type: String },

    loginMethod: {
      type: [String],
      enum: ["email", "google"],
      default: ["email"],
    },

    phone: String,
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

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

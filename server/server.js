// ============================================================
// ✅ server/server.js — Final Production-Ready Version
// ============================================================

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const connectDB = require("./config/db");
const User = require("./models/User");
const { protect, admin } = require("./middleware/authMiddleware");
const Voucher = require("./models/Voucher");

// ⚡ ADDED FOR LOW STOCK ALERTS
const cron = require("node-cron"); 
const notifyLowStock = require("./utils/notifyLowStock"); 
// ⚡ END

// 🧹 Clean up legacy indexes that block voucher creation
(async () => {
  try {
    const indexes = await Voucher.collection.getIndexes({ full: true });
    const hasCodeIndex = indexes.find(i => i.name === "code_1");
    if (hasCodeIndex) {
      await Voucher.collection.dropIndex("code_1");
      console.log("✅ Removed legacy unique index: code_1");
    }
  } catch (err) {
    if (!String(err.message).includes("index not found")) {
      console.error("⚠️ Failed to drop code_1 index:", err.message);
    }
  }
})();

// ============================================================
// 🔧 Load Environment Variables & Connect DB
// ============================================================
dotenv.config();
connectDB();

// ============================================================
// ⚙️ Initialize Express App
// ============================================================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// 🌐 CORS CONFIGURATION
// ============================================================
const allowedOrigins = [
  "https://book-store-ten-flame.vercel.app",
  "http://localhost:3000",
  "https://bookstore-yl7q.onrender.com",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`🚫 Blocked by CORS: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ============================================================
// 🖼️ Cloudinary Configuration
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================
// 📂 Static Uploads Folder
// ============================================================
app.use("/uploads", express.static("uploads"));

// ============================================================
// 🧭 Request Logging
// ============================================================
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================
// 🧱 ROUTES (Order Matters!)
// ============================================================
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/cms/banners", require("./routes/cmsBannerRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/email", require("./routes/emailVerificationRoutes"));
app.use("/api/users", require("./routes/accountRoutes"));
app.use("/api/static-pages", require("./routes/staticPageRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/paypal", require("./routes/paypalRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/recently-viewed", require("./routes/recentlyViewedRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/vouchers", require("./routes/voucherRoutes"));
app.use("/api/admin", protect, admin, require("./routes/adminRoutes"));
app.use("/api/admin/overview", require("./routes/adminOverviewRoutes"));

// ============================================================
// 🧠 HEALTH CHECK
// ============================================================
app.get("/api/ping", (req, res) => {
  res.json({ message: "Server alive ✅" });
});

// ============================================================
// 🧑‍💻 AUTO-CREATE ADMIN USER
// ============================================================
const createAdminUser = async () => {
  try {
    const adminEmail = "admin@example.com";
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log("✅ Admin user already exists");
      return;
    }
    const adminUser = new User({
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      passwordManual: "admin",
      loginMethod: ["email"],
      role: "admin",
      phone: "0000000000",
    });
    await adminUser.save();
    console.log(`🎉 Admin user created: ${adminEmail}`);
  } catch (err) {
    console.error("❌ Error creating admin user:", err.message);
  }
};
createAdminUser();

// ============================================================
// ⚡ DAILY LOW STOCK EMAIL CRON JOB
// ============================================================
// ⏰ Runs every day at 8:00 AM server time
cron.schedule("0 8 * * *", async () => {
  console.log("⏰ Running daily low-stock check...");
  await notifyLowStock();
});
// You can adjust to run more frequently, e.g. every 6 hours:
// cron.schedule("0 */6 * * *", async () => { await notifyLowStock(); });

// ============================================================
// 🚀 Serve Frontend in Production
// ============================================================
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../build");
  app.use(express.static(buildPath));

  app.get("*", (req, res) => {
    if (req.originalUrl.startsWith("/api")) {
      return res.status(404).json({ message: "API route not found" });
    }
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

// ============================================================
// 🚀 Start Server
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

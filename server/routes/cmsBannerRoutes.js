// ============================================================
// ✅ cmsBannerRoutes.js
// ============================================================
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getBanners,
  addBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/cmsBannerController");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "bookstore-banners", allowed_formats: ["jpg", "png", "webp"] },
});

const upload = multer({ storage });

// Routes
router.get("/", getBanners);
router.post("/", protect, admin, upload.fields([
  { name: "imageDesktop", maxCount: 1 },
  { name: "imageMobile", maxCount: 1 },
]), addBanner);
router.put("/:id", protect, admin, upload.fields([
  { name: "imageDesktop", maxCount: 1 },
  { name: "imageMobile", maxCount: 1 },
]), updateBanner);
router.delete("/:id", protect, admin, deleteBanner);

module.exports = router;

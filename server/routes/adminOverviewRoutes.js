// server/routes/adminOverviewRoutes.js
const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");

// ============================================================
// 📊 GET /api/admin/overview
// ============================================================
router.get("/", protect, admin, async (req, res) => {
  try {
    // ====== Total sales, orders, and average order value ======
    const orders = await Order.find({ isPaid: true });
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const averageOrderValue =
      totalOrders > 0 ? totalSales / totalOrders : 0;

    // ====== Total customers ======
    const totalCustomers = await User.countDocuments({ role: "user" });

    // ====== Sales over last 14 days ======
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const salesOverTime = await Order.aggregate([
      { $match: { isPaid: true, createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ====== Best-selling products ======
    const bestSellers = await Order.aggregate([
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          name: { $first: "$orderItems.name" },
          totalSold: { $sum: "$orderItems.qty" },
          totalRevenue: {
            $sum: { $multiply: ["$orderItems.qty", "$orderItems.discountedPrice"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // Fetch product images
    const populatedBestSellers = await Promise.all(
      bestSellers.map(async (p) => {
        const prod = await Product.findById(p._id).lean();
        return {
          ...p,
          image: prod?.variants?.[0]?.mainImage || null,
          category: prod?.category || "",
        };
      })
    );

    // ====== Recent orders ======
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "firstName lastName email");

    res.json({
      totalSales,
      totalOrders,
      totalCustomers,
      averageOrderValue,
      salesOverTime,
      bestSellers: populatedBestSellers,
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        customer: o.user
          ? `${o.user.firstName} ${o.user.lastName}`
          : "Guest",
        total: o.totalPrice,
        paymentMethod: o.paymentMethod,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error("❌ Overview route error:", error.message);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

module.exports = router;

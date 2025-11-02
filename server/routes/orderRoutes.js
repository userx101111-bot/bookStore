const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');


// ============================================================
// 📦 Create New Order (Cash on Delivery or PayPal)
// ============================================================
router.post('/', protect, async (req, res) => {
  try {
    console.log("🧾 Create order payload:", req.body);
    const {
      user: userIdFromBody,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid,
      paidAt,
      paymentResult,
      name,
      phone,
    } = req.body;

    const userId = req.user?._id || userIdFromBody;
    if (!userId) {
      return res.status(400).json({ message: "User ID missing or invalid" });
    }

    if (!orderItems || !orderItems.length) {
      return res.status(400).json({ message: "No order items provided" });
    }

    orderItems.forEach((item) => {
      if (!item.product || !item.name || !item.qty) {
        throw new Error("Order item missing required fields");
      }
    });
    const normalizedPaymentMethod = paymentMethod?.toLowerCase() || 'cash on delivery';

    const order = new Order({
      user: userId,
      orderItems,
      shippingAddress,
      name,
      phone,
      paymentMethod: normalizedPaymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: isPaid || false,
      paidAt: paidAt || null,
      paymentResult: paymentResult || {},
      status: ["wallet", "paypal"].includes(normalizedPaymentMethod)
        ? "processing"
        : "pending",


    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("❌ Create order error:", error);

   if (error.name === "ValidationError") {
     return res.status(400).json({
       message: "Validation failed",
       details: Object.values(error.errors).map((e) => e.message),
     });
   }

    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
});



// ============================================================
// 📜 Get Logged-In User’s Orders (includes rated flag)
// ============================================================
const Review = require("../models/Review");

router.get("/myorders", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch both orders and all reviews by this user in parallel
    const [orders, reviews] = await Promise.all([
      Order.find({ user: userId }).sort({ createdAt: -1 }).lean(),
      Review.find({ user: userId }).lean(),
    ]);

    // Mark each item with rated:true if a review exists
    for (const order of orders) {
      for (const item of order.orderItems) {
        const productId = item.product?._id?.toString() || item.product?.toString();
        const variantId = item.variantId?.toString() || null;

        item.rated = reviews.some((r) => {
          const sameProduct = r.product?.toString() === productId;
          const sameVariant = !variantId || r.variant?.toString() === variantId;
          return sameProduct && sameVariant;
        });
      }
    }

    res.json(orders);
  } catch (error) {
    console.error("❌ Get my orders (with rated) error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to fetch orders with rated info", error: error.message });
  }
});

// ============================================================
// 🔍 Get Order by ID
// ============================================================
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow the owner or admin to view
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Get order error:', error.message);
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

// ============================================================
// 💰 Update Order to Paid (PayPal or Manual)
// ============================================================
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the buyer or admin can mark as paid
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to update this order' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();

    // If PayPal or any gateway returns payment result, store it
    if (req.body.paymentResult) {
      order.paymentResult = {
        id: req.body.paymentResult.id,
        status: req.body.paymentResult.status,
        update_time: req.body.paymentResult.update_time,
        email_address: req.body.paymentResult.email_address || req.body.paymentResult.payer?.email_address,
      };
    }

    // Optionally change order status after payment
    if (order.status === 'pending') {
      order.status = 'processing';
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ Update payment error:', error.message);
    res.status(500).json({ message: 'Failed to update payment', error: error.message });
  }
});

// ============================================================
// 🚚 Update Order Status (Admin Only)
// ============================================================
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;

if (status === 'delivered') {
  order.deliveredAt = Date.now();
  order.cancelRequest = { requested: false };
}

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    console.error('❌ Update status error:', error.message);
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
});

// ============================================================
// 📋 Admin: Get All Orders
// ============================================================
router.get('/', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('❌ Get all orders error:', error.message);
    res.status(500).json({ message: 'Failed to fetch all orders', error: error.message });
  }
});
// ============================================================
// 🟡 Request Cancel Order (User)
// ============================================================
router.post("/:id/request-cancel", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    // Only allow cancel if not shipped or delivered
    if (["shipped", "delivered", "cancelled"].includes(order.status))
      return res.status(400).json({ message: "Order cannot be cancelled at this stage" });

    order.cancelRequest = {
      requested: true,
      reason: req.body.reason || "No reason provided",
      requestedAt: new Date(),
    };

    await order.save();
    res.json({ message: "Cancel request submitted", order });
  } catch (error) {
    console.error("❌ Cancel request error:", error.message);
    res.status(500).json({ message: "Failed to request cancel" });
  }
});


// ============================================================
// 🟢 Request Return Order (User)
// ============================================================
router.post("/:id/request-return", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    // Only allow return if delivered
    if (order.status !== "delivered")
      return res.status(400).json({ message: "Order not yet delivered" });

    order.returnRequest = {
      requested: true,
      reason: req.body.reason || "No reason provided",
      requestedAt: new Date(),
      status: "pending",
    };

    await order.save();
    res.json({ message: "Return request submitted", order });
  } catch (error) {
    console.error("❌ Return request error:", error.message);
    res.status(500).json({ message: "Failed to request return" });
  }
});


// ============================================================
// 🔵 Admin: Approve or Reject Return
// ============================================================
router.put("/:id/handle-return", protect, admin, async (req, res) => {
  try {
    const { action } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.returnRequest?.requested)
      return res.status(400).json({ message: "No return request to handle" });

if (action === "approve") {
  order.returnRequest.status = "approved";
  order.status = "refunded";

  // 💰 Refund to wallet
  if (order.isPaid) {
    const user = await User.findById(order.user);
    if (user) {
      await user.addWalletCredit(order.totalPrice, `Refund for returned order ${order._id}`);
    }
  }
}
 else if (action === "reject") {
      order.returnRequest.status = "rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    order.returnRequest.handledAt = new Date();
    await order.save();

    res.json({ message: `Return ${action}d`, order });
  } catch (error) {
    console.error("❌ Handle return error:", error.message);
    res.status(500).json({ message: "Failed to handle return" });
  }
});


// ============================================================
// 🔴 Admin: Approve Cancel Request
// ============================================================
router.put("/:id/approve-cancel", protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.cancelRequest?.requested)
      return res.status(400).json({ message: "No cancel request to approve" });

order.status = "cancelled";
order.cancelRequest.handled = true;
order.cancelRequest.handledAt = new Date();

// 💰 Credit wallet refund if paid
if (order.isPaid) {
  const user = await User.findById(order.user);
  if (user) {
    try {
    await user.addWalletCredit(order.totalPrice, `Refund for cancelled order ${order._id}`);
       } catch (walletErr) {
     console.error("⚠️ Wallet credit failed:", walletErr.message);
   }
  }
}


    await order.save();
    res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.error("❌ Approve cancel error:", error.message);
    res.status(500).json({ message: "Failed to approve cancel request" });
  }
});


// ============================================================
// 🟢 Revert Cancel Request (User changed mind)
// ============================================================
router.post("/:id/revert-cancel", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ Only the order owner can revert
    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    // ❌ Cannot revert if order already cancelled or delivered
    if (["cancelled", "delivered"].includes(order.status))
      return res.status(400).json({ message: "Order cannot be continued at this stage" });

    // ❌ No cancel request to revert
    if (!order.cancelRequest?.requested)
      return res.status(400).json({ message: "No cancel request to revert" });

    // ✅ Clear the cancel request
order.cancelRequest = {
  requested: false,
  reason: "",
  requestedAt: null,
  handled: false,
  handledAt: null,
  revertedAt: new Date(), // ✅ record when user continued
};

    await order.save();
    res.json({ message: "Cancel request withdrawn. Order will continue.", order });
  } catch (error) {
    console.error("❌ Revert cancel error:", error.message);
    res.status(500).json({ message: "Failed to revert cancel request" });
  }
});


module.exports = router;

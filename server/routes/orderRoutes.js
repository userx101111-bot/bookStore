const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');

// ============================================================
// 📦 Create New Order (Cash on Delivery or PayPal)
// ============================================================
router.post('/', protect, async (req, res) => {
  try {
    const {
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
    } = req.body;

    // ✅ Validation — make sure orderItems exist
    if (!orderItems || !orderItems.length) {
      return res.status(400).json({ message: "No order items provided" });
    }

    // ✅ Validation — check each item for required fields
    orderItems.forEach((item) => {
      if (!item.product || !item.name || !item.qty) {
        throw new Error("Order item missing required fields");
      }
    });

    // ✅ Create the order object
    const order = new Order({
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid: isPaid || false,
      paidAt: paidAt || null,
      paymentResult: paymentResult || {},
      status: isPaid ? "processing" : "pending",
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("❌ Create order error:", error.message);
    res.status(500).json({ message: "Failed to create order", error: error.message });
  }
});


// ============================================================
// 📜 Get Logged-In User’s Orders
// ============================================================
router.get('/myorders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('❌ Get my orders error:', error.message);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
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

module.exports = router;

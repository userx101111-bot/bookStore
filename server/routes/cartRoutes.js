//server/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Add items to cart (create/update cart)
// @route   POST /api/cart
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No cart items provided' });
    }

    // Check if user already has a cart (an order with status 'cart')
    let cart = await Order.findOne({
      user: req.user._id,
      status: 'cart'
    });

    // If no cart exists, create a new one
    if (!cart) {
      cart = new Order({
        user: req.user._id,
        orderItems: [],
        status: 'cart',
        shippingAddress: {},
        paymentMethod: '',
        totalPrice: 0
      });
    }

    // Update cart items
    cart.orderItems = [];
    let totalPrice = 0;
    
    // Process each item and add to cart
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({ 
          message: `Product not found with ID: ${item.productId}` 
        });
      }
      
      cart.orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        qty: item.quantity
      });
      
      totalPrice += product.price * item.quantity;
    }
    
    cart.totalPrice = totalPrice;
    await cart.save();
    
    res.status(200).json(cart);
  } catch (error) {
    console.error('Cart update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Order.findOne({
      user: req.user._id,
      status: 'cart'
    }).populate('orderItems.product');
    
    if (!cart) {
      return res.status(200).json({ orderItems: [], totalPrice: 0 });
    }
    
    res.status(200).json(cart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private
router.delete('/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Order.findOne({
      user: req.user._id,
      status: 'cart'
    });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Remove item from cart
    cart.orderItems = cart.orderItems.filter(
      item => item.product.toString() !== productId
    );
    
    // Recalculate total price
    cart.totalPrice = cart.orderItems.reduce(
      (total, item) => total + (item.price * item.qty), 0
    );
    
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:productId
// @access  Private
router.put('/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }
    
    const cart = await Order.findOne({
      user: req.user._id,
      status: 'cart'
    });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Find and update item
    const itemIndex = cart.orderItems.findIndex(
      item => item.product.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not in cart' });
    }
    
    // Update quantity
    cart.orderItems[itemIndex].qty = quantity;
    
    // Recalculate total price
    cart.totalPrice = cart.orderItems.reduce(
      (total, item) => total + (item.price * item.qty), 0
    );
    
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============================================================
// VERIFY RESET CODE (check code only)
// ============================================================
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code required" });

    const record = await EmailVerification.findOne({ email });
    if (!record) return res.status(400).json({ message: "No reset code found (or expired)." });

    // if you store expiresAt, check it:
    if (record.expiresAt && record.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ email });
      return res.status(400).json({ message: "Reset code expired." });
    }

    if (record.code !== code) return res.status(400).json({ message: "Invalid reset code." });

    // Optionally keep the record so reset-password can still use it, or mark as verified.
    return res.json({ success: true, message: "Code verified." });
  } catch (err) {
    console.error("Verify reset code error:", err);
    res.status(500).json({ message: "Failed to verify code." });
  }
});
module.exports = router;

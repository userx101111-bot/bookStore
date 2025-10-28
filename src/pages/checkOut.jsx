import React, { useState, useEffect } from 'react';
import { FaShoppingCart, FaHeart, FaCog, FaCreditCard, FaMapMarkerAlt, FaPencilAlt } from 'react-icons/fa';
import { MdKeyboardArrowRight } from 'react-icons/md';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './checkOut.css';
import { useCart } from '../contexts/CartContext';
//const RENDER_URL = process.env.REACT_APP_RENDER_URL;


const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { clearCart } = useCart();
  
  useEffect(() => {
    // Get cart items from location state (passed when navigating from Cart.jsx)
    if (location.state && location.state.cartItems) {
      setCartItems(location.state.cartItems);
    } else {
      // Fallback to localStorage if items not passed via location
      const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(storedCart);
    }
    
    // Get user data from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
    }
  }, [location]);

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const shipping = 100;
  const merchandiseSubTotal = totalAmount;
  const shippingSubTotal = shipping;
  const totalPayment = merchandiseSubTotal + shippingSubTotal;

  const handleCheckout = async () => {
    if (!user || !user.token) {
      alert('Please log in to complete your purchase.');
      navigate('/login');
      return;
    }

    if (!user.address || !user.address.addressLine1) {
      alert('Please add your shipping address before checking out.');
      navigate('/address');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty. Please add items before checking out.');
      navigate('/products');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Structure the order data to match your backend schema requirements
      const orderData = {
        userId: user._id || user.id, // Explicitly include userId as required by backend
        products: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: item.price
        })),
        shippingAddress: {
          street: user.address.addressLine1 || '',
          city: user.address.city || '',
          state: user.address.state || user.address.province || '', // Changed from province to state
          postalCode: user.address.zip || user.address.postalCode || ''
        },
        paymentMethod: 'cash on delivery',
        totalAmount: totalPayment,
        status: 'pending'
      };

      console.log("Order data being sent:", JSON.stringify(orderData, null, 2));

      // Make API request with authorization header
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      const response = await axios.post(`https://bookstore-yl7q.onrender.com/api/orders`, orderData, config);

      if (response.data) {
        // Clear cart from localStorage
        localStorage.removeItem('cart');
        
        // Also clear cart state in context
        clearCart();
        
        // Navigate to success page
        navigate('/order-success', { 
          state: { 
            orderId: response.data._id,
            orderTotal: totalPayment
          } 
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      
      // More detailed error information for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      
      setError(
        error.response?.data?.message || 
        'Failed to process your order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="subcontainer">
        <h2 className="title">CHECKOUT</h2>

        <table className="table">
          <thead>
            <tr>
              <th className="th"></th>
              <th className="th">Product</th>
              <th className="th">Quantity</th>
              <th className="th">Total</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.length > 0 ? (
              cartItems.map(item => (
                <tr key={item.id} className="tr">
                  <td className="tdimage">
                    <div className="productRow">
                      <img src={item.image} alt={item.name} className="image" />
                    </div>
                  </td>
                  <td className="tdnameprice">
                    <div>
                      <strong>{item.name}</strong>
                      <p>Price: ₱{item.price.toFixed(2)}</p>
                    </div>
                  </td>
                  <td className="td">
                    <span><span>x</span>{item.quantity}</span>
                  </td>
                  <td className="td">₱{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>
                  No items in cart. Please add items before checking out.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="detailsContainer">
          <div className="personalDetails">
            <h3>Personal Details</h3>
            <div className="subpersonalDetails">
              <p>
                {user ? 
                  <>
                    <strong>Name:</strong> {user.firstName} {user.lastName}<br/>
                    <strong>Phone:</strong> {user.phone || user.address?.telephone || 'No phone'}<br/>
                    <strong>Address:</strong> {
                      user.address 
                        ? `${user.address.addressLine1}, ${user.address.city}, ${user.address.state || user.address.province}` 
                        : 'No address provided'
                    }<br/>
                    <strong>Registered:</strong> {
                      user.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString() 
                        : 'Not available'
                    }
                  </> 
                  : 'Please log in to complete your purchase.'
                }
              </p>
              <div className="arrowWrapper">
                <Link to="/address" className="arrowButton">
                  <MdKeyboardArrowRight size={24} />
                </Link>
              </div>
            </div>
          </div>

          <div className="paymentDetails">
            <h3>Payment Details</h3>

            <div className="paymentDetailRow">
              <span>Total Quantity:</span>
              <span>{totalQuantity} item(s)</span>
            </div>
            <div className="paymentDetailRow">
              <span>Merchandise Subtotal:</span>
              <span>₱{merchandiseSubTotal.toFixed(2)}</span>
            </div>
            <div className="paymentDetailRow">
              <span>Shipping Subtotal:</span>
              <span>₱{shippingSubTotal.toFixed(2)}</span>
            </div>
            <div className="paymentDetailRow">
              <strong>Estimated Total Payment:</strong>
              <strong>₱{totalPayment.toFixed(2)}</strong>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="footer">
              <button 
                onClick={handleCheckout} 
                className="checkout" 
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

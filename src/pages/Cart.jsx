//cart.jsx
import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { FaShoppingBag } from 'react-icons/fa';
import './Cart.css';
import { useCart } from '../contexts/CartContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity } = useCart();
  
  // When calculating checkedItems initially
const [checkedItems, setCheckedItems] = useState(
  cart.reduce((acc, item) => {
    acc[item.id] = true; // ensure `item.id` matches the mapped backend productId
    return acc;
  }, {})
);
  useEffect(() => {
    setCheckedItems(prev => {
      const updated = {...prev};
      cart.forEach(item => {
        if (updated[item.id] === undefined) {
          updated[item.id] = true;
        }
      });
      return updated;
    });
  }, [cart]);

  const handleCheckout = () => {
    const itemsToCheckout = cart.filter(item => checkedItems[item.id]);
    navigate('/checkout', { state: { cartItems: itemsToCheckout } });
  };
  
  const toggleCheck = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalAmount = cart.reduce(
    (sum, item) => (checkedItems[item.id] ? sum + item.price * item.quantity : sum),
    0
  );

  return (
    <div className="container">
        <div className="subcontainer">
            <h2 className="title">YOUR CART</h2>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Your cart is empty.</p>
                <Link to="/home-page">
                  <button className="continue-shopping">
                    <FaShoppingBag style={{ marginRight: '10px' }} /> Continue Shopping
                  </button>
                </Link>
              </div>
            ) : (
              <>
                <table className="table">
                    <thead>
                        <tr>
                            <th className="th"></th> {/* Checkbox */}
                            <th className="th"></th> {/* Image */}
                            <th className="th">Product</th>
                            <th className="th">Quantity</th>
                            <th className="th">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map(item => (
                            <tr key={item.id} className="tr">
                                <td className="tdcheckbox">
                                    <div className="productRow">
                                        <input
                                            type="checkbox"
                                            checked={checkedItems[item.id] || false}
                                            onChange={() => toggleCheck(item.id)}
                                            className="checkbox"
                                        />
                                    </div>
                                </td>
                                <td className="td">
                                    <div className="productRow">
                                        <img src={item.image} alt={item.name} className="image" />
                                    </div>
                                </td>
                                <td className="td">
                                    <div>
                                        <strong>{item.name}</strong>
                                        <p>Price: ₱{item.price.toFixed(2)}</p>
                                    </div>
                                </td>
                                <td className="td">
                                    <div className="quantityControl">
                                        <button
                                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                          className="qtyBtn"
                                        >
                                          −
                                        </button>
                                        <span className="qtyValue">{item.quantity}</span>
                                        <button
                                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                          className="qtyBtn"
                                        >
                                          ＋
                                        </button>
                                    </div>
                                </td>
                                <td className="td">₱{(item.price * item.quantity).toFixed(2)}</td>
                                <td>
                                    <button onClick={() => removeFromCart(item.id)} className="remove-btn">✕</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="footer">
                    <p className="total">Estimated Total: ₱{totalAmount.toFixed(2)}</p>
                    <button 
                        onClick={handleCheckout} 
                        className="checkout">
                        Checkout
                    </button>
                </div>
              </>
            )}
        </div>

        {/* Space for footer */}
            <div style={{ height: "450px" }}></div>
    </div>
  );
};

export default Cart;

import React, { useState } from 'react';
import { FaShoppingCart, FaHeart, FaUser, FaCog, FaCreditCard, FaMapMarkerAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './profile.css'; // Ensure this path is correct
import { useUser } from '../contexts/UserContext';

const Payment = () => {
  const { user } = useUser();
  const [methods, setMethods] = useState([
  ]);

  const [newCard, setNewCard] = useState({
    type: '', // Must initialize type here!
    fullName: '',
    email: '',
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    zipCode: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewCard({ ...newCard, [name]: value });
  };

  const handleAddCard = (e) => {
    e.preventDefault();

    // Create a formatted number string.  Replace this with your actual formatting logic!
    const formattedCardNumber = `**** **** **** ${newCard.cardNumber.slice(-4)}`;

    // Create new method object with consistent properties
    const newMethod = { 
        id: Date.now(), 
        type: newCard.type, 
        number: formattedCardNumber, 
        owner: newCard.fullName // Or derive owner as needed
    };

    setMethods([...methods, newMethod]);
    setNewCard({ // Reset newCard
        type: '', // Reset type too
        fullName: '',
        email: '',
        cardNumber: '',
        expMonth: '',
        expYear: '',
        cvv: '',
        zipCode: ''
    });
  };


  return (
    <div className="app">

      <div className="profile-main">
        <aside className="sidebar">
          <div className="profile-info">
            <div className="avatar-placeholder">👤</div>
            <h2>{user ? (user.firstName || user.name || 'Guest') : 'Guest'}</h2>
          </div>
          <nav className="menu-list">
                  <Link to="/profile" className="menu-item"><FaUser /> Profile</Link>
                  <Link to="/settings" className="menu-item"><FaCog /> Settings</Link>
                   <Link to="/payments" className="menu-item"><FaCreditCard /> Payments</Link>
                  <Link to="/address" className="menu-item active"><FaMapMarkerAlt /> Address</Link>
          </nav>
        </aside>

        <div className="main-content">
          <h2>Payment Methods</h2>

          <div className="payment-methods">
            {methods.map(method => (
              <div key={method.id} className="method-item">
                <span>{method.type} - {method.number} ({method.owner})</span>
                <button onClick={() => setMethods(methods.filter(m => m.id !== method.id))}>Remove</button>
              </div>
            ))}
          </div>

          <h3>Add New Payment Method</h3>
          <form className="payment-form" onSubmit={handleAddCard}>
            <div className="form-group">
                <label htmlFor="type">Card Type:</label>
                <select 
                      id="type" 
                      name="type" 
                      value={newCard.type} 
                      onChange={handleChange} 
                      required
                >
                    <option value="">Select Card Type</option> {/* Default Empty Option */}
                    <option value="Visa">Visa</option>
                    <option value="MasterCard">MasterCard</option>
                    <option value="American Express">American Express</option>
                </select>
            </div>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input type="text" id="fullName" name="fullName" value={newCard.fullName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={newCard.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number</label>
              <input type="text" id="cardNumber" name="cardNumber" value={newCard.cardNumber} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="expMonth">Exp Month (MM)</label>
              <input type="text" id="expMonth" name="expMonth" value={newCard.expMonth} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="expYear">Exp Year (YYYY)</label>
              <input type="text" id="expYear" name="expYear" value={newCard.expYear} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="cvv">CVV</label>
              <input type="text" id="cvv" name="cvv" value={newCard.cvv} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="zipCode">Zip Code</label>
              <input type="text" id="zipCode" name="zipCode" value={newCard.zipCode} onChange={handleChange} required />
            </div>
            <button type="submit" className="add-card-button">Add Card</button>
          </form>
        </div>
      </div>

      {/* Space for footer */}
            <div style={{ height: "150px" }}></div>
    </div>
  );
};

export default Payment;

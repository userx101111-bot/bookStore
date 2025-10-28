import React, { useState, useEffect } from 'react';
import { FaHeart, FaCog,FaUser, FaCreditCard, FaMapMarkerAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './profile.css';
import { useUser } from '../contexts/UserContext';
//const RENDER_URL = process.env.REACT_APP_RENDER_URL;

const Address = () => {
    const { user, updateUser, setUser } = useUser();
    const [formData, setFormData] = useState({
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        telephone: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [savedAddress, setSavedAddress] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!isInitialized) {
            console.log("Initializing form data...");
            
            // First check localStorage
            const storedUser = JSON.parse(localStorage.getItem('user'));
            console.log("Stored user from localStorage:", storedUser);
      
            if (storedUser && storedUser.address && Object.keys(storedUser.address).length > 0) {
                setUser(storedUser);
                setFormData({ ...storedUser.address });
                setSavedAddress({ ...storedUser.address });
            } else if (user && user.address && Object.keys(user.address).length > 0) {
                setFormData({ ...user.address });
                setSavedAddress({ ...user.address });
            } else {
                // If no address in localStorage or current user state, fetch from API
                fetchUserAddress();
            }
            
            setIsInitialized(true);
        }
    }, [isInitialized, user, setUser]);

    // Add this new function to fetch address from the backend
    const fetchUserAddress = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log("No token found, skipping address fetch");
                return;
            }

            setIsLoading(true);
            const response = await fetch(`https://bookstore-yl7q.onrender.com/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error fetching user profile: ${response.status}`);
            }
            
            const userData = await response.json();
            console.log("User profile data from API:", userData);
            
            if (userData.address && Object.keys(userData.address).length > 0) {
                // Update local state with address from backend
                setFormData({ ...userData.address });
                setSavedAddress({ ...userData.address });
                
                // Update user context and localStorage to include address
                const updatedUser = { ...user, address: userData.address };
                updateUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                setMessage({ text: 'Address loaded from database', type: 'success' });
            }
        } catch (error) {
            console.error("Error fetching user address:", error);
            setMessage({ text: 'Could not load address from database', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log(`Updating ${name} to: ${value}`);
        
        // Use the function form of setState to ensure you're working with the latest state
        setFormData(prevData => {
            const newData = { ...prevData, [name]: value };
            console.log("New form data:", newData);
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // First, update the address in the backend
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('You must be logged in to update your address');
            }

            console.log("Sending update to:", `https://bookstore-yl7q.onrender.com/api/users/update-address`);
            console.log("With payload:", {
                userId: user._id,
                address: formData
            });

            const response = await fetch(`https://bookstore-yl7q.onrender.com/api/users/update-address`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user._id,
                    address: formData
                })
            });

            // Check if the response is OK before trying to parse JSON
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
                } else {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
            }
            
            const data = await response.json();
            
            // If backend update was successful, update local state and storage
            const updatedUser = { ...user, address: formData };
            updateUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setSavedAddress({ ...formData });
            
            setMessage({ text: 'Address updated successfully!', type: 'success' });
        } catch (error) {
            console.error("Error updating address:", error);
            setMessage({ text: error.message || 'Failed to update address. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="app" style={{ minHeight: "100vh" }}>
            <div className="profile-main" style={{ minHeight: "calc(100vh - 150px)", paddingBottom: "50px" }}>
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

                <div className="main-content" style={{ minHeight: "calc(100vh - 200px)" }}>
                    <div className="address-section">
                        <h2>Shipping Address</h2>
                        
                        {message.text && (
                            <div className={`message ${message.type}`}>
                                {message.text}
                            </div>
                        )}
                        
                        {/* Display the current saved address */}
                        {savedAddress && (
                            <div className="saved-address">
                                <h3>Current Address</h3>
                                <p>{savedAddress.addressLine1}</p>
                                {savedAddress.addressLine2 && <p>{savedAddress.addressLine2}</p>}
                                <p>{savedAddress.city}, {savedAddress.state} {savedAddress.zip}</p>
                                <p>{savedAddress.country}</p>
                                {savedAddress.telephone && <p>Phone: {savedAddress.telephone}</p>}
                            </div>
                        )}
                        
                        <form onSubmit={handleSubmit} className="address-form">
                            <div className="form-group">
                                <label htmlFor="addressLine1">Address Line 1 *</label>
                                <input type="text" id="addressLine1" name="addressLine1" required value={formData.addressLine1 || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="addressLine2">Address Line 2</label>
                                <input type="text" id="addressLine2" name="addressLine2" value={formData.addressLine2 || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="city">City *</label>
                                <input type="text" id="city" name="city" required value={formData.city || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="state">State/Province *</label>
                                <select id="state" name="state" required value={formData.state || ''} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Metro Manila">Metro Manila</option>
                                    <option value="Cebu">Cebu</option>
                                    <option value="Davao">Davao</option>
                                    <option value="Rizal">Rizal</option>
                                    <option value="Bulacan">Bulacan</option>
                                    <option value="Laguna">Laguna</option>
                                    <option value="Cavite">Cavite</option>
                                    <option value="Pampanga">Pampanga</option>
                                    <option value="Batangas">Batangas</option>
                                    <option value="Iloilo">Iloilo</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="zip">Zip/Postal Code *</label>
                                <input type="text" id="zip" name="zip" required value={formData.zip || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="country">Country *</label>
                                <select id="country" name="country" required value={formData.country || ''} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Philippines">Philippines</option>
                                    <option value="Japan">Japan</option>
                                    <option value="United States">United States</option>
                                    <option value="South Korea">South Korea</option>
                                    <option value="China">China</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="telephone">Telephone *</label>
                                <input type="text" id="telephone" name="telephone" required value={formData.telephone || ''} onChange={handleChange} />
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="submit" 
                                    className="save-button" 
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Saving...' : 'Save Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
           {/* Space for footer */}
            <div style={{ height: "150px" }}></div>
        </div>
    );
};

export default Address;
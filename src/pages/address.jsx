import React, { useState, useEffect, useRef } from "react";
import {
  FaUser,
  FaCog,
  FaCreditCard,
  FaMapMarkerAlt,
  FaCrosshairs,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./address.css";
import { useUser } from "../contexts/UserContext";
import LogoutButton from "../components/LogoutButton";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// 🧭 Reverse geocode
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    );
    const data = await res.json();
    const a = data.address || {};
    const street = [a.road, a.residential, a.subdivision].filter(Boolean).join(" ") || "";
    const barangay =
      a.suburb || a.neighbourhood || a.village || a.hamlet || a.quarter || a.borough || a.city_district || "";
    const city = a.city || a.municipality || a.town || a.village || a.county || "";
    const region = a.state || a.region || a.state_district || a.province || "";
    const zip = a.postcode || "";
    const country = a.country || "Philippines";
    return { street, barangay, city, region, zip, country, house_number: a.house_number || "" };
  } catch {
    return {};
  }
};

// 🗺️ Forward geocode
const forwardGeocode = async (addressString) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}`
    );
    const data = await res.json();
    if (data?.length > 0) {
      const { lat, lon } = data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
    return null;
  } catch {
    return null;
  }
};

function RecenterMap({ lat, lng }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

function DraggableMarker({ formData, setFormData }) {
  const [position, setPosition] = useState(
    formData.lat && formData.lng ? [formData.lat, formData.lng] : [14.5995, 120.9842]
  );
  const [popupText, setPopupText] = useState("");

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      const address = await reverseGeocode(lat, lng);
      setFormData((p) => ({ ...p, lat, lng, ...address, houseNumber: p.houseNumber || address.house_number || "" }));
      setPopupText(`${address.street || ""}, ${address.barangay || ""}, ${address.city || ""}`);
    },
  });

  const handleDragEnd = async (e) => {
    const lat = e.target.getLatLng().lat;
    const lng = e.target.getLatLng().lng;
    setPosition([lat, lng]);
    const address = await reverseGeocode(lat, lng);
    setFormData((p) => ({ ...p, lat, lng, ...address, houseNumber: p.houseNumber || address.house_number || "" }));
    setPopupText(`${address.street || ""}, ${address.barangay || ""}, ${address.city || ""}`);
  };

  useEffect(() => {
    if (formData.lat && formData.lng) setPosition([formData.lat, formData.lng]);
  }, [formData.lat, formData.lng]);

  return (
    <Marker position={position} draggable icon={markerIcon} eventHandlers={{ dragend: handleDragEnd }}>
      {popupText && <Popup>{popupText}</Popup>}
    </Marker>
  );
}

const Address = () => {
  const { user, updateUser } = useUser();
  const [formData, setFormData] = useState({
    houseNumber: "",
    street: "",
    barangay: "",
    city: "",
    region: "",
    zip: "",
    country: "Philippines",
    lat: null,
    lng: null,
  });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const shippingRef = useRef(null);
  let typingTimeout;

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.address) {
      setFormData(storedUser.address);
      setSavedAddress(storedUser.address);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    clearTimeout(typingTimeout);
    if (["street", "barangay", "city", "region"].includes(name)) {
      typingTimeout = setTimeout(async () => {
        const addressString = [
          formData.houseNumber,
          name === "street" ? value : formData.street,
          name === "barangay" ? value : formData.barangay,
          name === "city" ? value : formData.city,
          name === "region" ? value : formData.region,
          "Philippines",
        ]
          .filter(Boolean)
          .join(", ");
        const coords = await forwardGeocode(addressString);
        if (coords) setFormData((p) => ({ ...p, lat: coords.lat, lng: coords.lng }));
      }, 800);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        setFormData((p) => ({
          ...p,
          lat,
          lng,
          ...address,
          houseNumber: p.houseNumber || address.house_number || "",
        }));
        setIsLoading(false);
      },
      () => {
        setMessage({ text: "Unable to detect location.", type: "error" });
        setIsLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`https://bookstore-yl7q.onrender.com/api/users/update-address`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: formData }),
      });
      if (!res.ok) throw new Error("Failed to update address");
      const updatedData = await res.json();
      updateUser(updatedData);
      const updatedUser = { ...user, address: formData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSavedAddress(formData);
      setShowForm(false);
      setTimeout(() => {
        shippingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      setMessage({ text: "✅ Address updated successfully!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app" style={{ minHeight: "100vh", paddingBottom: "80px" }}>
      <div className="profile-main" style={{ minHeight: "calc(100vh - 150px)" }}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="profile-info">
            <div className="avatar-placeholder">👤</div>
            <h2>{user?.firstName || user?.name || "Guest"}</h2>
          </div>
          <nav className="menu-list">
            <LogoutButton />
            <Link to="/profile" className="menu-item"><FaUser /> Profile</Link>
                        <Link to="/my-purchases" className="menu-item">
                          <FaCreditCard /> My Purchases
                        </Link>
            <Link to="/wallet" className="menu-item">
              <FaCreditCard /> My Wallet
            </Link>
            <Link to="/address" className="menu-item active"><FaMapMarkerAlt /> Address</Link>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="main-content modern-ui">
          <div className="address-card">
            <div className="address-header" ref={shippingRef}>
              <h2>Shipping Address</h2>
              <p className="subtitle">Manage your delivery details and set your preferred location.</p>
            </div>

            {message && <div className={`alert ${message.type}`}><span>{message.text}</span></div>}

            {savedAddress && savedAddress.street && (
              <div className="saved-address modern-card">
                <h3>Current Address</h3>
                <p>{savedAddress.houseNumber ? `${savedAddress.houseNumber} ` : ""}{savedAddress.street}</p>
                <p>{savedAddress.barangay}, {savedAddress.city}, {savedAddress.region} {savedAddress.zip}</p>
                <p>{savedAddress.country}</p>
              </div>
            )}

            {/* Toggle button */}
            <button
              className="save-btn"
              type="button"
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                  setTimeout(() => {
                    shippingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 300);
                } else setShowForm(true);
              }}
            >
              {showForm ? "Cancel" : savedAddress && savedAddress.street ? "Update Address" : "Add Address"}
            </button>

            {/* Two-column form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="address-form-grid fadeIn">
                <div className="form-left">
                  <div className="form-row">
                    <div className="form-group">
                      <label>House Number *</label>
                      <input name="houseNumber" value={formData.houseNumber} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>Street / Subdivision *</label>
                      <input name="street" value={formData.street} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Barangay *</label>
                      <input name="barangay" value={formData.barangay} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>City / Municipality *</label>
                      <input name="city" value={formData.city} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Region / Province *</label>
                      <input name="region" value={formData.region} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label>Postal / ZIP Code *</label>
                      <input name="zip" value={formData.zip} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Country *</label>
                    <input name="country" value={formData.country} onChange={handleChange} required />
                  </div>

                  <div className="form-actions">
                    <button className="save-btn" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </div>

                <div className="form-right">
                  <div className="map-header">
                    <h4>📍 Pin Your Location</h4>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLoading}
                      className="detect-btn"
                    >
                      <FaCrosshairs /> {isLoading ? "Detecting..." : "Use My Location"}
                    </button>
                  </div>
                  <div className="map-container">
                    <MapContainer
                      center={[formData.lat || 14.5995, formData.lng || 120.9842]}
                      zoom={15}
                      style={{ height: "400px", width: "100%", borderRadius: "12px" }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <RecenterMap lat={formData.lat} lng={formData.lng} />
                      <DraggableMarker formData={formData} setFormData={setFormData} />
                    </MapContainer>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Address;

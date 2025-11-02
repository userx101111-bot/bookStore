//src/components/LodingSpinner.jsx

import React from 'react';
import './LoadingSpinner.css'; // Make sure to create a corresponding CSS file for styles

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading products...</p>
  </div>
);

export default LoadingSpinner;

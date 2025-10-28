//src/components/PriceSorting.jsx
import React from 'react';
import './PriceSorting.css';

const PriceSorting = ({ sortOption, onSortChange }) => {
  return (
    <div className="sorting-sidebar">
      <div className="sorting-title">Sort by Price</div>
      <div className="sorting-buttons">
        <button 
          className={`sort-button ${sortOption === 'default' ? 'active' : ''}`}
          onClick={() => onSortChange('default')}
        >
          Default
        </button>
        <button 
          className={`sort-button ${sortOption === 'price-low-to-high' ? 'active' : ''}`}
          onClick={() => onSortChange('price-low-to-high')}
        >
          Low to High
        </button>
        <button 
          className={`sort-button ${sortOption === 'price-high-to-low' ? 'active' : ''}`}
          onClick={() => onSortChange('price-high-to-low')}
        >
          High to Low
        </button>
      </div>
    </div>
  );
};

export default PriceSorting;

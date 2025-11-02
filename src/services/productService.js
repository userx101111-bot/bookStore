// src/services/productService.js
const API_URL = 'https://bookstore-yl7q.onrender.com'; // Adjust if needed

export const fetchProductsByCategory = async (category) => {
  try {
    const response = await fetch(`${API_URL}/api/products/category/${category}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in fetchProductsByCategory:', error);
    throw error;
  }
};

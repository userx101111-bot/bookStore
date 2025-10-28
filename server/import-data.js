//server/import-data.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const productData = require('../src/data/productData').products; // Adjust path as needed

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

//Function to import data
const importData = async () => {
  try {
    // Clear existing products
    await Product.deleteMany({});
    
    // Import new products
    await Product.insertMany(productData);
    
    console.log('Data imported successfully');
    process.exit();
  } catch (error) {
    console.error('Import error:', error);
    process.exit(1);
  }
};

importData();

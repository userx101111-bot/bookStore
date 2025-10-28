// updateSlugs.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./server/models/Product'); // adjust path if needed

dotenv.config();

// Debug: check if MONGODB_URI is loaded
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Helper function to generate slug
const generateSlug = (name, volumeNumber) => {
  if (!name) return '';

  // sanitize the name: lowercase, remove special chars, replace spaces with -
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special characters
    .replace(/\s+/g, '-')     // replace spaces with dash
    .replace(/--+/g, '-');    // replace multiple dashes with single dash

  if (volumeNumber !== undefined && volumeNumber !== null && volumeNumber !== '') {
    base += `-vol-${volumeNumber}`;
  }

  return base;
};

const updateSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const products = await Product.find({});
    console.log(`Found ${products.length} products`);

    for (const product of products) {
      const newSlug = generateSlug(product.name, product.volumeNumber);
      
      // Only update if slug is missing or empty
      if (!product.slug || product.slug.trim() === '') {
        product.slug = newSlug;
        await product.save();
        console.log(`Updated slug for "${product.name}" -> ${newSlug}`);
      }
    }

    console.log('All products updated successfully');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error updating products:', err);
    process.exit(1);
  }
};

updateSlugs();

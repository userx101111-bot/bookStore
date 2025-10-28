//server/seed.js
const mongoose = require('mongoose');
const Product = require('./models/Product');
const productData = require('./data/products');

const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookstore';

const generateSlug = (name, volumeNumber) => {
  if (!name) return '';
  let base = name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
  if (volumeNumber) base += `-vol-${volumeNumber}`;
  return base;
};
//com
mongoose.connect(DB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await Product.deleteMany({});
    const allProducts = [];

    for (const category in productData) {
      productData[category].forEach(product => {
        const { id, ...rest } = product;
        allProducts.push({
          ...rest,
          slug: generateSlug(rest.name, rest.volumeNumber)
        });
      });
    }

    await Product.insertMany(allProducts);
    console.log('Database seeded!');
    process.exit();
  })
  .catch(err => console.error(err));

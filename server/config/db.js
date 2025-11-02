// server/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ✅ Use your environment variable name (MONGODB_URI)
    // and fall back to a local/dev URI if not defined
    const mongoURI =
      process.env.MONGODB_URI ||
      'mongodb+srv://dbUs3r:SN8DdNQvyCnXXJf2@cluster.sfo5yxw.mongodb.net/bookStore';

    if (!mongoURI) {
      throw new Error('❌ MongoDB connection string missing (MONGODB_URI not set)');
    }

    // ✅ Modern connection options for stability (Mongoose v7+ handles parsing automatically)
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true,      // helpful in dev for schema indexes
      serverSelectionTimeoutMS: 5000, // avoid hanging connections
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // stop server if DB connection fails
  }
};

module.exports = connectDB;

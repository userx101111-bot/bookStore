// cleanup-orders.js
import mongoose from "mongoose";

const uri = "mongodb+srv://dbUs3r:SN8DdNQvyCnXXJf2@cluster.sfo5yxw.mongodb.net/bookStore";

async function cleanup() {
  try {
    console.log("🧹 Connecting to MongoDB...");
    await mongoose.connect(uri);

    const result = await mongoose.connection.db
      .collection("orders")
      .deleteMany({ user: null });

    console.log(`✅ Deleted ${result.deletedCount} orphaned orders`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Error cleaning up orders:", err);
  }
}

cleanup();

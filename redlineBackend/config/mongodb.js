import mongoose from "mongoose";

let cachedConnection = null;

const connectDB = async () => {
  // Return existing connection if already connected (for serverless)
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    mongoose.connection.on('connected', () => {
      console.log("✅ DB connected");
    });

    mongoose.connection.on('error', (err) => {
      console.error("❌ DB connection error:", err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log("⚠️ DB disconnected");
    });

    // Optimized for serverless (Vercel, Lambda, etc.)
    if (mongoose.connection.readyState === 0) {
      const conn = await mongoose.connect(`${process.env.MONGODB_URI}/greenvalley`, {
        serverSelectionTimeoutMS: 60000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        family: 4,
        retryWrites: true,
        w: 'majority',
        maxPoolSize: 10,
        minPoolSize: 1,
      });
      cachedConnection = conn;
      return conn;
    }
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    console.log("⚠️ Server will run without database - using localStorage for sample products");
  }
};

export default connectDB;
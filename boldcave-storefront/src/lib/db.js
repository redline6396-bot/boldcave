import mongoose from "mongoose";

const globalCache = globalThis.__mongooseConnection || {
  conn: null,
  promise: null,
};

globalThis.__mongooseConnection = globalCache;

export async function connectDB() {
  if (globalCache.conn) {
    return globalCache.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => mongooseInstance);
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

export default connectDB;

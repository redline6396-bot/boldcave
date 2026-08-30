import mongoose from "mongoose";
import { getRuntimeDatabaseContext } from "@/lib/runtimeDatabaseContext";

function getGlobalCache() {
  if (!globalThis.__mongooseConnection) {
    globalThis.__mongooseConnection = {
      conn: null,
      promise: null,
    };
  }

  return globalThis.__mongooseConnection;
}

export async function connectDB() {
  const runtimeContext = getRuntimeDatabaseContext();
  if (runtimeContext?.connection) {
    return runtimeContext.connection;
  }

  if (process.env.DB_RUNTIME === "cloudflare") {
    throw new Error("Runtime database context is required");
  }

  const globalCache = getGlobalCache();
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

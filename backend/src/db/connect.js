import mongoose from "mongoose";

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 6000,
      dbName: process.env.MONGODB_DB || "slanguage",
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connect failed:", err.codeName || err.message || err);
    throw err;
  }
}

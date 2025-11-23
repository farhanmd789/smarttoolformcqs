import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const uri = process.env.MONGO_URI;
console.log("Loaded URI:", uri); // Debug log

mongoose.connect(uri)
  .then(() => console.log("✅ MongoDB connection successful"))
  .catch(err => console.error("❌ MongoDB connection failed:", err));

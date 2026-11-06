
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "node:path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI?.trim();

    if (!mongoURI) {
      throw new Error("MONGO_URI is missing in Backend/.env");
    }

    if (
      !mongoURI.startsWith("mongodb://") &&
      !mongoURI.startsWith("mongodb+srv://")
    ) {
      throw new Error("Invalid MongoDB connection string");
    }

    await mongoose.connect(mongoURI);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

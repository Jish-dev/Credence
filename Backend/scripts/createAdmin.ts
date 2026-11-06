
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Load .env from the Backend root directory
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
  path: path.resolve(currentDirectory, "../../.env"),
});

const createAdmin = async () => {
  try {
    // Check MongoDB URI
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error(
        "MONGO_URI is missing. Please check Backend/.env"
      );
    }

    // Connect MongoDB
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");

    // Admin credentials
    const email = "admin@credence.com";
    const password = "Admin@123";

    // Check existing admin
    const existingAdmin = await User.findOne({ email }).select("+password");

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingAdmin) {
      // Update existing account to admin
      existingAdmin.name = "CREDENCE Admin";
      existingAdmin.password = hashedPassword;
      existingAdmin.role = "admin";
      existingAdmin.isActive = true;

      await existingAdmin.save();

      console.log("Existing account updated as admin");
    } else {
      // Create new admin account
      await User.create({
        name: "CREDENCE Admin",
        email,
        phone: "",
        password: hashedPassword,
        role: "admin",
        isActive: true,
        profileImage: "",
      });

      console.log("Admin account created successfully");
    }

    console.log("--------------------------------");
    console.log("CREDENCE ADMIN LOGIN");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("--------------------------------");

  } catch (error) {
    console.error("Admin creation failed:", error);
    process.exitCode = 1;
  } finally {
    // Disconnect only if connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log("MongoDB disconnected");
    }
  }
};

createAdmin();

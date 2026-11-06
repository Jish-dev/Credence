
import "dotenv/config";

console.log("SERVER STARTED");
console.log("API KEY EXISTS:", !!process.env.CLOUDINARY_API_KEY);

console.log("CLOUDINARY CHECK:", {
  cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: !!process.env.CLOUDINARY_API_KEY,
  apiSecret: !!process.env.CLOUDINARY_API_SECRET,
});

import { createServer } from "node:http";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startSocketServer } from "./socket/socketServer.js";

// ========================================
// START SERVER
// ========================================

const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    console.log("MongoDB connected successfully");

    // 2. Create HTTP server
    const server = createServer(app);

    // 3. Start Socket.IO
    startSocketServer(server);

    // 4. Get port
    const PORT = Number(process.env.PORT) || 5000;

    // 5. Start listening
    server.listen(PORT, () => {
      console.log("CREDENCE BACKEND STARTED");
      console.log(`Server: http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("HTTP Server Error:", error);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`${signal} received. Closing server...`);

      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (error) {
    console.error("CREDENCE startup failed:", error);
    process.exit(1);
  }
};

// Start application
startServer();

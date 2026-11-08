
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt, { type JwtPayload } from "jsonwebtoken";
import User from "../models/User.js";

type UserRole = "customer" | "admin" | "provider";

interface TokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
}

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL?.split(",") || true,
      credentials: true,
    },
  });

  // ========================================
  // SOCKET AUTHENTICATION
  // ========================================

  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;

      if (typeof authToken !== "string" || !authToken.trim()) {
        return next(new Error("Authentication token missing"));
      }

      // Supports both raw JWT and Bearer token formats
      const token = authToken.startsWith("Bearer ")
        ? authToken.slice(7)
        : authToken;

      const secret = process.env.JWT_SECRET;

      if (!secret) {
        return next(new Error("JWT_SECRET is missing"));
      }

      const decoded = jwt.verify(token, secret);

      if (
        typeof decoded === "string" ||
        typeof decoded.id !== "string" ||
        !["customer", "admin", "provider"].includes(decoded.role as string)
      ) {
        return next(new Error("Invalid authentication token"));
      }

      const payload = decoded as TokenPayload;

      // Verify the user still exists and is active
      const user = await User.findById(payload.id).select(
        "_id role isActive providerApprovalStatus"
      );

      if (!user || !user.isActive) {
        return next(new Error("User account is unavailable"));
      }

      // Ensure the role in the database matches the JWT
      if (user.role !== payload.role) {
        return next(new Error("Invalid user role"));
      }

      // Only approved providers can connect
      if (
        payload.role === "provider" &&
        user.providerApprovalStatus !== "approved"
      ) {
        return next(new Error("Provider account is not approved"));
      }

      // Store authenticated user information on the socket
      socket.data.userId = user._id.toString();
      socket.data.role = user.role;

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Invalid or expired authentication token"));
    }
  });

  // ========================================
  // SOCKET CONNECTION
  // ========================================

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    // Automatically join the authenticated user's private room
    socket.join(`user:${userId}`);

    console.log(`Socket connected: ${userId}`);

    // ========================================
    // DISCONNECT
    // ========================================

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${userId}`);
    });

    // Existing conversation event retained for now.
    // IMPORTANT: Add conversation membership validation
    // before using this for private chat messages.
    socket.on("join:conversation", (conversationId: string) => {
      if (typeof conversationId !== "string" || !conversationId.trim()) {
        return;
      }

      socket.join(`conversation:${conversationId}`);
    });
  });

  return io;
}

// ========================================
// GET SOCKET INSTANCE
// ========================================

export function getIO() {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
}

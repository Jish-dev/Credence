import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
let io: Server | null = null;
export function initSocket(server: HttpServer) {
  io = new Server(server, { cors: { origin: process.env.CLIENT_URL?.split(",") || true, credentials: true } });
  io.on("connection", socket => {
    socket.on("join:user", (userId: string) => socket.join(`user:${userId}`));
    socket.on("join:conversation", (conversationId: string) => socket.join(`conversation:${conversationId}`));
  });
  return io;
}
export function getIO() { if (!io) throw new Error("Socket.io has not been initialized"); return io; }

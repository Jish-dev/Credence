
import { io, type Socket } from "socket.io-client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  const token = localStorage.getItem("credence_token");

  if (!token) {
    throw new Error("Authentication token not found.");
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
      transports: ["websocket", "polling"],
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocketUrl() {
  const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicitSocketUrl) return explicitSocketUrl;

  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) return window.location.origin;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl;
  }
}

export function connectSocket(token: string): Socket {
  if (!token) throw new Error("Authentication token is required");

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

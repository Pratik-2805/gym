import { io, Socket } from "socket.io-client";
import { getBackendUrl, getAuthToken } from "./api";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (!socket) {
    const wsUrl = getBackendUrl();
    const token = getAuthToken();
    
    socket = io(wsUrl, {
      path: "/socket.io",
      auth: {
        token: token,
      },
      extraHeaders: token ? {
        Authorization: `Bearer ${token}`
      } : undefined,
      transports: ["websocket"],
    });
  } else if (socket.disconnected) {
    // If the socket was disconnected, ensure we reconnect
    socket.connect();
  }
  return socket;
}

export function getSocket(): Socket {
  if (!socket) {
    return connectSocket();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

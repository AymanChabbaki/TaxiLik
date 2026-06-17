import { io, type Socket } from 'socket.io-client';

import { API_BASE_URL } from './api';

let socket: Socket | null = null;

// Connect (or reuse) the authenticated socket for the current user.
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

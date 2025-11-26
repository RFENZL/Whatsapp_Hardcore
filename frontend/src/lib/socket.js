import { io } from 'socket.io-client';

export function createSocket(token) {
  // Connect directly to backend server at localhost:4000
  const base = import.meta?.env?.VITE_WS_BASE || 'http://localhost:4000';
  
  console.log('[Socket] Creating socket connection', { base, providedToken: !!token });
  
  // Socket.IO will automatically send cookies with withCredentials: true
  // The httpOnly token cookie will be sent and read by the server
  const s = io(base, {
    auth: token ? { token } : {},  // Only send token in auth if explicitly provided
    withCredentials: true,  // This makes the browser send httpOnly cookies automatically
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling']
  });
  
  // Add connection event listeners
  s.on('connect', () => {
    console.log('[Socket] Connected', { socketId: s.id });
  });
  
  s.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected', { reason });
  });
  
  s.on('connect_error', (error) => {
    console.error('[Socket] Connection error', { error: error.message });
  });
  
  return s;
}

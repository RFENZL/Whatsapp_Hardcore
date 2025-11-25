import { io } from "socket.io-client"

// Fonction pour lire un cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export function createSocket(token) {
  const base = import.meta?.env?.VITE_WS_BASE || undefined
  
  // Utiliser le token du cookie si disponible, sinon utiliser le paramètre token
  const authToken = getCookie('token') || token;
  
  const s = io(base, {
    auth: { token: authToken },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    transports: ['websocket', 'polling']
  })
  
  // Add connection event listeners
  s.on('connect', () => {
    console.log('[Socket] Connected', { socketId: s.id })
  })
  
  s.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected', { reason })
  })
  
  s.on('connect_error', (error) => {
    console.error('[Socket] Connection error', { error: error.message })
  })
  
  return s
}

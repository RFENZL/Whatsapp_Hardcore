import { io } from "socket.io-client"

export function createSocket(token) {
  const base = import.meta?.env?.VITE_WS_BASE || undefined
  const s = io(base, {
    auth: { token },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500,
    transports: ['websocket', 'polling']
  })
  return s
}

import { io, type Socket } from 'socket.io-client'

export function createSocket(): Socket {
  const url = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000/realtime'
  return io(url, { autoConnect: false })
}

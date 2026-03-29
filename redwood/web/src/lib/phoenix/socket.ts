/**
 * Phoenix Socket Manager — singleton WebSocket connection to the Elixir backend.
 *
 * Uses the official `phoenix` JS client which handles:
 *   - Heartbeats (keeps the connection alive)
 *   - Reconnection with exponential backoff
 *   - Channel multiplexing over a single WebSocket
 *
 * Usage:
 *   connectSocket('ws://localhost:4000/socket', token)
 *   const channel = joinChannel('typing:lobby', { user_id: 1 })
 *   channel.on('keystroke_batch', payload => { ... })
 *   disconnectSocket()
 */
import { Socket, Channel } from 'phoenix'

/** Singleton socket instance — one WebSocket per tab. */
let socket: Socket | null = null

/**
 * Opens a Phoenix WebSocket connection (or returns the existing one).
 *
 * @param url   - WebSocket URL, e.g. `ws://localhost:4000/socket`
 * @param token - JWT or session token passed as `params.token` to the server
 */
export function connectSocket(url: string, token: string): Socket {
  if (socket?.isConnected()) return socket
  socket = new Socket(url, { params: { token } })
  socket.connect()
  return socket
}

/**
 * Joins a Phoenix Channel on the current socket.
 *
 * @param topic  - Channel topic, e.g. `typing:lobby` or `typing:session_123`
 * @param params - Optional join params forwarded to the server's `join/3`
 * @throws Error if called before `connectSocket()`
 */
export function joinChannel(topic: string, params = {}): Channel {
  if (!socket) throw new Error('Socket not connected')
  const channel = socket.channel(topic, params)
  channel.join()
  return channel
}

/**
 * Tears down the WebSocket connection and clears the singleton.
 *
 * Safe to call even if already disconnected.
 */
export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

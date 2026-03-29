/**
 * PhoenixProvider — React context for Phoenix socket connection and auth state.
 *
 * Replaces the stub provider with real auth + socket lifecycle management.
 *
 * Architecture note: keeping auth/socket state here (vs. component-local) means
 * any page can call usePhoenix() to get connection status, user info, and the
 * API client without prop-drilling.
 *
 * Auth flow:
 *   1. User calls login() or register() → REST API returns JWT + user
 *   2. JWT stored in sessionStorage (tab-scoped, cleared on close)
 *   3. Socket token fetched → Phoenix WebSocket connected
 *   4. logout() tears down socket + clears token
 */
import React, { createContext, useContext, useState, useCallback } from 'react'

import { connectSocket, disconnectSocket } from './socket'
import { api } from './api'

interface PhoenixContextValue {
  /** WebSocket URL for Phoenix socket (e.g. ws://localhost:4000/socket) */
  socketUrl: string
  /** Whether the socket is currently connected */
  connected: boolean
  /** Authenticated user, or null if logged out */
  user: { id: number; username: string; email: string } | null
  /** Authenticate with email/password, then connect socket */
  login: (email: string, password: string) => Promise<void>
  /** Create account with username/email/password */
  register: (username: string, email: string, password: string) => Promise<void>
  /** Disconnect socket and clear auth state */
  logout: () => void
  /** REST API client for Phoenix endpoints */
  api: typeof api
}

const PhoenixContext = createContext<PhoenixContextValue>({
  socketUrl: '',
  connected: false,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  api,
})

/** Provides Phoenix socket + auth context to the React tree. */
export function PhoenixProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<PhoenixContextValue['user']>(null)

  /**
   * Derive WebSocket URL from the current page location.
   * In production this points to the same host; in dev, Vite proxies /socket.
   */
  const socketUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/socket`
      : ''

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.login(email, password)
      sessionStorage.setItem('auth_token', data.token)
      setUser(data.user)

      // Fetch a short-lived socket token and connect the WebSocket
      const socketData = await api.getSocketToken()
      connectSocket(socketUrl, socketData.token)
      setConnected(true)
    },
    [socketUrl]
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api.register({ username, email, password })
      sessionStorage.setItem('auth_token', data.token)
      setUser(data.user)
    },
    []
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth_token')
    disconnectSocket()
    setUser(null)
    setConnected(false)
  }, [])

  return (
    <PhoenixContext.Provider
      value={{ socketUrl, connected, user, login, register, logout, api }}
    >
      {children}
    </PhoenixContext.Provider>
  )
}

/** Consume Phoenix connection + auth state from any component. */
export function usePhoenix() {
  return useContext(PhoenixContext)
}

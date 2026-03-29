/**
 * PhoenixProvider — React context for Phoenix socket connection.
 *
 * Replaces RedwoodApolloProvider in App.tsx. This is a stub that will be
 * wired to phoenix.js socket.ts in Task 31 (Phase 4 integration).
 *
 * Architecture note: keeping state here (vs. component-local) means any
 * page can call usePhoenix() to get connection status without prop-drilling.
 */
import React, { createContext, useContext } from 'react'

interface PhoenixContextValue {
  /** WebSocket URL for Phoenix socket (e.g. ws://localhost:4000/socket) */
  socketUrl: string
  /** Whether the socket is currently connected */
  connected: boolean
}

const PhoenixContext = createContext<PhoenixContextValue>({
  socketUrl: '',
  connected: false,
})

/** Provides Phoenix socket context to the React tree. */
export function PhoenixProvider({ children }: { children: React.ReactNode }) {
  return (
    <PhoenixContext.Provider value={{ socketUrl: '', connected: false }}>
      {children}
    </PhoenixContext.Provider>
  )
}

/** Consume Phoenix connection state from any component. */
export function usePhoenix() {
  return useContext(PhoenixContext)
}

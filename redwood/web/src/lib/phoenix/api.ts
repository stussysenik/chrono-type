/**
 * REST API Client — thin wrapper around fetch for Phoenix JSON endpoints.
 *
 * Auth flow:
 *   1. `api.login()` or `api.register()` returns `{ token, user }`
 *   2. Token is stored in sessionStorage (cleared on tab close)
 *   3. Subsequent requests include `Authorization: Bearer <token>`
 *
 * All endpoints are relative to `/api` which Vite proxies to Phoenix
 * during development (see vite.config.ts proxy config).
 */

const API_BASE = '/api'

/**
 * Generic fetch wrapper with JSON serialization and auth header injection.
 *
 * @throws Error with HTTP status on non-2xx responses
 */
async function request(method: string, path: string, body?: unknown) {
  const token = sessionStorage.getItem('auth_token')
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

/**
 * Typed API methods matching Phoenix router endpoints.
 *
 * Each method maps 1:1 to a Phoenix controller action:
 *   - AuthController: register, login, token
 *   - SessionController: index, show
 *   - StatsController: leaderboard, global
 */
export const api = {
  /** Create a new account. Returns `{ token, user }`. */
  register: (attrs: { username: string; email: string; password: string }) =>
    request('POST', '/auth/register', attrs),

  /** Authenticate with email/password. Returns `{ token, user }`. */
  login: (email: string, password: string) =>
    request('POST', '/auth/login', { email, password }),

  /** Get a short-lived token for Phoenix WebSocket auth. */
  getSocketToken: () => request('GET', '/auth/token'),

  /** List all typing sessions for the authenticated user. */
  getSessions: () => request('GET', '/sessions'),

  /** Get a single typing session by ID. */
  getSession: (id: string) => request('GET', `/sessions/${id}`),

  /** Get the global leaderboard (top WPM scores). */
  getLeaderboard: () => request('GET', '/stats/leaderboard'),

  /** Get aggregate statistics across all users. */
  getGlobalStats: () => request('GET', '/stats/global'),
}

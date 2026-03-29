# ChronoType — Design Specification

**Date**: 2026-03-29
**Status**: Approved
**Purpose**: Developer showcase / portfolio piece — "wow" effect demonstrating Zig/WASM, RxJS, RedwoodJS, Elixir/Phoenix

## Overview

ChronoType is a browser-based real-time keystroke dynamics visualizer. Users type (free or prompted), and the app captures keystroke timing, computes running statistics via Zig-compiled WASM, renders a live-updating latency histogram on Canvas 2D at 60fps, and streams sessions to an Elixir/Phoenix backend for multi-user real-time leaderboards and analytics.

**The moat**: Zig→WASM for sub-microsecond statistical computation with zero GC pauses and constant memory usage.

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Compute (moat) | Zig → WASM (~2KB) | Welford's online algorithm, histogram bins, zero-copy shared memory |
| Streams | RxJS | Reactive pipeline: keydown → buffer → WASM → canvas. Backpressure handling |
| Render | Canvas 2D | 60fps histogram rendering. No React in hot path |
| Frontend | RedwoodJS (React) | SPA shell: pages, routing, layout. Mounts canvas via useRef |
| Backend | Elixir/Phoenix | ALL server concerns: auth, REST API, Channels, Presence, GenServer analytics, LiveDashboard |
| Database | PostgreSQL | Persistence via Ecto |
| Deploy | Railway | 2 services: Phoenix (serves SPA + API + WS) + Postgres |

**Architecture**: Elixir-Primary (Approach C). Phoenix owns every server concern. RedwoodJS is the SPA frontend framework. Phoenix serves the built SPA from `priv/static/` in production.

## Visual Style

Minimal / Stripe-like aesthetic:
- Dark background (`#0a0a0a`)
- Off-white bars (`#e5e5e5`) with opacity fade at distribution tails
- Monospace labels, precise typography
- Micro-animations: bars lerp toward target height (not snap)
- Stats readout below histogram: Mean, StdDev, WPM, Count

## 1. Zig WASM Engine

### Memory Layout (Single 64KB Page)

| Offset | Content | Size |
|--------|---------|------|
| 0x0000 | Welford State: n (u32), mean (f64), m2 (f64), min (f64), max (f64) | 40 bytes |
| 0x0028 | Histogram Bins: 20 × u32 (0-200ms in 10ms buckets) | 80 bytes |
| 0x0078 | Stats Output: mean (f32), variance (f32), stddev (f32), count (u32) | 16 bytes |
| 0x0088 | Overflow Flag: u8 | 1 byte |
| 0x0089+ | Unused | ~65KB |

Total used: ~137 bytes. Memory never grows.

### Exported Functions

```
update(delta_ms: f32) → void      // Feed one inter-key interval. O(1). Updates Welford + histogram.
get_mean() → f32                   // Scalar getter (ABI safe — no struct returns)
get_variance() → f32
get_stddev() → f32
get_count() → u32
get_histogram_ptr() → [*]u32      // Returns pointer. JS reads 20 × u32 via Uint32Array view.
get_overflow() → u8                // Signals RxJS to switch to degraded mode
reset() → void                    // Reset all state for new session
```

### Welford's Online Algorithm

O(1) per keystroke, numerically stable, constant memory. Maintains running `n`, `mean`, `m2` (sum of squared differences from current mean). Variance = `m2 / (n - 1)`. Internal computation uses `f64` for numerical stability; exported getters return `f32` for WASM ABI simplicity.

### JS Bridge (Zero-Copy)

TypeScript creates `Float32Array` and `Uint32Array` views into WASM linear memory at startup — allocated once, never recreated. The 60fps render loop reads directly from these views without creating new objects (no GC pressure).

```typescript
const histView = new Uint32Array(memory.buffer, instance.exports.get_histogram_ptr(), 20);
// histView reflects WASM memory live — no copy needed per frame
```

### Build Configuration

`build.zig` targets `wasm32-freestanding`, `entry = .disabled`, `rdynamic = true`. Output: `zig-out/bin/chrono_stats.wasm`. Built with `-Doptimize=ReleaseSmall` for production (<2KB).

## 2. RxJS Pipeline

Three decoupled streams at different frequencies:

### Stream 1: Stats Ingestion (Event Rate)

```
fromEvent(keydown) → map(performance.now() → Δt) → bufferTime(16ms) → filter(len > 0) → tap(wasm.update(Δt))
```

Every keystroke feeds WASM. Batched per frame (16ms) to prevent main thread blocking. JS owns timestamps via `performance.now()` (monotonic), Zig owns computation. Never use Zig's clock for event timing.

### Stream 2: Visualization (Frame Rate — 60fps)

```
animationFrame$ → map(readWasmStats()) → tap(renderer.draw())
```

Polls WASM stats at frame rate via `animationFrameScheduler`. Decoupled from event rate — handles 10 WPM and 150 WPM identically. Reads are free (zero-copy memory view).

### Stream 3: Network Sync (Throttled — 100ms)

```
keystroke$ → bufferTime(100ms) → tap(channel.push("keystroke_batch"))
```

Batches keystrokes for Phoenix Channel. 100ms buffer = 10 pushes/sec max. Backpressure handled server-side by GenServer.

### Why Three Streams

- Stats: every keystroke matters for accuracy — can't skip events
- Render: no point drawing faster than 60fps — polls WASM
- Network: WebSocket shouldn't fire per-keystroke — 100ms batches are smooth enough for spectators

## 3. Canvas Rendering

### Render Loop (O(1) per frame)

1. `clearRect` — clear canvas
2. Read 20 histogram bins from `histView` (zero-copy WASM memory)
3. 20 × `fillRect` — one per bin, height lerped toward target (smooth transitions)
4. Text rendering for axis labels and stats
5. No object allocation, no GC pressure

### Aesthetic

- Bars: `#e5e5e5`, 1px border-radius at top, opacity gradient at tails
- Background: `#0a0a0a`
- Labels: monospace, `#555` axis ticks, `#888` for titles
- Stats row below: Mean (ms), Std Dev, WPM, Keystrokes — large numbers, small uppercase labels

## 4. Elixir/Phoenix Backend

### OTP Supervision Tree

```
ChronoType.Supervisor (one_for_one)
├── ChronoType.Repo (Ecto)
├── Phoenix.PubSub
├── ChronoTypeWeb.Presence
├── ChronoType.SessionSupervisor (DynamicSupervisor)
│   ├── SessionServer (per active session)
│   └── ...
├── ChronoType.Analytics.Pipeline (GenServer + ETS)
├── ChronoType.Analytics.Reporter (periodic DB flush)
├── ChronoTypeWeb.Telemetry
└── ChronoTypeWeb.Endpoint
```

### Channel Architecture

**UserSocket** — Auth via `Phoenix.Token` on connect.

**typing:{session_id}**:
- In: `"keystroke_batch"` — `{events: [{key, ts, dur}]}`
- In: `"session_complete"` — `{summary}`
- Out: `"keystroke_batch"` — broadcast to spectators
- Out: `"stats_update"` — `{wpm, accuracy}`

**lobby:main**:
- Out: `"presence_state"` — who's online
- Out: `"presence_diff"` — join/leave
- Out: `"leaderboard_update"` — `{user, wpm}`
- Out: `"global_stats"` — every 2s

### Analytics Pipeline (GenServer + ETS)

- `Analytics.Pipeline` GenServer receives `{:ingest, session_id, user_id, events}` via `handle_cast`
- Updates per-session running stats in ETS table `:typing_aggregates` (`read_concurrency: true`)
- Updates global aggregate
- Emits telemetry events
- Every 2s: broadcasts global stats to `lobby:main` via PubSub
- `Analytics.Reporter`: every 30s, snapshots ETS → Postgres `analytics_snapshots` table

### REST API

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get session + socket token |
| DELETE | /api/auth/logout | End session |
| GET | /api/auth/token | Phoenix.Token for WebSocket |
| GET | /api/sessions | List user's sessions |
| GET | /api/sessions/:id | Session detail + keystrokes |
| POST | /api/sessions | Save completed session |
| GET | /api/stats/global | Cross-user aggregate stats |
| GET | /api/stats/leaderboard | Top WPM rankings |
| GET | /api/health | Railway health check |

No GraphQL — REST is simpler for this API surface. Channels handle the interesting real-time parts.

### Database Schema

**users**: id, username, email, password_hash, timestamps
**typing_sessions**: id, user_id, started_at, ended_at, text_prompt, wpm, accuracy, mean_iki, std_iki, total_keys, metadata (JSONB), mode (free/prompted)
**keystrokes**: id, session_id, key, timestamp_ms, duration_ms
**passages**: id, text, difficulty, category, word_count
**analytics_snapshots**: id, snapshot_at, total_sessions, avg_wpm, median_wpm, p95_wpm, active_users, data (JSONB)
**leaderboard_entries**: id, user_id, session_id, wpm, accuracy, rank

### LiveDashboard

Standard Phoenix metrics plus custom typing telemetry:
- `counter`: keystrokes ingested
- `summary`: keystroke latency (ms)
- `last_value`: active sessions
- `distribution`: WPM buckets [20, 40, 60, 80, 100, 120, 140, 160]

Accessible at `/dashboard` in production.

## 5. RedwoodJS Frontend

### Role

SPA framework only — no GraphQL, no Prisma, no serverless API. Provides:
- React component architecture
- File-based page routing
- Vite build pipeline
- TypeScript scaffolding

### Key Modifications

- `App.tsx`: Replace `RedwoodApolloProvider` with custom `PhoenixProvider` (socket connection, auth token, REST client)
- `vite.config.ts`: Dev proxy `/api` and `/socket` to Phoenix (:4000). Exclude `phoenix` npm package from optimizeDeps.
- `api/` directory: Vestigial — keep the scaffold files RedwoodJS generates but add no application logic. Required for `yarn rw` CLI commands to work.

### Pages

- **HomePage**: Landing + typing test launcher (mode selection: free/prompted)
- **SessionPage**: Active typing session — hosts the canvas, stats panel, prompt text
- **LeaderboardPage**: Real-time leaderboard via lobby channel
- **HistoryPage**: Past sessions browser (REST API)

### Engine Modules (`web/src/lib/` — no React imports)

- `wasm/loader.ts` — WASM initialization + memory view setup
- `wasm/stats.ts` — TypeScript bindings for Zig exports
- `streams/keystroke$.ts` — RxJS keystroke observable
- `streams/pipeline$.ts` — Buffer → WASM → render pipeline
- `streams/channel$.ts` — RxJS wrapper around Phoenix Channel
- `canvas/renderer.ts` — Canvas 2D histogram rendering
- `canvas/animations.ts` — Lerp interpolation for smooth bar transitions
- `phoenix/socket.ts` — Phoenix socket connection manager
- `phoenix/api.ts` — REST client for Phoenix JSON API
- `phoenix/presence.ts` — Presence sync wrapper
- `hooks/usePhoenixChannel.ts`, `hooks/usePresence.ts`, `hooks/useWasm.ts`

## 6. Project Structure

```
chrono-type/
├── redwood/                    # RedwoodJS SPA frontend
│   ├── redwood.toml            # apiUrl → Phoenix
│   ├── web/                    # React SPA
│   │   ├── vite.config.ts      # Proxy /api + /socket → Phoenix
│   │   ├── public/chrono_stats.wasm
│   │   └── src/
│   │       ├── App.tsx          # PhoenixProvider (no Apollo)
│   │       ├── Routes.tsx
│   │       ├── pages/           # HomePage, SessionPage, LeaderboardPage
│   │       ├── components/      # TypingArea, Histogram, StatsPanel, PresenceList
│   │       └── lib/             # Engine modules (no React imports)
│   └── api/                    # Vestigial
│
├── phoenix/                    # Elixir/Phoenix backend
│   ├── mix.exs
│   ├── lib/chrono_type/        # Domain: accounts, typing, analytics
│   ├── lib/chrono_type_web/    # Web: channels, controllers, presence
│   ├── priv/static/            # In prod: RedwoodJS web/dist
│   └── Dockerfile
│
├── zig/                        # WASM statistics engine
│   ├── build.zig               # wasm32-freestanding
│   └── src/stats.zig           # Welford's + histogram + exports
│
├── scripts/
│   ├── dev.sh                  # Start all services
│   └── build-wasm.sh           # Compile Zig → copy to web/public
│
└── docker-compose.yml          # Postgres for local dev
```

## 7. Development Workflow

### Local Dev — `scripts/dev.sh`

1. `docker compose up -d postgres`
2. Build WASM: `cd zig && zig build -Doptimize=Debug && cp zig-out/bin/chrono_stats.wasm ../redwood/web/public/`
3. Start Phoenix: `cd phoenix && mix phx.server` (port 4000)
4. Start RedwoodJS: `cd redwood && yarn rw dev web` (port 8910, proxies to Phoenix)
5. Watch Zig source for changes and auto-rebuild

### URLs

- `http://localhost:8910` — RedwoodJS SPA (proxies to Phoenix)
- `http://localhost:4000/dashboard` — Phoenix LiveDashboard

## 8. Railway Deployment

### 2 Services

1. **phoenix** — Multi-stage Dockerfile:
   - Stage 1: `ghcr.io/ziglang/zig:0.15.2` → build WASM
   - Stage 2: `node:20-alpine` → `yarn rw build web`
   - Stage 3: `elixir:1.19-otp-28` → `mix release` (COPY web/dist → priv/static/)
   - Stage 4: `alpine:3.20` → runtime (serves SPA + API + WebSocket)

2. **postgres** — Railway managed plugin

### Environment Variables

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY_BASE=<mix phx.gen.secret>
PHX_HOST=chrono-type.up.railway.app
PORT=4000
```

### Start Command

```
bin/chrono_type eval 'ChronoType.Release.migrate()' && bin/chrono_type start
```

### Phoenix SPA Serving

- `Plug.Static` serves assets from `priv/static/`
- `PageController#index` serves `index.html` for all non-API, non-static routes (SPA fallback)
- `check_origin` configured for the Railway domain

## 9. Typing Modes

### Free Mode

User types anything. Pure rhythm analysis. No accuracy metrics. Session saved with keystrokes only.

### Prompted Mode

Display a passage from the `passages` table. User types it out. Enables:
- Accuracy calculation (correct/total characters)
- WPM calculation (standard: characters / 5 / minutes)
- Leaderboard ranking by WPM + accuracy
- Session saved with passage reference + accuracy data

## 10. Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| Zig | `zig build test` | Welford's correctness, histogram binning, edge cases (n=0, overflow, negative delta) |
| Elixir | `mix test` (ExUnit) | Channel join/push/broadcast, GenServer lifecycle, controller responses, Ecto queries |
| TypeScript | Vitest | WASM bridge loading, RxJS pipeline behavior, canvas renderer output |
| E2E | Playwright | Full flow: type → see histogram → session saved. Multi-user channels. DevTools Performance audit (60fps, flat heap) |

### Success Criteria

1. Zig WASM compiles to `chrono_stats.wasm` (<2KB), exports all functions, Welford's converges correctly
2. RxJS pipeline runs `keydown$ → buffer → WASM → canvas` without React re-renders — pure imperative canvas
3. Chrome DevTools Performance: 60 seconds continuous typing → no dropped frames, flat memory heap, histogram variance converges
4. Phoenix Channels: two browser tabs see each other typing in real-time
5. LiveDashboard shows custom typing telemetry
6. Railway deploy: single container serves SPA + API + WebSocket

## 11. Auth Flow

1. User registers/logs in via `POST /api/auth/register` or `/login`
2. Phoenix returns a bearer token (JWT or signed Phoenix.Token) in the JSON response body. SPA stores it in memory (not localStorage — cleared on tab close for security).
3. SPA calls `GET /api/auth/token` with the bearer token → short-lived `Phoenix.Token` for WebSocket (expires in 24h)
4. SPA connects to Phoenix Socket with token: `new Socket(url, {params: {token}})`
5. `UserSocket.connect/3` verifies via `Phoenix.Token.verify/4`

## 12. Multi-User Experience

- User joins `lobby:main` on app load → sees who's online (Presence)
- User starts typing → joins `typing:{session_id}` → keystrokes broadcast to spectators
- Other users can "watch" a session by joining the same typing channel
- Leaderboard updates broadcast to lobby on session completion
- Global stats (avg WPM, active sessions) broadcast every 2s

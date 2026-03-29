# Progress

Current state of ChronoType as of 2026-03-29.

---

## Status

All core systems are built, tested, and interactively verified via Chrome DevTools. The application runs end-to-end: type in the browser, see live histogram, data streams to Phoenix backend.

---

## Phase Completion

- [x] **Phase 1: Zig WASM Engine** — Welford's online algorithm, 20-bin histogram, 8 exported functions, 11 tests, 692-byte binary
- [x] **Phase 2: RedwoodJS + Engine** — WASM bridge, Canvas renderer, RxJS 3-stream pipeline, TypingArea component, 53 tests
- [x] **Phase 3: Elixir/Phoenix Backend** — Auth (bcrypt), REST API (10 endpoints), Channels (typing + lobby), Presence, GenServer analytics pipeline, LiveDashboard, 16 tests
- [x] **Phase 4: Integration** — Phoenix JS client, socket manager, network sync stream, docker-compose, dev.sh
- [x] **Phase 5: Deploy + Verification** — Multi-stage Dockerfile, Railway config, Release module, Chrome DevTools interactive testing
- [x] **Gallery** — 8 full-screen canvas visualizations (Pipeline, Histogram, Waveform, Memory, Scatter, Heatmap, Streams, Stats), gallery index with animated thumbnails, arrow navigation

---

## Test Coverage

| Layer | Tool | Count | Status |
|---|---|---|---|
| Zig | `zig build test` | 11 | All passing |
| TypeScript (engine) | Vitest | 53 | All passing |
| TypeScript (gallery) | Vitest | 8 | All passing |
| Elixir | ExUnit | 16 | All passing |
| **Total** | | **88** | **All passing** |

---

## Interactive Verification (Chrome DevTools MCP)

Every page was navigated to, screenshotted, and verified:

| Page | Status | Notes |
|---|---|---|
| `/` (Home) | Working | "ChronoType" heading, Start Typing + View Gallery links |
| `/session` | Working | Canvas renders, WASM loads, histogram updates on typing |
| `/gallery` | Working | 2x4 grid of animated thumbnails, all 8 render |
| `/gallery/pipeline` | Working | Mechanical pipeline with cyan particles |
| `/gallery/histogram` | Working | Spring-physics bars with gaussian overlay |
| `/gallery/waveform` | Working | EKG heartbeat with glowing green bezier trail |
| `/gallery/memory` | Working | Hex grid with Matrix rain effect |
| `/gallery/scatter` | Working | Particle cloud with outlier detection |
| `/gallery/heatmap` | Working | LED spectrogram with waterfall scroll |
| `/gallery/streams` | Working | RxJS marble diagram, 3 color-coded tracks |
| `/gallery/stats` | Working | Odometer dashboard with radar chart |
| `localhost:4000/api/health` | Working | `{"status":"ok"}` |
| `localhost:4000/dashboard` | Working | Phoenix LiveDashboard with system metrics |

Console errors: **Zero** (after all fixes applied)

---

## Performance (Chrome DevTools)

| Metric | Score | Rating |
|---|---|---|
| LCP | 269ms | Excellent |
| INP | 41ms | Excellent |
| CLS | 0.00 | Perfect |
| Lighthouse Accessibility | 100 | Perfect |
| Lighthouse Best Practices | 100 | Perfect |
| Lighthouse SEO | 100 | Perfect |
| JS Heap (during typing) | 28 MB | Stable (no GC spikes) |

---

## Commits by Phase

### Phase 1: Zig WASM Engine
```
14eba18 feat: scaffold Zig WASM project with build.zig for wasm32-freestanding
833cd7b feat: implement Welford's algorithm and histogram binning with 11 tests
```

### Phase 2: RedwoodJS + Engine
```
e9f0ec9 chore: scaffold RedwoodJS 8.9.0 with rxjs and vitest
8881a00 feat: implement WASM bridge types and loader with tests
301e168 feat: implement Canvas histogram renderer with Stripe aesthetic
692b65f feat: implement RxJS keystroke observable and three-stream pipeline
2887579 feat: generate pages and components
622ad4d refactor: replace RedwoodApolloProvider with PhoenixProvider stub
ace45af chore: configure Vite dev proxy for Phoenix and update redwood.toml
b5b4fa9 feat: implement TypingArea component with WASM + RxJS + Canvas pipeline
```

### Phase 3: Elixir/Phoenix Backend
```
eaf263c feat: scaffold Phoenix backend with 6 database migrations
e1b670d feat: implement User schema and Accounts context with bcrypt auth
964c394 feat: implement Typing context with session, keystroke, and passage schemas
6ff7cde feat: implement Analytics.Pipeline GenServer with ETS storage
580aec6 feat: implement REST controllers (auth, sessions, stats, health)
e2a78dc feat: implement Phoenix Channels (typing, lobby) with Presence
a5c4e0a feat: add CORS, SPA serving, supervision tree, LiveDashboard
```

### Phase 4: Integration
```
46d449e feat: implement Phoenix socket manager and REST API client
3667b5b feat: implement real PhoenixProvider with auth and socket lifecycle
947fd21 feat: wire keystroke streaming to Phoenix Channel
56d1795 feat: add docker-compose and dev.sh for local development
```

### Phase 5: Deploy + Verification
```
877ce99 feat: add Release module for production migrations
85d1021 feat: multi-stage Dockerfile (Zig + Node + Elixir + Alpine)
6cf3fdb feat: add Railway deployment configuration
cecc048 fix: payload mismatch, 60fps re-renders, Dockerfile CMD, WebSocket origin
a0b60b0 fix: visual issues found during interactive Chrome DevTools testing
08a9506 fix: add id/name to textarea for form field accessibility warning
```

### Gallery
```
9697ffe feat: add gallery demo data generator and spring physics
645af33 feat: add base renderer class and gallery index
6e290ec feat: generate 9 gallery pages
4107a98 feat: implement GalleryShell with arrow nav and live toggle
1bffe06 feat: implement 4 gallery renderers (pipeline, histogram, waveform, memory)
3c9fc3c feat: implement 4 gallery renderers (scatter, heatmap, streams, stats)
0b59b07 feat: add slides config and useGalleryViz hook
257d2ee feat: implement gallery index page with animated thumbnails
60c5a40 feat: wire up all 8 gallery visualization pages
ad31ea2 feat: add gallery link to HomePage
30eae7e fix: resolve dual-React crash on gallery route
258fc48 fix: inline gallery hooks to avoid SW caching issues
```

---

## Known Gaps

Items identified during code review that are not yet implemented:

| Item | Priority | Notes |
|---|---|---|
| Analytics.Reporter (ETS -> Postgres flush) | Medium | analytics_snapshots table exists but never written to |
| Telemetry event emission | Medium | Custom metrics defined but Pipeline never calls `:telemetry.execute/3` |
| LeaderboardPage UI | Low | Page exists but renders placeholder |
| HistoryPage UI | Low | Page exists but renders placeholder |
| Auth UI (login/register forms) | Medium | REST endpoints work, no frontend forms |
| Prompted typing mode UI | Low | Schema supports it, no mode selection UI |
| E2E Playwright tests | Low | Spec called for them, not written |
| LiveDashboard auth | Low | Currently exposed without admin auth |

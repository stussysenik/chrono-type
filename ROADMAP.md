# Roadmap

What's next for ChronoType.

---

## Next Up

Immediate polish to round out the core experience.

- [ ] **Analytics.Reporter** — Periodic ETS-to-Postgres flush (every 30s) so analytics_snapshots table accumulates real data
- [ ] **Telemetry events** — Wire `:telemetry.execute/3` calls into the Analytics.Pipeline so LiveDashboard custom metrics show real typing data
- [ ] **Auth UI** — Login and registration forms on the frontend, connected to the existing Phoenix auth endpoints
- [ ] **LeaderboardPage** — Fetch `/stats/leaderboard` and render a ranked list of top WPM scores
- [ ] **HistoryPage** — Fetch `/sessions` and render the current user's past typing sessions with stats
- [ ] **LiveDashboard auth** — Require admin credentials to access `/dashboard` in production

---

## Future

Larger features that expand the product.

- [ ] **Prompted typing mode** — Select a passage from the passages table, display it above the textarea, compute accuracy alongside WPM
- [ ] **Session replay** — Store keystrokes per session, replay them through the gallery visualizations. Watch your typing back like a recording.
- [ ] **Multi-user spectator mode** — Join another user's typing channel and see their keystrokes visualized in real-time on your screen
- [ ] **Typing heatmap by key** — Track per-key latency (which keys are slow?), render a keyboard heatmap visualization
- [ ] **E2E test suite** — Playwright tests covering the full flow: type -> histogram -> session saved -> leaderboard updated
- [ ] **Production deployment** — Deploy to Railway with proper secrets, custom domain, SSL

---

## Stretch

Advanced ideas for later.

- [ ] **Typing pattern ML** — Feed keystroke dynamics into a simple classifier that identifies the typist (behavioral biometrics demo)
- [ ] **Competitive mode** — Real-time typing race against other users, split-screen visualization
- [ ] **Per-finger analysis** — Detect which finger pressed which key (via key position mapping), show per-finger speed/accuracy stats
- [ ] **SharedArrayBuffer path** — Enable WASM shared memory for true zero-copy between main thread and a Web Worker
- [ ] **Mobile touch typing** — Adapt for touchscreen keyboards with touch event timing

---

## Non-Goals

Things this project intentionally does not do.

- **Production SaaS** — This is a portfolio piece, not a product. No billing, no SLAs, no multi-tenant isolation.
- **Browser compatibility** — Targets modern Chromium. No IE11, no Safari WASM polyfills.
- **Typing tutor** — ChronoType measures and visualizes. It does not teach typing or suggest improvements.
- **Security hardening** — Auth is minimal (no email verification, no password reset, no rate limiting). Sufficient for demo purposes.

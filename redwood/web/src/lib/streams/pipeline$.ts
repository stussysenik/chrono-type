/**
 * Three-stream pipeline connecting keystrokes to WASM stats, canvas, and network.
 *
 * 1. **Ingestion stream** — feeds keystroke deltas into the Zig WASM module
 * 2. **Visualization stream** — reads WASM stats on each animation frame trigger
 * 3. **Network sync stream** — buffers keystrokes and flushes in batches
 *
 * All three streams are cold (lazy) — they only activate when subscribed.
 * The caller controls frame timing and flush timing via trigger observables,
 * keeping the pipeline fully testable with no real timers.
 */

import { Observable, filter, tap, map, buffer } from 'rxjs'
import type { KeystrokeEvent } from './keystroke$'
import type { ChronoStatsApi } from '../wasm/stats'

// ── Types ───────────────────────────────────────────────────────────────────

export interface StatsSnapshot {
  mean: number
  variance: number
  stddev: number
  count: number
  wpm: number
  histogram: Uint32Array
  overflow: boolean
}

// ── WPM calculation ─────────────────────────────────────────────────────────

/**
 * Converts mean inter-key interval (milliseconds) to words per minute.
 *
 * Formula: (1000 / meanMs) * 60 / 5
 *   - 1000/meanMs = keystrokes per second
 *   - * 60 = keystrokes per minute
 *   - / 5 = words per minute (standard 5-char word)
 *
 * Returns 0 when meanMs <= 0 (no data or invalid).
 */
export function computeWpm(meanMs: number): number {
  if (meanMs <= 0) return 0
  return (1000 / meanMs) * 60 / 5
}

// ── Stream 1: Ingestion ─────────────────────────────────────────────────────

/**
 * Feeds keystroke deltas into the WASM stats module.
 *
 * Skips the first keystroke (where delta is undefined) since there's
 * no inter-key interval to measure yet.
 */
export function createStatsIngestionStream(
  keystroke$: Observable<KeystrokeEvent>,
  statsApi: ChronoStatsApi,
): Observable<void> {
  return keystroke$.pipe(
    filter((e): e is KeystrokeEvent & { delta: number } => e.delta !== undefined),
    tap((e) => statsApi.update(e.delta)),
    map(() => undefined),
  )
}

// ── Stream 2: Visualization ─────────────────────────────────────────────────

/**
 * Reads a stats snapshot from WASM on each frame trigger emission.
 *
 * The frameTrigger$ is typically driven by requestAnimationFrame, but
 * tests can use a Subject for deterministic control.
 */
export function createVisualizationStream(
  statsApi: ChronoStatsApi,
  frameTrigger$: Observable<void>,
): Observable<StatsSnapshot> {
  return frameTrigger$.pipe(
    map(() => {
      const mean = statsApi.getMean()
      return {
        mean,
        variance: statsApi.getVariance(),
        stddev: statsApi.getStddev(),
        count: statsApi.getCount(),
        wpm: computeWpm(mean),
        histogram: statsApi.getHistogram(),
        overflow: statsApi.getOverflow(),
      }
    }),
  )
}

// ── Stream 3: Network sync ──────────────────────────────────────────────────

/**
 * Buffers keystrokes and emits them as a batch on each flush trigger.
 *
 * Empty batches are filtered out to avoid unnecessary network calls.
 * The flushTrigger$ is typically a timer (e.g., interval(5000)) but
 * tests can use a Subject.
 */
export function createNetworkSyncStream(
  keystroke$: Observable<KeystrokeEvent>,
  flushTrigger$: Observable<void>,
): Observable<KeystrokeEvent[]> {
  return keystroke$.pipe(
    buffer(flushTrigger$),
    filter((batch) => batch.length > 0),
  )
}

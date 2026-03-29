/**
 * Type definitions for the Zig WASM chrono-stats module.
 *
 * The Zig side exposes a fixed-size histogram (20 bins x 10ms each = 0–200ms range)
 * plus running Welford statistics. These types mirror the C ABI exports so the
 * TypeScript loader can wrap them in an ergonomic API.
 */

// ── Raw WASM exports (C ABI names) ──────────────────────────────────────────

export interface ChronoStatsExports {
  memory: WebAssembly.Memory
  update(delta_ms: number): void
  get_mean(): number
  get_variance(): number
  get_stddev(): number
  get_count(): number
  get_histogram_ptr(): number
  get_overflow(): number
  reset(): void
}

// ── Ergonomic TypeScript wrapper ────────────────────────────────────────────

export interface ChronoStatsApi {
  update(delta_ms: number): void
  getMean(): number
  getVariance(): number
  getStddev(): number
  getCount(): number
  getHistogram(): Uint32Array
  getOverflow(): boolean
  reset(): void
  memory: WebAssembly.Memory
}

// ── Histogram constants ─────────────────────────────────────────────────────

/** Number of histogram bins (each bin covers BIN_WIDTH_MS milliseconds). */
export const HISTOGRAM_BIN_COUNT = 20

/** Width of each histogram bin in milliseconds. */
export const HISTOGRAM_BIN_WIDTH_MS = 10

/** Maximum measurable latency before overflow (BIN_COUNT * BIN_WIDTH_MS). */
export const HISTOGRAM_MAX_MS = HISTOGRAM_BIN_COUNT * HISTOGRAM_BIN_WIDTH_MS

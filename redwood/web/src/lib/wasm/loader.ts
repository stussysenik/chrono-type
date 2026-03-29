/**
 * WASM loader for the Zig chrono-stats module.
 *
 * `createStatsApi` wraps the raw C-ABI exports in an ergonomic TypeScript API.
 * `loadChronoStats` handles fetch + instantiate + wrap as a single async call.
 *
 * The histogram is exposed as a live Uint32Array view into WASM linear memory,
 * meaning reads always reflect the latest data without copying.
 */

import type { ChronoStatsExports, ChronoStatsApi } from './stats'
import { HISTOGRAM_BIN_COUNT } from './stats'

/** Bytes per u32 element. */
const BYTES_PER_U32 = 4

/**
 * Wraps raw WASM exports in a camelCase TypeScript API.
 *
 * The returned `getHistogram()` creates a live Uint32Array view into WASM
 * memory at the pointer returned by `get_histogram_ptr()`. Because
 * WebAssembly.Memory can grow (invalidating existing ArrayBuffer references),
 * we create a fresh view on each call to stay safe.
 */
export function createStatsApi(exports: ChronoStatsExports): ChronoStatsApi {
  return {
    update(delta_ms: number): void {
      exports.update(delta_ms)
    },

    getMean(): number {
      return exports.get_mean()
    },

    getVariance(): number {
      return exports.get_variance()
    },

    getStddev(): number {
      return exports.get_stddev()
    },

    getCount(): number {
      return exports.get_count()
    },

    getHistogram(): Uint32Array {
      const ptr = exports.get_histogram_ptr()
      // Create a fresh view each call so memory.grow() doesn't stale us
      return new Uint32Array(exports.memory.buffer, ptr, HISTOGRAM_BIN_COUNT)
    },

    getOverflow(): boolean {
      return exports.get_overflow() !== 0
    },

    reset(): void {
      exports.reset()
    },

    memory: exports.memory,
  }
}

/**
 * Fetches, instantiates, and wraps the Zig WASM module.
 *
 * @param url - URL to the .wasm file. Defaults to `/chrono_stats.wasm`.
 * @returns The wrapped stats API ready for use.
 */
export async function loadChronoStats(
  url: string = '/chrono_stats.wasm',
): Promise<ChronoStatsApi> {
  const response = await fetch(url)
  const { instance } = await WebAssembly.instantiateStreaming(response)
  const exports = instance.exports as unknown as ChronoStatsExports
  return createStatsApi(exports)
}

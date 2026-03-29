import { describe, it, expect } from 'vitest'
import {
  HISTOGRAM_BIN_COUNT,
  HISTOGRAM_BIN_WIDTH_MS,
  HISTOGRAM_MAX_MS,
  type ChronoStatsExports,
  type ChronoStatsApi,
} from './stats'

describe('wasm/stats types and constants', () => {
  it('exports histogram constants with correct values', () => {
    expect(HISTOGRAM_BIN_COUNT).toBe(20)
    expect(HISTOGRAM_BIN_WIDTH_MS).toBe(10)
    expect(HISTOGRAM_MAX_MS).toBe(200)
  })

  it('HISTOGRAM_MAX_MS equals BIN_COUNT * BIN_WIDTH_MS', () => {
    expect(HISTOGRAM_MAX_MS).toBe(HISTOGRAM_BIN_COUNT * HISTOGRAM_BIN_WIDTH_MS)
  })

  it('ChronoStatsExports type is structurally compatible', () => {
    // Compile-time check: a mock object satisfies the interface
    const mock: ChronoStatsExports = {
      memory: new WebAssembly.Memory({ initial: 1 }),
      update: (_delta_ms: number) => {},
      get_mean: () => 0,
      get_variance: () => 0,
      get_stddev: () => 0,
      get_count: () => 0,
      get_histogram_ptr: () => 0,
      get_overflow: () => 0,
      reset: () => {},
    }
    expect(mock).toBeDefined()
  })

  it('ChronoStatsApi type is structurally compatible', () => {
    const mock: ChronoStatsApi = {
      memory: new WebAssembly.Memory({ initial: 1 }),
      update: (_delta_ms: number) => {},
      getMean: () => 0,
      getVariance: () => 0,
      getStddev: () => 0,
      getCount: () => 0,
      getHistogram: () => new Uint32Array(HISTOGRAM_BIN_COUNT),
      getOverflow: () => false,
      reset: () => {},
    }
    expect(mock).toBeDefined()
  })
})

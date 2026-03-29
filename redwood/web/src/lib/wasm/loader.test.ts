import { describe, it, expect, vi } from 'vitest'
import { createStatsApi } from './loader'
import type { ChronoStatsExports } from './stats'
import { HISTOGRAM_BIN_COUNT } from './stats'

/**
 * Creates a mock ChronoStatsExports object backed by real WebAssembly.Memory.
 * The histogram pointer is placed at byte offset 0, with each of the 20 bins
 * as a little-endian u32.
 */
function createMockExports(overrides?: Partial<ChronoStatsExports>): ChronoStatsExports {
  const memory = new WebAssembly.Memory({ initial: 1 }) // 64 KiB page

  // Write known histogram values into memory at offset 0
  const view = new Uint32Array(memory.buffer, 0, HISTOGRAM_BIN_COUNT)
  view[0] = 5
  view[1] = 12
  view[19] = 99

  return {
    memory,
    update: vi.fn(),
    get_mean: vi.fn(() => 123.45),
    get_variance: vi.fn(() => 67.89),
    get_stddev: vi.fn(() => 8.24),
    get_count: vi.fn(() => 42),
    get_histogram_ptr: vi.fn(() => 0), // byte offset 0
    get_overflow: vi.fn(() => 0),      // 0 = false
    reset: vi.fn(),
    ...overrides,
  }
}

describe('createStatsApi', () => {
  it('delegates update to raw export', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    api.update(150)

    expect(raw.update).toHaveBeenCalledWith(150)
  })

  it('getMean returns value from raw get_mean', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    expect(api.getMean()).toBe(123.45)
    expect(raw.get_mean).toHaveBeenCalled()
  })

  it('getVariance returns value from raw get_variance', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    expect(api.getVariance()).toBe(67.89)
  })

  it('getStddev returns value from raw get_stddev', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    expect(api.getStddev()).toBe(8.24)
  })

  it('getCount returns value from raw get_count', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    expect(api.getCount()).toBe(42)
  })

  it('getHistogram returns a live Uint32Array view at histogram pointer', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    const hist = api.getHistogram()

    expect(hist).toBeInstanceOf(Uint32Array)
    expect(hist.length).toBe(HISTOGRAM_BIN_COUNT)
    expect(hist[0]).toBe(5)
    expect(hist[1]).toBe(12)
    expect(hist[19]).toBe(99)
  })

  it('getHistogram reflects memory mutations (live view)', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    // Mutate the underlying WASM memory directly
    const directView = new Uint32Array(raw.memory.buffer, 0, HISTOGRAM_BIN_COUNT)
    directView[5] = 777

    const hist = api.getHistogram()
    expect(hist[5]).toBe(777)
  })

  it('getOverflow converts 0 to false', () => {
    const raw = createMockExports({ get_overflow: vi.fn(() => 0) })
    const api = createStatsApi(raw)

    expect(api.getOverflow()).toBe(false)
  })

  it('getOverflow converts 1 to true', () => {
    const raw = createMockExports({ get_overflow: vi.fn(() => 1) })
    const api = createStatsApi(raw)

    expect(api.getOverflow()).toBe(true)
  })

  it('reset delegates to raw export', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    api.reset()

    expect(raw.reset).toHaveBeenCalled()
  })

  it('exposes memory reference', () => {
    const raw = createMockExports()
    const api = createStatsApi(raw)

    expect(api.memory).toBe(raw.memory)
  })
})

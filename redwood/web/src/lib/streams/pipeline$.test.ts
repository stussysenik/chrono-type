import { describe, it, expect, vi } from 'vitest'
import { Subject } from 'rxjs'
import {
  computeWpm,
  createStatsIngestionStream,
  createVisualizationStream,
  createNetworkSyncStream,
} from './pipeline$'
import type { KeystrokeEvent } from './keystroke$'
import type { ChronoStatsApi } from '../wasm/stats'

function createMockStatsApi(overrides?: Partial<ChronoStatsApi>): ChronoStatsApi {
  return {
    update: vi.fn(),
    getMean: vi.fn(() => 100),
    getVariance: vi.fn(() => 25),
    getStddev: vi.fn(() => 5),
    getCount: vi.fn(() => 10),
    getHistogram: vi.fn(() => new Uint32Array(20)),
    getOverflow: vi.fn(() => false),
    reset: vi.fn(),
    memory: new WebAssembly.Memory({ initial: 1 }),
    ...overrides,
  }
}

function makeKeystroke(overrides?: Partial<KeystrokeEvent>): KeystrokeEvent {
  return {
    key: 'a',
    code: 'KeyA',
    timestamp: 1000,
    delta: 100,
    ...overrides,
  }
}

describe('computeWpm', () => {
  it('returns approximately 120 for mean=100ms', () => {
    // (1000/100) * 60 / 5 = 10 * 12 = 120
    expect(computeWpm(100)).toBeCloseTo(120)
  })

  it('returns 0 for mean=0', () => {
    expect(computeWpm(0)).toBe(0)
  })

  it('returns 0 for negative mean', () => {
    expect(computeWpm(-50)).toBe(0)
  })

  it('handles very small mean', () => {
    const result = computeWpm(1)
    // (1000/1) * 60 / 5 = 12000
    expect(result).toBeCloseTo(12000)
  })
})

describe('createStatsIngestionStream', () => {
  it('feeds delta to statsApi.update', () => {
    const keystroke$ = new Subject<KeystrokeEvent>()
    const api = createMockStatsApi()

    const sub = createStatsIngestionStream(keystroke$, api).subscribe()

    keystroke$.next(makeKeystroke({ delta: 85 }))

    expect(api.update).toHaveBeenCalledWith(85)

    sub.unsubscribe()
  })

  it('skips first keystroke (delta is undefined)', () => {
    const keystroke$ = new Subject<KeystrokeEvent>()
    const api = createMockStatsApi()

    const sub = createStatsIngestionStream(keystroke$, api).subscribe()

    keystroke$.next(makeKeystroke({ delta: undefined }))

    expect(api.update).not.toHaveBeenCalled()

    sub.unsubscribe()
  })

  it('processes multiple keystrokes in order', () => {
    const keystroke$ = new Subject<KeystrokeEvent>()
    const api = createMockStatsApi()

    const sub = createStatsIngestionStream(keystroke$, api).subscribe()

    keystroke$.next(makeKeystroke({ delta: undefined })) // skipped
    keystroke$.next(makeKeystroke({ delta: 100 }))
    keystroke$.next(makeKeystroke({ delta: 85 }))

    expect(api.update).toHaveBeenCalledTimes(2)
    expect(api.update).toHaveBeenNthCalledWith(1, 100)
    expect(api.update).toHaveBeenNthCalledWith(2, 85)

    sub.unsubscribe()
  })
})

describe('createVisualizationStream', () => {
  it('emits snapshot on frame trigger', () => {
    const api = createMockStatsApi({
      getMean: vi.fn(() => 95),
      getVariance: vi.fn(() => 16),
      getStddev: vi.fn(() => 4),
      getCount: vi.fn(() => 20),
      getHistogram: vi.fn(() => new Uint32Array(20)),
      getOverflow: vi.fn(() => true),
    })
    const frameTrigger$ = new Subject<void>()
    const snapshots: unknown[] = []

    const sub = createVisualizationStream(api, frameTrigger$).subscribe((s) =>
      snapshots.push(s),
    )

    frameTrigger$.next()

    expect(snapshots).toHaveLength(1)
    const snap = snapshots[0] as {
      mean: number
      variance: number
      stddev: number
      count: number
      wpm: number
      overflow: boolean
      histogram: Uint32Array
    }
    expect(snap.mean).toBe(95)
    expect(snap.variance).toBe(16)
    expect(snap.stddev).toBe(4)
    expect(snap.count).toBe(20)
    expect(snap.overflow).toBe(true)
    // WPM = (1000/95)*60/5 ≈ 126.3
    expect(snap.wpm).toBeCloseTo(126.3, 0)
    expect(snap.histogram).toBeInstanceOf(Uint32Array)

    sub.unsubscribe()
  })

  it('emits once per trigger', () => {
    const api = createMockStatsApi()
    const frameTrigger$ = new Subject<void>()
    const snapshots: unknown[] = []

    const sub = createVisualizationStream(api, frameTrigger$).subscribe((s) =>
      snapshots.push(s),
    )

    frameTrigger$.next()
    frameTrigger$.next()
    frameTrigger$.next()

    expect(snapshots).toHaveLength(3)

    sub.unsubscribe()
  })
})

describe('createNetworkSyncStream', () => {
  it('batches keystrokes until flush trigger', () => {
    const keystroke$ = new Subject<KeystrokeEvent>()
    const flush$ = new Subject<void>()
    const batches: KeystrokeEvent[][] = []

    const sub = createNetworkSyncStream(keystroke$, flush$).subscribe((b) =>
      batches.push(b),
    )

    keystroke$.next(makeKeystroke({ key: 'a' }))
    keystroke$.next(makeKeystroke({ key: 'b' }))
    flush$.next()

    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(2)
    expect(batches[0][0].key).toBe('a')
    expect(batches[0][1].key).toBe('b')

    sub.unsubscribe()
  })

  it('skips empty batches', () => {
    const keystroke$ = new Subject<KeystrokeEvent>()
    const flush$ = new Subject<void>()
    const batches: KeystrokeEvent[][] = []

    const sub = createNetworkSyncStream(keystroke$, flush$).subscribe((b) =>
      batches.push(b),
    )

    flush$.next() // no keystrokes buffered

    expect(batches).toHaveLength(0)

    sub.unsubscribe()
  })

  it('resets buffer after flush', () => {
    const keystroke$ = new Subject<KeystrokeEvent>()
    const flush$ = new Subject<void>()
    const batches: KeystrokeEvent[][] = []

    const sub = createNetworkSyncStream(keystroke$, flush$).subscribe((b) =>
      batches.push(b),
    )

    keystroke$.next(makeKeystroke({ key: 'a' }))
    flush$.next()

    keystroke$.next(makeKeystroke({ key: 'b' }))
    flush$.next()

    expect(batches).toHaveLength(2)
    expect(batches[0]).toHaveLength(1)
    expect(batches[1]).toHaveLength(1)
    expect(batches[1][0].key).toBe('b')

    sub.unsubscribe()
  })
})

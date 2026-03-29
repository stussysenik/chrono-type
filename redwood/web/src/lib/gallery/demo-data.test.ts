import { describe, it, expect } from 'vitest'
import { generateDemoData, replayIntoWasm } from './demo-data'

describe('generateDemoData', () => {
  it('generates the requested count', () => {
    const data = generateDemoData(100)
    expect(data).toHaveLength(100)
  })

  it('produces reproducible results with same seed', () => {
    const a = generateDemoData(50, 42)
    const b = generateDemoData(50, 42)
    expect(a).toEqual(b)
  })

  it('all deltas are positive', () => {
    const data = generateDemoData(200)
    for (const d of data) {
      expect(d.delta).toBeGreaterThan(0)
    }
  })

  it('timestamps are monotonically increasing', () => {
    const data = generateDemoData(200)
    for (let i = 1; i < data.length; i++) {
      expect(data[i].timestamp).toBeGreaterThan(data[i - 1].timestamp)
    }
  })
})

describe('replayIntoWasm', () => {
  it('calls update for each keystroke', () => {
    const data = generateDemoData(10)
    const calls: number[] = []
    const mockApi = { update: (d: number) => calls.push(d) }
    replayIntoWasm(data, mockApi)
    expect(calls).toHaveLength(10)
    expect(calls[0]).toBe(data[0].delta)
  })
})

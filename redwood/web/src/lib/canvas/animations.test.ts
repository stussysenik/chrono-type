import { describe, it, expect } from 'vitest'
import { lerp, lerpArray } from './animations'

describe('lerp', () => {
  it('returns start when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns end when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint when t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })

  it('clamps t below 0', () => {
    expect(lerp(10, 20, -0.5)).toBe(10)
  })

  it('clamps t above 1', () => {
    expect(lerp(10, 20, 1.5)).toBe(20)
  })

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0)
  })
})

describe('lerpArray', () => {
  it('interpolates element-wise', () => {
    const current = new Float32Array([0, 10, 20])
    const target = new Float32Array([10, 20, 30])

    const result = lerpArray(current, target, 0.5)

    expect(result[0]).toBeCloseTo(5)
    expect(result[1]).toBeCloseTo(15)
    expect(result[2]).toBeCloseTo(25)
  })

  it('returns start array when t=0', () => {
    const current = new Float32Array([1, 2, 3])
    const target = new Float32Array([10, 20, 30])

    const result = lerpArray(current, target, 0)

    expect(Array.from(result)).toEqual([1, 2, 3])
  })

  it('returns target array when t=1', () => {
    const current = new Float32Array([1, 2, 3])
    const target = new Float32Array([10, 20, 30])

    const result = lerpArray(current, target, 1)

    expect(Array.from(result)).toEqual([10, 20, 30])
  })

  it('writes into provided output array (zero-alloc)', () => {
    const current = new Float32Array([0, 0])
    const target = new Float32Array([100, 200])
    const output = new Float32Array(2)

    const result = lerpArray(current, target, 0.5, output)

    expect(result).toBe(output) // same reference
    expect(output[0]).toBeCloseTo(50)
    expect(output[1]).toBeCloseTo(100)
  })

  it('allocates new array when output not provided', () => {
    const current = new Float32Array([0])
    const target = new Float32Array([10])

    const result = lerpArray(current, target, 0.5)

    expect(result).not.toBe(current)
    expect(result).not.toBe(target)
    expect(result).toBeInstanceOf(Float32Array)
  })
})

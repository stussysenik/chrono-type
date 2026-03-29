import { describe, it, expect } from 'vitest'
import { createSpring, updateSpring, createSpringArray, updateSprings } from './spring'

describe('spring physics', () => {
  it('moves toward target', () => {
    const s = createSpring(0)
    s.target = 100
    for (let i = 0; i < 300; i++) updateSpring(s)
    expect(s.position).toBeCloseTo(100, 0)
  })

  it('overshoots then settles (underdamped)', () => {
    const s = createSpring(0)
    s.target = 100
    let maxPos = 0
    for (let i = 0; i < 300; i++) {
      updateSpring(s, 180, 8) // lower damping = more overshoot
      if (s.position > maxPos) maxPos = s.position
    }
    expect(maxPos).toBeGreaterThan(100) // overshoots
    expect(s.position).toBeCloseTo(100, 0) // settles
  })

  it('createSpringArray creates N springs', () => {
    const arr = createSpringArray(20, 5)
    expect(arr).toHaveLength(20)
    expect(arr[0].position).toBe(5)
  })
})

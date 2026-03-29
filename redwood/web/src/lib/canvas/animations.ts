/**
 * Animation utility functions for smooth histogram transitions.
 *
 * `lerp` and `lerpArray` are the building blocks for frame-by-frame
 * interpolation of bar heights, keeping the rendering smooth at 60fps
 * without allocating new arrays on the hot path.
 */

/**
 * Linear interpolation between two values.
 *
 * @param start - Value at t=0
 * @param end   - Value at t=1
 * @param t     - Interpolation factor, clamped to [0, 1]
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  return start + (end - start) * clamped
}

/**
 * Element-wise linear interpolation between two Float32Arrays.
 *
 * When `output` is provided, results are written into it (zero-alloc path).
 * Otherwise a new Float32Array is allocated and returned.
 *
 * @param current - Current values
 * @param target  - Target values to interpolate toward
 * @param t       - Interpolation factor, clamped to [0, 1]
 * @param output  - Optional pre-allocated output array (must be same length)
 * @returns The output array containing interpolated values
 */
export function lerpArray(
  current: Float32Array,
  target: Float32Array,
  t: number,
  output?: Float32Array,
): Float32Array {
  const result = output ?? new Float32Array(current.length)
  for (let i = 0; i < current.length; i++) {
    result[i] = lerp(current[i], target[i], t)
  }
  return result
}

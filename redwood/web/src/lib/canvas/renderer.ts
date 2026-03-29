/**
 * Canvas 2D histogram renderer with a Stripe-inspired dark aesthetic.
 *
 * Renders a 20-bin latency histogram with smooth bar animations,
 * axis labels, and a stats summary row. Designed for the 60fps hot path:
 * - Pre-allocated Float32Arrays for current/target heights (zero-alloc draw)
 * - lerp-based animation toward target heights each frame
 * - Monospace font for the stats row to avoid layout jitter
 */

import { lerp } from './animations'
import { HISTOGRAM_BIN_COUNT, HISTOGRAM_BIN_WIDTH_MS } from '../wasm/stats'

// ── Color palette (Stripe dark aesthetic) ───────────────────────────────────

export const COLORS = {
  background: '#0a0a0a',
  bar: '#e5e5e5',
  label: '#888888',
  tick: '#555555',
  statsValue: '#e5e5e5',
  statsLabel: '#555555',
} as const

// ── Layout constants ────────────────────────────────────────────────────────

const PADDING = { left: 50, right: 20, top: 20, bottom: 80 } as const
const BAR_GAP = 2
const LERP_SPEED = 0.12 // per-frame interpolation factor

// ── Types ───────────────────────────────────────────────────────────────────

export interface DrawStats {
  histogram: Uint32Array
  mean: number
  stddev: number
  wpm: number
  count: number
}

// ── Renderer ────────────────────────────────────────────────────────────────

export class HistogramRenderer {
  private ctx: CanvasRenderingContext2D | null = null
  private canvas: HTMLCanvasElement | null = null
  private currentHeights = new Float32Array(HISTOGRAM_BIN_COUNT)
  private targetHeights = new Float32Array(HISTOGRAM_BIN_COUNT)

  /**
   * Binds the renderer to a canvas element.
   * @throws If getContext('2d') returns null (e.g., canvas already has a WebGL context).
   */
  init(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2d context from canvas')
    }
    this.canvas = canvas
    this.ctx = ctx
    this.currentHeights.fill(0)
    this.targetHeights.fill(0)
  }

  /**
   * Draws one frame of the histogram.
   * No-op if `init` hasn't been called or `destroy` has been called.
   */
  draw(stats: DrawStats): void {
    const { ctx, canvas } = this
    if (!ctx || !canvas) return

    const w = canvas.width
    const h = canvas.height

    // ── Clear ───────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, w, h)

    // ── Background ──────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, w, h)

    // ── Compute draw area ───────────────────────────────────────────────
    const chartLeft = PADDING.left
    const chartRight = w - PADDING.right
    const chartTop = PADDING.top
    const chartBottom = h - PADDING.bottom
    const chartWidth = chartRight - chartLeft
    const chartHeight = chartBottom - chartTop

    // ── Compute target heights from histogram ───────────────────────────
    const maxCount = Math.max(1, ...Array.from(stats.histogram))
    for (let i = 0; i < HISTOGRAM_BIN_COUNT; i++) {
      this.targetHeights[i] = (stats.histogram[i] / maxCount) * chartHeight
    }

    // ── Lerp current toward target ──────────────────────────────────────
    for (let i = 0; i < HISTOGRAM_BIN_COUNT; i++) {
      this.currentHeights[i] = lerp(
        this.currentHeights[i],
        this.targetHeights[i],
        LERP_SPEED,
      )
    }

    // ── Draw bars ───────────────────────────────────────────────────────
    const barSlotWidth = chartWidth / HISTOGRAM_BIN_COUNT
    const barWidth = barSlotWidth - BAR_GAP

    for (let i = 0; i < HISTOGRAM_BIN_COUNT; i++) {
      const barHeight = this.currentHeights[i]
      if (barHeight < 0.5) continue // skip negligible bars

      const x = chartLeft + i * barSlotWidth
      const y = chartBottom - barHeight

      // Opacity gradient: fuller bins are more opaque
      const opacity = 0.4 + 0.6 * (barHeight / chartHeight)
      ctx.globalAlpha = opacity
      ctx.fillStyle = COLORS.bar
      ctx.fillRect(x, y, barWidth, barHeight)
    }

    ctx.globalAlpha = 1

    // ── X-axis tick labels (every 5 bins = 50ms) ────────────────────────
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = COLORS.tick

    for (let i = 0; i <= HISTOGRAM_BIN_COUNT; i += 5) {
      const x = chartLeft + i * barSlotWidth
      const label = `${i * HISTOGRAM_BIN_WIDTH_MS}ms`
      ctx.fillText(label, x, chartBottom + 4)
    }

    // ── Y-axis label ────────────────────────────────────────────────────
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = COLORS.label
    ctx.fillText(String(maxCount), chartLeft - 8, chartTop)
    ctx.fillText('0', chartLeft - 8, chartBottom)

    // ── Stats row ───────────────────────────────────────────────────────
    const statsY = h - 20
    const statsSpacing = chartWidth / 4
    const statsItems = [
      { label: 'Mean', value: `${stats.mean.toFixed(1)}ms` },
      { label: 'Std Dev', value: `${stats.stddev.toFixed(1)}ms` },
      { label: 'WPM', value: String(Math.round(stats.wpm)) },
      { label: 'Keystrokes', value: String(stats.count) },
    ]

    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '11px monospace'

    for (let i = 0; i < statsItems.length; i++) {
      const x = chartLeft + statsSpacing * i + statsSpacing / 2
      const { label, value } = statsItems[i]

      ctx.fillStyle = COLORS.statsLabel
      ctx.fillText(label, x, statsY - 12)

      ctx.fillStyle = COLORS.statsValue
      ctx.font = '13px monospace'
      ctx.fillText(value, x, statsY)
      ctx.font = '11px monospace'
    }
  }

  /**
   * Releases canvas and context references.
   * After calling destroy, `draw()` becomes a no-op.
   */
  destroy(): void {
    this.ctx = null
    this.canvas = null
  }
}

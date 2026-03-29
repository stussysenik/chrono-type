/**
 * Scatter Renderer - Particle Cloud
 *
 * Each keystroke appears as a glowing particle dot, building a luminous
 * point cloud of typing latency over time. A ring buffer of 200 points
 * fades with age, while outliers pulse red. An exponential moving average
 * line and confidence band reveal the typist's rhythm.
 *
 * Density visualization adds bloom where dots cluster — creating a
 * nebula-like effect that makes patterns pop.
 *
 * Canvas 2D only.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'

// ── Constants ─────────────────────────────────────────────────────────────────

const BUFFER_SIZE = 200
const Y_MAX_MS = 200
const FADE_FRAMES = 200

// ── Colors ────────────────────────────────────────────────────────────────────

const DOT_CYAN = '#0ea5e9'
const OUTLIER_RED = '#ef4444'
const MEAN_AMBER = '#f59e0b'
const BAND_CYAN = 'rgba(14, 165, 233, 0.08)'
const GRID_COLOR = '#1a1a1a'
const BG = '#000000'

// ── Data point ────────────────────────────────────────────────────────────────

interface ScatterPoint {
  index: number
  delta: number
  birthFrame: number
}

export class ScatterRenderer extends GalleryRenderer {
  private points: ScatterPoint[] = []
  private lastReplayIndex = -1
  private globalIndex = 0
  private ema = 0
  private emaInitialized = false

  // Running stats for outlier detection (local ring buffer stats)
  private runSum = 0
  private runSumSq = 0
  private noiseField: { x: number; y: number; a: number }[] = []

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.points = []
    this.lastReplayIndex = -1
    this.globalIndex = 0
    this.ema = 0
    this.emaInitialized = false
    this.runSum = 0
    this.runSumSq = 0

    // Seed subtle noise texture dots (static starfield)
    this.noiseField = []
    for (let i = 0; i < 120; i++) {
      this.noiseField.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        a: 0.02 + Math.random() * 0.04,
      })
    }
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, statsApi, frameCount, lastKeystroke, replayIndex } = context
    if (!ctx) return

    // ── Ingest new data ─────────────────────────────────────────────────

    if (lastKeystroke && replayIndex !== this.lastReplayIndex) {
      const pt: ScatterPoint = {
        index: this.globalIndex++,
        delta: lastKeystroke.delta,
        birthFrame: frameCount,
      }
      this.points.push(pt)

      // Maintain ring buffer
      if (this.points.length > BUFFER_SIZE) {
        const removed = this.points.shift()!
        this.runSum -= removed.delta
        this.runSumSq -= removed.delta * removed.delta
      }

      this.runSum += pt.delta
      this.runSumSq += pt.delta * pt.delta

      // Update EMA (alpha = 0.1 for smooth tracking)
      if (!this.emaInitialized) {
        this.ema = pt.delta
        this.emaInitialized = true
      } else {
        this.ema = 0.9 * this.ema + 0.1 * pt.delta
      }

      this.lastReplayIndex = replayIndex
    }

    // ── Layout ──────────────────────────────────────────────────────────

    const chartLeft = 52
    const chartRight = width - 20
    const chartTop = 28
    const chartBottom = height - 32
    const chartW = chartRight - chartLeft
    const chartH = chartBottom - chartTop

    // ── Background ──────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // Subtle noise texture
    for (const n of this.noiseField) {
      ctx.globalAlpha = n.a * (0.6 + 0.4 * Math.sin(frameCount * 0.01 + n.x * 0.05))
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(n.x, n.y, 1, 1)
    }
    ctx.globalAlpha = 1

    // ── Gridlines at 50ms intervals ─────────────────────────────────────

    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 0.5
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#444444'

    for (let ms = 0; ms <= Y_MAX_MS; ms += 50) {
      const y = chartBottom - (ms / Y_MAX_MS) * chartH
      ctx.beginPath()
      ctx.moveTo(chartLeft, y)
      ctx.lineTo(chartRight, y)
      ctx.stroke()
      ctx.fillText(`${ms}ms`, chartLeft - 6, y + 3)
    }

    // ── Compute local buffer statistics ─────────────────────────────────

    const n = this.points.length
    const bufferMean = n > 0 ? this.runSum / n : 0
    const bufferVariance = n > 1
      ? (this.runSumSq - (this.runSum * this.runSum) / n) / (n - 1)
      : 0
    const bufferStddev = Math.sqrt(Math.max(0, bufferVariance))
    const outlierThreshold = bufferMean + 2 * bufferStddev

    // ── Confidence band (mean +/- stddev) ───────────────────────────────

    if (n > 2 && bufferStddev > 0) {
      const upperMs = Math.min(bufferMean + bufferStddev, Y_MAX_MS)
      const lowerMs = Math.max(bufferMean - bufferStddev, 0)
      const upperY = chartBottom - (upperMs / Y_MAX_MS) * chartH
      const lowerY = chartBottom - (lowerMs / Y_MAX_MS) * chartH

      ctx.fillStyle = BAND_CYAN
      ctx.fillRect(chartLeft, upperY, chartW, lowerY - upperY)
    }

    // ── Density bloom layer ─────────────────────────────────────────────
    // Pre-pass: compute density clusters via grid binning for bloom

    if (n > 4) {
      const gridCols = 20
      const gridRows = 10
      const density: number[] = new Array(gridCols * gridRows).fill(0)

      for (const pt of this.points) {
        const age = frameCount - pt.birthFrame
        if (age >= FADE_FRAMES) continue
        const xNorm = (pt.index - this.points[0].index) / Math.max(1, BUFFER_SIZE - 1)
        const yNorm = Math.min(pt.delta, Y_MAX_MS) / Y_MAX_MS
        const gi = Math.floor(xNorm * (gridCols - 1))
        const gj = Math.floor((1 - yNorm) * (gridRows - 1))
        const idx = Math.max(0, Math.min(gridCols * gridRows - 1, gj * gridCols + gi))
        density[idx]++
      }

      const maxDensity = Math.max(1, ...density)

      for (let gj = 0; gj < gridRows; gj++) {
        for (let gi = 0; gi < gridCols; gi++) {
          const d = density[gj * gridCols + gi]
          if (d < 2) continue
          const norm = d / maxDensity
          const cx = chartLeft + (gi / (gridCols - 1)) * chartW
          const cy = chartTop + (gj / (gridRows - 1)) * chartH
          const radius = 20 + norm * 30

          const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
          bloom.addColorStop(0, `rgba(14, 165, 233, ${0.06 * norm})`)
          bloom.addColorStop(1, 'transparent')
          ctx.fillStyle = bloom
          ctx.beginPath()
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // ── Draw scatter dots ───────────────────────────────────────────────

    const startIndex = this.points.length > 0 ? this.points[0].index : 0

    for (const pt of this.points) {
      const age = frameCount - pt.birthFrame
      if (age >= FADE_FRAMES) continue

      const alpha = 1 - age / FADE_FRAMES
      const xNorm = (pt.index - startIndex) / Math.max(1, BUFFER_SIZE - 1)
      const x = chartLeft + xNorm * chartW
      const clampedDelta = Math.min(pt.delta, Y_MAX_MS)
      const y = chartBottom - (clampedDelta / Y_MAX_MS) * chartH

      const isOutlier = pt.delta > outlierThreshold && n > 4

      // Radial gradient glow for each dot
      const dotRadius = isOutlier ? 5 : 3.5
      const glow = ctx.createRadialGradient(x, y, 0, x, y, dotRadius * 2.5)
      const color = isOutlier ? OUTLIER_RED : DOT_CYAN
      glow.addColorStop(0, color)
      glow.addColorStop(0.4, `${color}88`)
      glow.addColorStop(1, 'transparent')

      ctx.globalAlpha = alpha * 0.7
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, dotRadius * 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Core dot
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, dotRadius * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Outlier pulsing ring
      if (isOutlier) {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(frameCount * 0.08 + pt.index))
        ctx.globalAlpha = alpha * pulse * 0.6
        ctx.strokeStyle = OUTLIER_RED
        ctx.lineWidth = 1.5
        const ringRadius = dotRadius + 3 + 2 * Math.sin(frameCount * 0.06 + pt.index)
        ctx.beginPath()
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // ── EMA line (smooth mean) ──────────────────────────────────────────

    if (n >= 2) {
      // Build EMA path from points
      const emaPoints: { x: number; y: number }[] = []
      let localEma = this.points[0].delta

      for (let i = 0; i < this.points.length; i++) {
        localEma = 0.9 * localEma + 0.1 * this.points[i].delta
        const xNorm = (this.points[i].index - startIndex) / Math.max(1, BUFFER_SIZE - 1)
        const x = chartLeft + xNorm * chartW
        const clampedEma = Math.min(localEma, Y_MAX_MS)
        const y = chartBottom - (clampedEma / Y_MAX_MS) * chartH
        emaPoints.push({ x, y })
      }

      // Glow pass
      ctx.beginPath()
      ctx.moveTo(emaPoints[0].x, emaPoints[0].y)
      for (let i = 1; i < emaPoints.length; i++) {
        ctx.lineTo(emaPoints[i].x, emaPoints[i].y)
      }
      ctx.strokeStyle = MEAN_AMBER
      ctx.globalAlpha = 0.2
      ctx.lineWidth = 6
      ctx.shadowColor = MEAN_AMBER
      ctx.shadowBlur = 12
      ctx.stroke()
      ctx.shadowBlur = 0

      // Core pass
      ctx.beginPath()
      ctx.moveTo(emaPoints[0].x, emaPoints[0].y)
      for (let i = 1; i < emaPoints.length; i++) {
        ctx.lineTo(emaPoints[i].x, emaPoints[i].y)
      }
      ctx.strokeStyle = MEAN_AMBER
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // ── Title ───────────────────────────────────────────────────────────

    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#555555'
    ctx.fillText('SCATTER CLOUD', chartLeft, 18)

    ctx.textAlign = 'right'
    ctx.font = '10px monospace'
    ctx.fillStyle = '#444444'
    ctx.fillText(`${n}/${BUFFER_SIZE} points`, chartRight, 18)

    // ── Legend ───────────────────────────────────────────────────────────

    const legendY = height - 12
    ctx.font = '9px monospace'
    ctx.textAlign = 'left'

    // Cyan dot
    ctx.fillStyle = DOT_CYAN
    ctx.beginPath()
    ctx.arc(chartLeft + 4, legendY - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#555'
    ctx.fillText('normal', chartLeft + 12, legendY)

    // Red dot
    ctx.fillStyle = OUTLIER_RED
    ctx.beginPath()
    ctx.arc(chartLeft + 72, legendY - 3, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#555'
    ctx.fillText('outlier (>2\u03C3)', chartLeft + 80, legendY)

    // Amber line
    ctx.strokeStyle = MEAN_AMBER
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(chartLeft + 168, legendY - 3)
    ctx.lineTo(chartLeft + 182, legendY - 3)
    ctx.stroke()
    ctx.fillStyle = '#555'
    ctx.fillText('EMA', chartLeft + 188, legendY)

    // Stats readout
    const mean = statsApi.getMean()
    const stddev = statsApi.getStddev()
    ctx.textAlign = 'right'
    ctx.fillStyle = MEAN_AMBER
    ctx.fillText(`\u03BC ${mean.toFixed(1)}ms`, chartRight, legendY)
    ctx.fillStyle = '#666'
    ctx.fillText(`\u03C3 ${stddev.toFixed(1)}ms  `, chartRight - 70, legendY)
  }

  destroy(): void {
    this.points = []
    this.noiseField = []
    super.destroy()
  }
}

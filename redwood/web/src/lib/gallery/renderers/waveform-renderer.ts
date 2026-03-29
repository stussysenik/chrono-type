/**
 * Waveform Renderer - EKG Heartbeat
 *
 * Rolling EKG-style chart of inter-key intervals. A ring buffer holds the
 * last 100 delta values, rendered as a triple-pass glowing line with
 * Catmull-Rom interpolation for silky-smooth curves.
 *
 * Visual effects: bloom glow, expanding pulse on newest point, pulsing
 * mean line, stddev ribbon, and faint gridlines.
 *
 * Canvas 2D only.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'

// ── Pulse animation on newest data point ───────────────────────────────────

interface PulseRing {
  x: number
  y: number
  radius: number
  alpha: number
}

// ── Colors ─────────────────────────────────────────────────────────────────

const LINE_COLOR = '#22c55e'
const LINE_GLOW = '#14b8a6'
const MEAN_COLOR = '#f59e0b'
const RIBBON_COLOR = 'rgba(34, 197, 94, 0.1)'
const GRID_COLOR = '#1a1a1a'
const BG = '#000000'

const BUFFER_SIZE = 100
const Y_MAX_MS = 200 // max latency on Y axis

export class WaveformRenderer extends GalleryRenderer {
  private buffer: number[] = []
  private lastReplayIndex = -1
  private pulses: PulseRing[] = []

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.buffer = []
    this.lastReplayIndex = -1
    this.pulses = []
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, statsApi, frameCount, lastKeystroke, replayIndex } = context
    if (!ctx) return

    // ── Ingest new data ────────────────────────────────────────────────

    if (lastKeystroke && replayIndex !== this.lastReplayIndex) {
      this.buffer.push(lastKeystroke.delta)
      if (this.buffer.length > BUFFER_SIZE) {
        this.buffer.shift()
      }
      this.lastReplayIndex = replayIndex

      // Spawn pulse on newest point
      const chartLeft = 48
      const chartRight = width - 20
      const chartTop = 28
      const chartBottom = height - 40
      const chartW = chartRight - chartLeft

      const nx = chartRight
      const clampedDelta = Math.min(lastKeystroke.delta, Y_MAX_MS)
      const ny = chartBottom - (clampedDelta / Y_MAX_MS) * (chartBottom - chartTop)

      this.pulses.push({
        x: chartLeft + (chartW * (this.buffer.length - 1)) / Math.max(1, this.buffer.length - 1),
        y: ny,
        radius: 3,
        alpha: 1,
      })
    }

    // ── Layout ─────────────────────────────────────────────────────────

    const chartLeft = 48
    const chartRight = width - 20
    const chartTop = 28
    const chartBottom = height - 40
    const chartW = chartRight - chartLeft
    const chartH = chartBottom - chartTop

    // ── Background ─────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // ── Y-axis gridlines at 50ms intervals ─────────────────────────────

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

    // ── Compute mean and stddev from buffer ────────────────────────────

    const mean = statsApi.getMean()
    const stddev = statsApi.getStddev()
    const count = statsApi.getCount()

    // ── Stddev ribbon ──────────────────────────────────────────────────

    if (count > 2 && stddev > 0) {
      const meanY = chartBottom - (Math.min(mean, Y_MAX_MS) / Y_MAX_MS) * chartH
      const upperY = chartBottom - (Math.min(mean + stddev, Y_MAX_MS) / Y_MAX_MS) * chartH
      const lowerY = chartBottom - (Math.max(mean - stddev, 0) / Y_MAX_MS) * chartH

      ctx.fillStyle = RIBBON_COLOR
      ctx.fillRect(chartLeft, upperY, chartW, lowerY - upperY)

      // ── Mean line (pulsing dashed) ───────────────────────────────────

      const meanPulse = 0.3 + 0.3 * Math.sin(frameCount * 0.04)
      ctx.strokeStyle = MEAN_COLOR
      ctx.globalAlpha = meanPulse
      ctx.lineWidth = 1
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(chartLeft, meanY)
      ctx.lineTo(chartRight, meanY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      // Mean label
      ctx.font = '10px monospace'
      ctx.fillStyle = MEAN_COLOR
      ctx.textAlign = 'left'
      ctx.fillText(`\u03BC ${mean.toFixed(1)}ms`, chartRight + 2, meanY - 8)
      ctx.fillStyle = '#666666'
      ctx.fillText(`\u03C3 ${stddev.toFixed(1)}`, chartRight + 2, meanY + 10)
    }

    // ── Draw the waveform line (triple-pass glow) ──────────────────────

    if (this.buffer.length >= 2) {
      // Compute screen points
      const points: { x: number; y: number }[] = this.buffer.map((delta, i) => ({
        x: chartLeft + (chartW * i) / (this.buffer.length - 1),
        y: chartBottom - (Math.min(delta, Y_MAX_MS) / Y_MAX_MS) * chartH,
      }))

      // Pass 1: Wide bloom
      this.drawCatmullRomPath(ctx, points)
      ctx.strokeStyle = LINE_GLOW
      ctx.globalAlpha = 0.15
      ctx.lineWidth = 10
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      // Pass 2: Medium glow
      this.drawCatmullRomPath(ctx, points)
      ctx.strokeStyle = LINE_COLOR
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 4
      ctx.stroke()

      // Pass 3: Core thin line
      this.drawCatmullRomPath(ctx, points)
      ctx.strokeStyle = LINE_COLOR
      ctx.globalAlpha = 1
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Small dots at each data point (subtle)
      ctx.fillStyle = LINE_COLOR
      ctx.globalAlpha = 0.6
      for (const pt of points) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Bright dot on newest point
      if (points.length > 0) {
        const newest = points[points.length - 1]
        const newestGlow = ctx.createRadialGradient(
          newest.x, newest.y, 0,
          newest.x, newest.y, 8
        )
        newestGlow.addColorStop(0, LINE_COLOR)
        newestGlow.addColorStop(0.5, `${LINE_COLOR}66`)
        newestGlow.addColorStop(1, 'transparent')
        ctx.fillStyle = newestGlow
        ctx.beginPath()
        ctx.arc(newest.x, newest.y, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(newest.x, newest.y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── Pulse rings ────────────────────────────────────────────────────

    this.pulses = this.pulses.filter((p) => {
      p.radius += 1.5
      p.alpha -= 0.04

      if (p.alpha <= 0) return false

      ctx.strokeStyle = LINE_COLOR
      ctx.globalAlpha = p.alpha
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.stroke()

      return true
    })
    ctx.globalAlpha = 1

    // ── Scanline effect (moving vertical bar, subtle) ──────────────────

    if (this.buffer.length > 0) {
      const scanX =
        chartLeft +
        (chartW * (this.buffer.length - 1)) / Math.max(1, BUFFER_SIZE - 1)
      const scanGrad = ctx.createLinearGradient(scanX - 20, 0, scanX + 4, 0)
      scanGrad.addColorStop(0, 'transparent')
      scanGrad.addColorStop(0.8, `${LINE_COLOR}15`)
      scanGrad.addColorStop(1, `${LINE_COLOR}30`)
      ctx.fillStyle = scanGrad
      ctx.fillRect(scanX - 20, chartTop, 24, chartH)
    }

    // ── Title ──────────────────────────────────────────────────────────

    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#555555'
    ctx.fillText('INTER-KEY INTERVAL', chartLeft, 18)

    // Count indicator
    ctx.textAlign = 'right'
    ctx.font = '10px monospace'
    ctx.fillStyle = '#444444'
    ctx.fillText(`${this.buffer.length}/${BUFFER_SIZE} samples`, chartRight, 18)
  }

  // ── Catmull-Rom spline through points ────────────────────────────────────

  private drawCatmullRomPath(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[]
  ): void {
    if (points.length < 2) return

    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)

    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y)
      return
    }

    // Catmull-Rom to cubic bezier conversion
    // For each segment [i, i+1], we use points [i-1, i, i+1, i+2] as control
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      // Tension factor (0.5 = standard Catmull-Rom)
      const t = 0.5

      const cp1x = p1.x + (p2.x - p0.x) * t / 3
      const cp1y = p1.y + (p2.y - p0.y) * t / 3
      const cp2x = p2.x - (p3.x - p1.x) * t / 3
      const cp2y = p2.y - (p3.y - p1.y) * t / 3

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
    }
  }

  destroy(): void {
    this.buffer = []
    this.pulses = []
    super.destroy()
  }
}

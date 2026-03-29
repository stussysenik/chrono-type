/**
 * Stats Renderer - Odometer Dashboard
 *
 * The "signature" visualization: big beautiful dashboard numbers with
 * mechanical odometer digit animation, sparkline trails, a radar/spider
 * chart in the center, and a typing-speed-reactive particle field.
 *
 * 4 stat readouts in a 2x2 grid — Mean, StdDev, WPM, Keystrokes —
 * each with spring-physics digit scrolling and a glowing bezier sparkline.
 * The radar chart maps Speed, Consistency, Endurance, and Rhythm into
 * a filled polygon.
 *
 * Canvas 2D only - uses spring.ts for odometer physics.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'
import { createSpringArray, updateSprings, type Spring } from '../spring'

// ── Constants ─────────────────────────────────────────────────────────────────

const SPARKLINE_SIZE = 50
const DIGIT_COUNT = 5 // max digits per stat (e.g., "00123")
const DIGIT_H = 28
const DIGIT_W = 16

// ── Colors ────────────────────────────────────────────────────────────────────

const DIGIT_COLOR = '#e5e5e5'
const LABEL_COLOR = '#555555'
const SPARKLINE_COLOR = '#0ea5e9'
const RADAR_FILL = 'rgba(14, 165, 233, 0.15)'
const RADAR_BORDER = 'rgba(14, 165, 233, 0.8)'
const BG = '#000000'

// ── Stat definition ───────────────────────────────────────────────────────────

interface StatConfig {
  label: string
  unit: string
  gridCol: number
  gridRow: number
}

const STATS: StatConfig[] = [
  { label: 'MEAN', unit: 'ms', gridCol: 0, gridRow: 0 },
  { label: 'STD DEV', unit: 'ms', gridCol: 1, gridRow: 0 },
  { label: 'WPM', unit: '', gridCol: 0, gridRow: 1 },
  { label: 'KEYSTROKES', unit: '', gridCol: 1, gridRow: 1 },
]

// ── Background particle ──────────────────────────────────────────────────────

interface BgParticle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
  baseSpeed: number
}

export class StatsRenderer extends GalleryRenderer {
  /** Springs for each digit position across all 4 stats (4 * DIGIT_COUNT) */
  private digitSprings: Spring[] = createSpringArray(4 * DIGIT_COUNT, 0)
  /** Previous digit targets to detect changes */
  private prevDigitTargets: number[] = new Array(4 * DIGIT_COUNT).fill(0)
  /** Sparkline ring buffers for each of the 4 stats */
  private sparklines: number[][] = [[], [], [], []]
  /** Background particles */
  private particles: BgParticle[] = []
  /** Running min/max delta for rhythm calculation */
  private minDelta = Infinity
  private maxDelta = 0
  private lastReplayIndex = -1

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.digitSprings = createSpringArray(4 * DIGIT_COUNT, 0)
    this.prevDigitTargets = new Array(4 * DIGIT_COUNT).fill(0)
    this.sparklines = [[], [], [], []]
    this.minDelta = Infinity
    this.maxDelta = 0
    this.lastReplayIndex = -1

    // Seed particles
    this.particles = []
    for (let i = 0; i < 60; i++) {
      this.particles.push(this.createParticle(canvas.width, canvas.height))
    }
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, statsApi, frameCount, lastKeystroke, replayIndex } = context
    if (!ctx) return

    // ── Read stats ──────────────────────────────────────────────────────

    const mean = statsApi.getMean()
    const stddev = statsApi.getStddev()
    const count = statsApi.getCount()
    const wpm = count > 1 && mean > 0 ? Math.round(60000 / (mean * 5)) : 0

    // Track min/max for rhythm
    if (lastKeystroke && replayIndex !== this.lastReplayIndex) {
      this.lastReplayIndex = replayIndex
      if (lastKeystroke.delta < this.minDelta) this.minDelta = lastKeystroke.delta
      if (lastKeystroke.delta > this.maxDelta) this.maxDelta = lastKeystroke.delta
    }

    // Stat values as display integers (mean/stddev * 10 for one decimal)
    const statValues = [
      Math.round(mean * 10),   // Mean * 10 (e.g., 751 = 75.1ms)
      Math.round(stddev * 10), // StdDev * 10
      wpm,                     // WPM
      count,                   // Keystrokes
    ]

    // Update sparklines
    if (frameCount % 3 === 0) {
      const sparkVals = [mean, stddev, wpm, count]
      for (let si = 0; si < 4; si++) {
        this.sparklines[si].push(sparkVals[si])
        if (this.sparklines[si].length > SPARKLINE_SIZE) {
          this.sparklines[si].shift()
        }
      }
    }

    // ── Update digit springs ────────────────────────────────────────────

    for (let si = 0; si < 4; si++) {
      const val = statValues[si]
      const str = Math.abs(val).toString().padStart(DIGIT_COUNT, '0')

      for (let di = 0; di < DIGIT_COUNT; di++) {
        const idx = si * DIGIT_COUNT + di
        const digit = parseInt(str[di], 10)
        this.digitSprings[idx].target = digit
      }
    }

    updateSprings(this.digitSprings, 120, 14)

    // ── Layout ──────────────────────────────────────────────────────────

    const cellW = width / 2
    const cellH = height / 2
    const radarCx = width / 2
    const radarCy = height / 2
    const radarR = Math.min(cellW, cellH) * 0.28

    // ── Background ──────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // ── Particle field (speed-reactive) ─────────────────────────────────

    const speedMultiplier = 0.3 + (wpm / 150) * 2
    for (const p of this.particles) {
      p.x += p.vx * speedMultiplier
      p.y += p.vy * speedMultiplier

      // Wrap around
      if (p.x < -5) p.x = width + 5
      if (p.x > width + 5) p.x = -5
      if (p.y < -5) p.y = height + 5
      if (p.y > height + 5) p.y = -5

      const flicker = 0.5 + 0.5 * Math.sin(frameCount * 0.03 + p.x * 0.02)
      ctx.globalAlpha = p.alpha * flicker * Math.min(1, speedMultiplier * 0.8)
      ctx.fillStyle = SPARKLINE_COLOR
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // ── Radar / spider chart (center) ───────────────────────────────────

    // 4 axes: Speed, Consistency, Endurance, Rhythm
    const speed = Math.min(1, wpm / 150)
    const consistency = Math.min(1, Math.max(0, 1 - stddev / 100))
    const endurance = Math.min(1, count / 500)
    const rhythm = this.maxDelta > this.minDelta
      ? Math.min(1, Math.max(0, 1 - (this.maxDelta - this.minDelta) / 200))
      : 0

    const radarValues = [speed, consistency, endurance, rhythm]
    const radarLabels = ['SPD', 'CST', 'END', 'RHY']
    const radarAngles = radarValues.map((_, i) => (i * Math.PI * 2) / 4 - Math.PI / 2)

    // Axis lines
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 4; i++) {
      const ax = radarCx + Math.cos(radarAngles[i]) * radarR
      const ay = radarCy + Math.sin(radarAngles[i]) * radarR
      ctx.beginPath()
      ctx.moveTo(radarCx, radarCy)
      ctx.lineTo(ax, ay)
      ctx.stroke()
    }

    // Concentric rings
    for (let ring = 1; ring <= 3; ring++) {
      const r = (radarR * ring) / 3
      ctx.strokeStyle = '#1a1a1a'
      ctx.beginPath()
      for (let i = 0; i <= 4; i++) {
        const angle = radarAngles[i % 4]
        const px = radarCx + Math.cos(angle) * r
        const py = radarCy + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Data polygon (filled)
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const r = radarValues[i] * radarR
      const px = radarCx + Math.cos(radarAngles[i]) * r
      const py = radarCy + Math.sin(radarAngles[i]) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()

    // Fill with glow
    ctx.fillStyle = RADAR_FILL
    ctx.fill()
    ctx.strokeStyle = RADAR_BORDER
    ctx.lineWidth = 1.5
    ctx.shadowColor = SPARKLINE_COLOR
    ctx.shadowBlur = 8
    ctx.stroke()
    ctx.shadowBlur = 0

    // Radar vertex dots
    for (let i = 0; i < 4; i++) {
      const r = radarValues[i] * radarR
      const px = radarCx + Math.cos(radarAngles[i]) * r
      const py = radarCy + Math.sin(radarAngles[i]) * r

      ctx.fillStyle = SPARKLINE_COLOR
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()

      // Axis labels
      const lx = radarCx + Math.cos(radarAngles[i]) * (radarR + 14)
      const ly = radarCy + Math.sin(radarAngles[i]) * (radarR + 14)
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#555'
      ctx.fillText(radarLabels[i], lx, ly)
    }

    // ── Draw stat readouts (2x2 grid) ───────────────────────────────────

    for (let si = 0; si < 4; si++) {
      const config = STATS[si]
      const ox = config.gridCol * cellW + 16
      const oy = config.gridRow * cellH + 20

      // ── Odometer digits ───────────────────────────────────────────────

      const odometerX = ox + 8
      const odometerY = oy + 10

      // Whether this stat uses decimal (mean and stddev)
      const isDecimal = si < 2

      for (let di = 0; di < DIGIT_COUNT; di++) {
        const springIdx = si * DIGIT_COUNT + di
        const spring = this.digitSprings[springIdx]
        const x = odometerX + di * DIGIT_W
        const digitOffset = di === DIGIT_COUNT - 1 && isDecimal ? 3 : 0

        // Clip region for odometer effect
        ctx.save()
        ctx.beginPath()
        ctx.rect(x + digitOffset, odometerY, DIGIT_W - 2, DIGIT_H)
        ctx.clip()

        // Draw scrolling digit strip
        const currentDigit = spring.position
        const baseDigit = Math.floor(currentDigit)
        const frac = currentDigit - baseDigit

        for (let d = -1; d <= 1; d++) {
          const digit = ((baseDigit + d) % 10 + 10) % 10
          const yOff = odometerY + DIGIT_H / 2 + 6 - (frac - d) * DIGIT_H

          // Fade digits that are far from center
          const distFromCenter = Math.abs(yOff - (odometerY + DIGIT_H / 2))
          const digitAlpha = Math.max(0, 1 - distFromCenter / DIGIT_H)

          ctx.globalAlpha = digitAlpha
          ctx.font = 'bold 20px monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = DIGIT_COLOR
          ctx.fillText(digit.toString(), x + digitOffset + DIGIT_W / 2, yOff)
        }

        ctx.restore()
        ctx.globalAlpha = 1

        // Draw decimal point
        if (isDecimal && di === DIGIT_COUNT - 2) {
          ctx.fillStyle = DIGIT_COLOR
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(x + DIGIT_W + 1, odometerY + DIGIT_H - 4, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }

      // Unit label
      if (config.unit) {
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#666'
        ctx.fillText(config.unit, odometerX + DIGIT_COUNT * DIGIT_W + 6, odometerY + DIGIT_H / 2 + 4)
      }

      // Stat label
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = LABEL_COLOR
      ctx.fillText(config.label, ox + 8, odometerY + DIGIT_H + 14)

      // ── Sparkline ─────────────────────────────────────────────────────

      const sparkData = this.sparklines[si]
      if (sparkData.length >= 2) {
        const sparkX = ox + 8
        const sparkY = odometerY + DIGIT_H + 22
        const sparkW = cellW * 0.5
        const sparkH = 20

        const sparkMin = Math.min(...sparkData)
        const sparkMax = Math.max(...sparkData)
        const sparkRange = sparkMax - sparkMin || 1

        // Build points
        const sparkPoints: { x: number; y: number }[] = sparkData.map((v, i) => ({
          x: sparkX + (i / (SPARKLINE_SIZE - 1)) * sparkW,
          y: sparkY + sparkH - ((v - sparkMin) / sparkRange) * sparkH,
        }))

        // Glow pass
        this.drawSmoothLine(ctx, sparkPoints)
        ctx.strokeStyle = SPARKLINE_COLOR
        ctx.globalAlpha = 0.15
        ctx.lineWidth = 5
        ctx.shadowColor = SPARKLINE_COLOR
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.shadowBlur = 0

        // Core line
        this.drawSmoothLine(ctx, sparkPoints)
        ctx.strokeStyle = SPARKLINE_COLOR
        ctx.globalAlpha = 0.7
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.globalAlpha = 1

        // Bright dot at the end
        const last = sparkPoints[sparkPoints.length - 1]
        ctx.fillStyle = SPARKLINE_COLOR
        ctx.beginPath()
        ctx.arc(last.x, last.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── Divider lines (subtle cross in center) ──────────────────────────

    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private drawSmoothLine(
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

    // Catmull-Rom spline
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      const t = 0.5
      const cp1x = p1.x + (p2.x - p0.x) * t / 3
      const cp1y = p1.y + (p2.y - p0.y) * t / 3
      const cp2x = p2.x - (p3.x - p1.x) * t / 3
      const cp2y = p2.y - (p3.y - p1.y) * t / 3

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
    }
  }

  private createParticle(w: number, h: number): BgParticle {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.2 + Math.random() * 0.6
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.03 + Math.random() * 0.07,
      size: 0.8 + Math.random() * 1.5,
      baseSpeed: speed,
    }
  }

  destroy(): void {
    this.digitSprings = []
    this.sparklines = [[], [], [], []]
    this.particles = []
    super.destroy()
  }
}

/**
 * Histogram Renderer - Organic Spring Physics
 *
 * A 20-bin histogram where each bar is driven by a Spring (from spring.ts).
 * New keystrokes cause bars to overshoot and settle via damped springs.
 * Particle splashes erupt from bins on update. A smooth gaussian overlay
 * and floating ambient particles complete the organic feel.
 *
 * Canvas 2D only - uses spring.ts for physics.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'
import { createSpringArray, updateSprings, type Spring } from '../spring'
import { HISTOGRAM_BIN_COUNT, HISTOGRAM_BIN_WIDTH_MS } from '../../wasm/stats'

// ── Splash particle from a bin hit ─────────────────────────────────────────

interface SplashParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number   // frames remaining
  maxLife: number
  size: number
}

// ── Ambient floating particle ──────────────────────────────────────────────

interface AmbientParticle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
}

// ── Colors ─────────────────────────────────────────────────────────────────

const ACCENT_CYAN = '#0ea5e9'
const ACCENT_AMBER = '#f59e0b'
const BAR_TOP = '#ffffff'
const BAR_BOTTOM = '#0ea5e9'
const BG = '#000000'

export class HistogramRenderer extends GalleryRenderer {
  private springs: Spring[] = createSpringArray(HISTOGRAM_BIN_COUNT, 0)
  private prevHistogram: number[] = new Array(HISTOGRAM_BIN_COUNT).fill(0)
  private splashParticles: SplashParticle[] = []
  private ambientParticles: AmbientParticle[] = []
  private lastCount = 0

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.springs = createSpringArray(HISTOGRAM_BIN_COUNT, 0)
    this.prevHistogram = new Array(HISTOGRAM_BIN_COUNT).fill(0)
    this.splashParticles = []
    this.ambientParticles = []
    this.lastCount = 0

    // Seed ambient particles
    for (let i = 0; i < 40; i++) {
      this.ambientParticles.push(this.createAmbientParticle(canvas.width, canvas.height, true))
    }
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, statsApi, frameCount } = context
    if (!ctx) return

    const histogram = statsApi.getHistogram()
    const mean = statsApi.getMean()
    const stddev = statsApi.getStddev()
    const count = statsApi.getCount()
    const maxCount = Math.max(1, ...Array.from(histogram))

    // ── Layout ─────────────────────────────────────────────────────────

    const chartLeft = 40
    const chartRight = width - 24
    const chartTop = 30
    const chartBottom = height - 64
    const chartW = chartRight - chartLeft
    const chartH = chartBottom - chartTop
    const barGap = 3
    const barW = (chartW - barGap * (HISTOGRAM_BIN_COUNT - 1)) / HISTOGRAM_BIN_COUNT

    // ── Detect new keystrokes and update springs ───────────────────────

    for (let i = 0; i < HISTOGRAM_BIN_COUNT; i++) {
      const current = histogram[i]
      if (current !== this.prevHistogram[i]) {
        // New hit in this bin - set spring target to new height
        this.springs[i].target = current / maxCount

        // Spawn splash particles
        const binCenterX = chartLeft + i * (barW + barGap) + barW / 2
        const barHeight = (current / maxCount) * chartH
        const barTopY = chartBottom - barHeight

        const splashCount = 6 + Math.floor(Math.random() * 5)
        for (let j = 0; j < splashCount; j++) {
          this.splashParticles.push({
            x: binCenterX + (Math.random() - 0.5) * barW,
            y: barTopY,
            vx: (Math.random() - 0.5) * 4,
            vy: -2 - Math.random() * 5,
            life: 25 + Math.random() * 15,
            maxLife: 40,
            size: 1.5 + Math.random() * 2,
          })
        }
      }
      this.prevHistogram[i] = current

      // Also continuously sync target (for when maxCount changes)
      this.springs[i].target = current / maxCount
    }

    // Update all springs
    updateSprings(this.springs, 200, 14)

    // ── Background ─────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // ── Ambient floating particles ─────────────────────────────────────

    for (const p of this.ambientParticles) {
      p.x += p.vx
      p.y += p.vy

      // Wrap around
      if (p.x < 0) p.x = width
      if (p.x > width) p.x = 0
      if (p.y < 0) p.y = height
      if (p.y > height) p.y = 0

      ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(frameCount * 0.02 + p.x * 0.01))
      ctx.fillStyle = ACCENT_CYAN
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // ── Draw histogram bars (spring-driven) ────────────────────────────

    for (let i = 0; i < HISTOGRAM_BIN_COUNT; i++) {
      const spring = this.springs[i]
      const normalizedHeight = Math.max(0, spring.position)
      const barHeight = normalizedHeight * chartH
      const barX = chartLeft + i * (barW + barGap)
      const barY = chartBottom - barHeight

      if (barHeight < 1) continue

      // Gradient: white top -> cyan bottom
      const gradient = ctx.createLinearGradient(barX, barY, barX, chartBottom)
      gradient.addColorStop(0, BAR_TOP)
      gradient.addColorStop(0.4, ACCENT_CYAN)
      gradient.addColorStop(1, '#064e6e')

      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.85

      // Rounded top corners
      const r = Math.min(3, barW / 2)
      ctx.beginPath()
      ctx.moveTo(barX + r, barY)
      ctx.lineTo(barX + barW - r, barY)
      ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + r)
      ctx.lineTo(barX + barW, chartBottom)
      ctx.lineTo(barX, chartBottom)
      ctx.lineTo(barX, barY + r)
      ctx.quadraticCurveTo(barX, barY, barX + r, barY)
      ctx.closePath()
      ctx.fill()

      // Glow at bar top
      ctx.globalAlpha = 0.3 + normalizedHeight * 0.3
      ctx.shadowColor = ACCENT_CYAN
      ctx.shadowBlur = 8
      ctx.fillStyle = ACCENT_CYAN
      ctx.fillRect(barX, barY, barW, 2)
      ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1

    // ── Gaussian curve overlay ─────────────────────────────────────────

    if (count > 2 && stddev > 0) {
      ctx.beginPath()
      ctx.strokeStyle = ACCENT_AMBER
      ctx.lineWidth = 2
      ctx.shadowColor = ACCENT_AMBER
      ctx.shadowBlur = 10

      let first = true
      for (let px = chartLeft; px <= chartRight; px += 2) {
        const ms = ((px - chartLeft) / chartW) * (HISTOGRAM_BIN_COUNT * HISTOGRAM_BIN_WIDTH_MS)
        const z = (ms - mean) / stddev
        const gaussianY = Math.exp(-0.5 * z * z)

        // Scale to chart height (peak at ~80% of chart)
        const screenY = chartBottom - gaussianY * chartH * 0.8

        if (first) {
          ctx.moveTo(px, screenY)
          first = false
        } else {
          ctx.lineTo(px, screenY)
        }
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // ── Mean vertical line (pulsing) ─────────────────────────────────

      const meanX = chartLeft + (mean / (HISTOGRAM_BIN_COUNT * HISTOGRAM_BIN_WIDTH_MS)) * chartW
      const meanPulse = 0.4 + 0.3 * Math.sin(frameCount * 0.06)

      ctx.strokeStyle = ACCENT_AMBER
      ctx.globalAlpha = meanPulse
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(meanX, chartTop)
      ctx.lineTo(meanX, chartBottom)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1

      // Mean label
      ctx.font = '10px monospace'
      ctx.fillStyle = ACCENT_AMBER
      ctx.textAlign = 'center'
      ctx.fillText(`\u03BC=${mean.toFixed(1)}ms`, meanX, chartTop - 6)
    }

    // ── Splash particles ───────────────────────────────────────────────

    this.splashParticles = this.splashParticles.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.15 // gravity
      p.life--

      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.globalAlpha = alpha * 0.8
      ctx.fillStyle = ACCENT_CYAN
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()

      return p.life > 0
    })
    ctx.globalAlpha = 1

    // ── X-axis labels ──────────────────────────────────────────────────

    ctx.font = '9px monospace'
    ctx.fillStyle = '#555555'
    ctx.textAlign = 'center'
    for (let i = 0; i < HISTOGRAM_BIN_COUNT; i += 4) {
      const x = chartLeft + i * (barW + barGap) + barW / 2
      ctx.fillText(`${i * HISTOGRAM_BIN_WIDTH_MS}`, x, chartBottom + 14)
    }
    ctx.fillText('ms', chartRight + 10, chartBottom + 14)

    // ── Stats row ──────────────────────────────────────────────────────

    const statsY = height - 18
    ctx.font = '11px monospace'
    ctx.textAlign = 'left'

    const wpm = count > 1 && mean > 0 ? Math.round(60000 / (mean * 5)) : 0
    const statsItems = [
      { label: 'Mean', value: `${mean.toFixed(1)}ms`, color: ACCENT_AMBER },
      { label: 'StdDev', value: `${stddev.toFixed(1)}ms`, color: '#888888' },
      { label: 'WPM', value: `${wpm}`, color: '#e5e5e5' },
      { label: 'Count', value: `${count}`, color: ACCENT_CYAN },
    ]

    const statsSpacing = chartW / statsItems.length
    for (let i = 0; i < statsItems.length; i++) {
      const x = chartLeft + i * statsSpacing
      ctx.fillStyle = '#555555'
      ctx.fillText(statsItems[i].label, x, statsY)
      ctx.fillStyle = statsItems[i].color
      ctx.fillText(` ${statsItems[i].value}`, x + ctx.measureText(statsItems[i].label).width, statsY)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private createAmbientParticle(
    width: number,
    height: number,
    randomPosition: boolean
  ): AmbientParticle {
    return {
      x: randomPosition ? Math.random() * width : -5,
      y: Math.random() * height,
      vx: 0.1 + Math.random() * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: 0.05 + Math.random() * 0.1,
      size: 1 + Math.random() * 2,
    }
  }

  destroy(): void {
    this.springs = []
    this.splashParticles = []
    this.ambientParticles = []
    super.destroy()
  }
}

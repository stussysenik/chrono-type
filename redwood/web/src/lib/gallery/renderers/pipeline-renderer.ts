/**
 * Pipeline Renderer - Living Schematic
 *
 * Visualizes the ChronoType data pipeline as a mechanical flow diagram:
 *   KEYDOWN -> RXJS -> ZIG WASM -> CANVAS
 *
 * Each keystroke travels as a glowing cyan particle along curved bezier pipes.
 * Nodes activate with border brightening and spinning gear icons on hit.
 * The WASM node displays a live counter with digit-flip animation.
 *
 * Canvas 2D only - no dependencies beyond the gallery base renderer and types.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'

// ── Particle moving along a pipe segment ───────────────────────────────────

interface PipeParticle {
  /** 0..1 progress along the pipe */
  t: number
  /** Which pipe segment (0 = between node 0-1, etc.) */
  segment: number
  /** Speed per frame */
  speed: number
}

// ── Node activation state ──────────────────────────────────────────────────

interface NodeState {
  /** Glow intensity 0..1 (decays each frame) */
  glow: number
  /** Gear rotation angle (radians) */
  gearAngle: number
  /** Whether gear is spinning */
  spinning: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────

const NODE_LABELS = ['KEYDOWN', 'RXJS', 'ZIG WASM', 'CANVAS']
const NODE_ICONS = ['\u2328', '\u21C6', '\u2699', '\u25A3'] // keyboard, arrows, gear, grid
const ACCENT = '#0ea5e9'
const BG = '#000000'
const GRID_COLOR = '#111111'

export class PipelineRenderer extends GalleryRenderer {
  private particles: PipeParticle[] = []
  private nodeStates: NodeState[] = []
  private lastCount = 0
  private displayCount = 0
  private digitFlipTimer = 0
  private emitTimer = 0

  // ── Lifecycle ──────────────────────────────────────────────────────────

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.particles = []
    this.nodeStates = NODE_LABELS.map(() => ({
      glow: 0,
      gearAngle: 0,
      spinning: false,
    }))
    this.lastCount = 0
    this.displayCount = 0
    this.digitFlipTimer = 0
    this.emitTimer = 0
  }

  // ── Main draw loop ─────────────────────────────────────────────────────

  draw(context: RendererContext): void {
    const { ctx, width, height, statsApi, frameCount } = context
    if (!ctx) return

    // Layout: 4 nodes evenly spaced horizontally
    const nodeW = Math.min(120, width * 0.18)
    const nodeH = 56
    const marginX = (width - nodeW * 4) / 5
    const cy = height * 0.42

    const nodePositions = NODE_LABELS.map((_, i) => ({
      x: marginX + i * (nodeW + marginX),
      y: cy - nodeH / 2,
      cx: marginX + i * (nodeW + marginX) + nodeW / 2,
      cy,
    }))

    // ── Background ─────────────────────────────────────────────────────
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // Subtle grid
    ctx.strokeStyle = GRID_COLOR
    ctx.lineWidth = 0.5
    const gridSpacing = 24
    for (let gx = 0; gx < width; gx += gridSpacing) {
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, height)
      ctx.stroke()
    }
    for (let gy = 0; gy < height; gy += gridSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(width, gy)
      ctx.stroke()
    }

    // ── Emit particles on demo replay ──────────────────────────────────

    const currentCount = statsApi.getCount()
    if (currentCount > this.lastCount) {
      // New keystroke arrived - emit a particle at the start
      this.emitParticle()
      this.lastCount = currentCount
    }

    // Also emit periodically for ambient demo feel
    this.emitTimer++
    if (this.emitTimer > 45) {
      this.emitTimer = 0
      this.emitParticle()
    }

    // ── Update digit-flip counter ──────────────────────────────────────

    if (this.displayCount < currentCount) {
      this.digitFlipTimer++
      if (this.digitFlipTimer >= 2) {
        this.displayCount = Math.min(
          this.displayCount + Math.ceil((currentCount - this.displayCount) * 0.3),
          currentCount
        )
        this.digitFlipTimer = 0
      }
    }

    // ── Draw pipes (bezier curves between nodes) ───────────────────────

    for (let i = 0; i < 3; i++) {
      const from = nodePositions[i]
      const to = nodePositions[i + 1]

      // Pipe throughput pulse
      const pulse = 1 + 0.3 * Math.sin(frameCount * 0.05 + i * 1.2)

      // Glow pass
      ctx.strokeStyle = ACCENT
      ctx.globalAlpha = 0.15
      ctx.lineWidth = 8 * pulse
      ctx.lineCap = 'round'
      this.drawPipeBezier(ctx, from.cx + nodeW / 2, from.cy, to.cx - nodeW / 2, to.cy)
      ctx.stroke()

      // Core pass
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 3 * pulse
      this.drawPipeBezier(ctx, from.cx + nodeW / 2, from.cy, to.cx - nodeW / 2, to.cy)
      ctx.stroke()

      ctx.globalAlpha = 1
    }

    // ── Update and draw particles ──────────────────────────────────────

    this.particles = this.particles.filter((p) => {
      p.t += p.speed

      if (p.t >= 1) {
        // Hit the next node - activate it
        const hitNode = p.segment + 1
        if (hitNode < this.nodeStates.length) {
          this.nodeStates[hitNode].glow = 1
          this.nodeStates[hitNode].spinning = true
        }

        // Move to next segment
        p.segment++
        p.t = 0

        // If past last segment, remove
        if (p.segment >= 3) return false
      }

      // Compute position along bezier
      const from = nodePositions[p.segment]
      const to = nodePositions[p.segment + 1]
      const pos = this.bezierPoint(
        from.cx + nodeW / 2,
        from.cy,
        to.cx - nodeW / 2,
        to.cy,
        p.t
      )

      // Draw particle glow
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12)
      gradient.addColorStop(0, ACCENT)
      gradient.addColorStop(0.5, `${ACCENT}66`)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2)
      ctx.fill()

      // Core dot
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2)
      ctx.fill()

      return true
    })

    // ── Draw nodes ─────────────────────────────────────────────────────

    for (let i = 0; i < 4; i++) {
      const pos = nodePositions[i]
      const state = this.nodeStates[i]

      // Decay glow
      state.glow *= 0.95
      if (state.glow < 0.01) {
        state.glow = 0
        state.spinning = false
      }

      // Gear rotation
      if (state.spinning) {
        state.gearAngle += 0.08
      }

      // Ambient pulse
      const ambientPulse = 0.3 + 0.1 * Math.sin(frameCount * 0.03 + i * 0.8)
      const totalGlow = Math.min(1, state.glow + ambientPulse)

      // Node shadow/glow
      ctx.shadowColor = ACCENT
      ctx.shadowBlur = 12 + totalGlow * 20
      ctx.globalAlpha = totalGlow * 0.6 + 0.2

      // Rounded rectangle
      const radius = 10
      ctx.fillStyle = '#0a0a0a'
      ctx.strokeStyle = ACCENT
      ctx.lineWidth = 1.5 + totalGlow * 1.5
      this.roundedRect(ctx, pos.x, pos.y, nodeW, nodeH, radius)
      ctx.fill()
      ctx.stroke()

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Icon (with gear spin for WASM node)
      ctx.save()
      ctx.font = '18px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = state.glow > 0.1 ? '#ffffff' : '#888888'

      if (i === 2 && state.spinning) {
        // Spinning gear for WASM node
        ctx.translate(pos.cx - 20, pos.cy)
        ctx.rotate(state.gearAngle)
        ctx.fillText(NODE_ICONS[i], 0, 0)
        ctx.restore()
        ctx.save()
      } else {
        ctx.fillText(NODE_ICONS[i], pos.cx - 20, pos.cy)
      }
      ctx.restore()

      // Label
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = state.glow > 0.3 ? '#ffffff' : '#e5e5e5'
      ctx.fillText(NODE_LABELS[i], pos.cx + 8, pos.cy)

      // WASM node live counter
      if (i === 2) {
        const countStr = `n=${this.displayCount}`
        ctx.font = '10px monospace'
        ctx.fillStyle = ACCENT
        ctx.fillText(countStr, pos.cx, pos.cy + nodeH / 2 + 14)
      }
    }

    // ── Title ──────────────────────────────────────────────────────────

    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#555555'
    ctx.fillText('DATA PIPELINE', width / 2, height - 24)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private emitParticle(): void {
    this.particles.push({
      t: 0,
      segment: 0,
      speed: 0.015 + Math.random() * 0.01,
    })
    // Activate the first node on emit
    this.nodeStates[0].glow = 1
    this.nodeStates[0].spinning = true
  }

  private drawPipeBezier(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const cpOffset = (x2 - x1) * 0.4
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(x1 + cpOffset, y1, x2 - cpOffset, y2, x2, y2)
  }

  private bezierPoint(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    t: number
  ): { x: number; y: number } {
    const cpOffset = (x2 - x1) * 0.4
    const cx1 = x1 + cpOffset
    const cy1 = y1
    const cx2 = x2 - cpOffset
    const cy2 = y2

    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t

    return {
      x: mt3 * x1 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x2,
      y: mt3 * y1 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y2,
    }
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  destroy(): void {
    this.particles = []
    this.nodeStates = []
    super.destroy()
  }
}

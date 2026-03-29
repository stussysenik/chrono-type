/**
 * Streams Renderer - RxJS Marble Diagram (Animated)
 *
 * A live animated marble diagram showing the three-stream architecture:
 * Ingestion (16ms), Visualization (60fps), and Network (100ms). Colored
 * marbles travel along horizontal tracks, passing through operator boxes
 * that glow on contact. The buffer operator visually accumulates marbles
 * before releasing batch pulses.
 *
 * A subtle circuit-board pattern plays behind the tracks, and connection
 * lines between streams show data flow at the WASM handoff points.
 *
 * Canvas 2D only.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'

// ── Track definitions ─────────────────────────────────────────────────────────

interface Track {
  label: string
  sublabel: string
  color: string
  y: number          // computed at draw time
  operators: string[]
}

const TRACKS: Track[] = [
  {
    label: 'INGESTION',
    sublabel: '16ms',
    color: '#3b82f6',
    y: 0,
    operators: ['fromEvent', 'filter(delta)', 'tap(wasm.update)'],
  },
  {
    label: 'VISUALIZATION',
    sublabel: '60fps',
    color: '#22c55e',
    y: 0,
    operators: ['animationFrame$', 'map(readStats)', 'tap(draw)'],
  },
  {
    label: 'NETWORK',
    sublabel: '100ms',
    color: '#a855f7',
    y: 0,
    operators: ['buffer(100ms)', 'filter(len>0)', 'tap(channel.push)'],
  },
]

// ── Marble ────────────────────────────────────────────────────────────────────

interface Marble {
  trackIdx: number
  x: number        // current X position (pixels)
  speed: number
  radius: number
  alpha: number
  isBatch: boolean
  pulsePhase: number
}

// ── Operator glow state ───────────────────────────────────────────────────────

interface OpGlow {
  trackIdx: number
  opIdx: number
  intensity: number  // 0..1, decays
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BG = '#000000'
const TRACK_LINE_ALPHA = 0.3
const MARBLE_SPEED = 1.8
const OP_BOX_W = 94
const OP_BOX_H = 22
const OP_BOX_R = 6

export class StreamsRenderer extends GalleryRenderer {
  private marbles: Marble[] = []
  private opGlows: OpGlow[] = []
  private lastReplayIndex = -1
  /** Buffer accumulation count for the network track's buffer operator */
  private bufferCount = 0
  private bufferFlushTimer = 0
  /** Circuit-board pattern lines (precomputed) */
  private circuitLines: { x1: number; y1: number; x2: number; y2: number }[] = []
  private circuitInitialized = false

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.marbles = []
    this.opGlows = []
    this.lastReplayIndex = -1
    this.bufferCount = 0
    this.bufferFlushTimer = 0
    this.circuitInitialized = false
    this.circuitLines = []
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, frameCount, lastKeystroke, replayIndex } = context
    if (!ctx) return

    // ── Layout ──────────────────────────────────────────────────────────

    const trackLeft = 130
    const trackRight = width - 20
    const trackW = trackRight - trackLeft
    const trackSpacing = height / 4
    const trackYs = [trackSpacing, trackSpacing * 2, trackSpacing * 3]

    for (let i = 0; i < TRACKS.length; i++) {
      TRACKS[i].y = trackYs[i]
    }

    // Operator X positions (evenly spaced along each track)
    const opPositions = (opCount: number): number[] => {
      const positions: number[] = []
      for (let i = 0; i < opCount; i++) {
        positions.push(trackLeft + (trackW / (opCount + 1)) * (i + 1))
      }
      return positions
    }

    // ── Initialize circuit-board pattern ────────────────────────────────

    if (!this.circuitInitialized) {
      this.circuitInitialized = true
      this.circuitLines = []
      // Vertical lines
      for (let x = 20; x < width; x += 40) {
        const len = 15 + Math.random() * 30
        const y = Math.random() * height
        this.circuitLines.push({ x1: x, y1: y, x2: x, y2: y + len })
      }
      // Horizontal lines
      for (let y = 20; y < height; y += 40) {
        const len = 15 + Math.random() * 30
        const x = Math.random() * width
        this.circuitLines.push({ x1: x, y1: y, x2: x + len, y2: y })
      }
      // Small perpendicular taps
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const horiz = Math.random() > 0.5
        const len = 6 + Math.random() * 10
        if (horiz) {
          this.circuitLines.push({ x1: x, y1: y, x2: x + len, y2: y })
        } else {
          this.circuitLines.push({ x1: x, y1: y, x2: x, y2: y + len })
        }
      }
    }

    // ── Spawn marble on keystroke ───────────────────────────────────────

    if (lastKeystroke && replayIndex !== this.lastReplayIndex) {
      this.lastReplayIndex = replayIndex

      // Ingestion track marble
      this.marbles.push({
        trackIdx: 0,
        x: trackLeft - 10,
        speed: MARBLE_SPEED,
        radius: 5,
        alpha: 1,
        isBatch: false,
        pulsePhase: 0,
      })

      // Visualization track marble (slightly delayed feel)
      this.marbles.push({
        trackIdx: 1,
        x: trackLeft - 20,
        speed: MARBLE_SPEED * 0.9,
        radius: 4,
        alpha: 1,
        isBatch: false,
        pulsePhase: 0,
      })

      // Buffer accumulation for network track
      this.bufferCount++
    }

    // ── Buffer flush: every ~100 frames release a batch marble ──────────

    this.bufferFlushTimer++
    if (this.bufferFlushTimer >= 60 && this.bufferCount > 0) {
      this.bufferFlushTimer = 0
      const batchSize = this.bufferCount
      this.bufferCount = 0

      this.marbles.push({
        trackIdx: 2,
        x: trackLeft - 10,
        speed: MARBLE_SPEED * 0.7,
        radius: 6 + Math.min(batchSize, 8),
        alpha: 1,
        isBatch: true,
        pulsePhase: 0,
      })
    }

    // ── Background ──────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // Circuit-board pattern
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 0.5
    for (const line of this.circuitLines) {
      ctx.beginPath()
      ctx.moveTo(line.x1, line.y1)
      ctx.lineTo(line.x2, line.y2)
      ctx.stroke()
    }

    // Small circuit junction dots
    ctx.fillStyle = '#222'
    for (let i = 0; i < this.circuitLines.length; i += 3) {
      const l = this.circuitLines[i]
      ctx.beginPath()
      ctx.arc(l.x1, l.y1, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── Connection lines between tracks (data flow indicators) ──────────

    // Ingestion -> Visualization at the WASM handoff (tap(wasm.update) connects down)
    const ingestOps = opPositions(TRACKS[0].operators.length)
    const vizOps = opPositions(TRACKS[1].operators.length)
    const netOps = opPositions(TRACKS[2].operators.length)

    // Connection: ingestion last op -> visualization first op
    const connPulse = 0.15 + 0.1 * Math.sin(frameCount * 0.04)
    ctx.strokeStyle = '#3b82f6'
    ctx.globalAlpha = connPulse
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(ingestOps[2], TRACKS[0].y + OP_BOX_H / 2 + 2)
    ctx.lineTo(ingestOps[2], TRACKS[0].y + OP_BOX_H / 2 + 14)
    ctx.lineTo(vizOps[0], TRACKS[1].y - OP_BOX_H / 2 - 14)
    ctx.lineTo(vizOps[0], TRACKS[1].y - OP_BOX_H / 2 - 2)
    ctx.stroke()

    // Connection: ingestion last op -> network first op
    ctx.strokeStyle = '#a855f7'
    ctx.beginPath()
    ctx.moveTo(ingestOps[2] + 10, TRACKS[0].y + OP_BOX_H / 2 + 2)
    ctx.lineTo(ingestOps[2] + 10, TRACKS[0].y + OP_BOX_H / 2 + 14)
    ctx.lineTo(netOps[0], TRACKS[2].y - OP_BOX_H / 2 - 14)
    ctx.lineTo(netOps[0], TRACKS[2].y - OP_BOX_H / 2 - 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1

    // ── Draw tracks ─────────────────────────────────────────────────────

    for (let ti = 0; ti < TRACKS.length; ti++) {
      const track = TRACKS[ti]
      const y = track.y
      const ops = [ingestOps, vizOps, netOps][ti]

      // Track label (left side)
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'right'
      ctx.fillStyle = track.color
      ctx.fillText(track.label, trackLeft - 14, y - 4)
      ctx.font = '8px monospace'
      ctx.fillStyle = '#555'
      ctx.fillText(track.sublabel, trackLeft - 14, y + 8)

      // Track line with glow
      ctx.strokeStyle = track.color
      ctx.globalAlpha = TRACK_LINE_ALPHA
      ctx.lineWidth = 2
      ctx.shadowColor = track.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(trackLeft, y)
      ctx.lineTo(trackRight, y)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      // Arrow at the end
      ctx.fillStyle = track.color
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.moveTo(trackRight, y - 4)
      ctx.lineTo(trackRight + 8, y)
      ctx.lineTo(trackRight, y + 4)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1

      // ── Operator boxes ────────────────────────────────────────────────

      for (let oi = 0; oi < track.operators.length; oi++) {
        const opX = ops[oi]
        const opLabel = track.operators[oi]
        const bx = opX - OP_BOX_W / 2
        const by = y - OP_BOX_H / 2

        // Check for glow on this operator
        const glowEntry = this.opGlows.find(
          (g) => g.trackIdx === ti && g.opIdx === oi
        )
        const glowIntensity = glowEntry ? glowEntry.intensity : 0

        // Box background
        ctx.fillStyle = '#111'
        ctx.globalAlpha = 0.9
        this.roundRect(ctx, bx, by, OP_BOX_W, OP_BOX_H, OP_BOX_R)
        ctx.fill()
        ctx.globalAlpha = 1

        // Box border
        ctx.strokeStyle = track.color
        ctx.globalAlpha = 0.4 + glowIntensity * 0.6
        ctx.lineWidth = 1 + glowIntensity
        if (glowIntensity > 0.1) {
          ctx.shadowColor = track.color
          ctx.shadowBlur = 10 * glowIntensity
        }
        this.roundRect(ctx, bx, by, OP_BOX_W, OP_BOX_H, OP_BOX_R)
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1

        // Operator label
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = glowIntensity > 0.3 ? '#ffffff' : '#aaaaaa'
        ctx.fillText(opLabel, opX, y + 3.5)

        // Buffer accumulation indicator (network track, first operator)
        if (ti === 2 && oi === 0 && this.bufferCount > 0) {
          // Draw small stacked circles inside the box
          const stackCount = Math.min(this.bufferCount, 6)
          for (let si = 0; si < stackCount; si++) {
            ctx.fillStyle = track.color
            ctx.globalAlpha = 0.5
            ctx.beginPath()
            ctx.arc(
              bx + OP_BOX_W - 12 - si * 6,
              y,
              2.5,
              0,
              Math.PI * 2
            )
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }
    }

    // ── Update and draw marbles ─────────────────────────────────────────

    this.marbles = this.marbles.filter((marble) => {
      marble.x += marble.speed
      marble.pulsePhase += 0.1

      // Check if marble has exited the track
      if (marble.x > trackRight + 20) {
        return false
      }

      // Fade out near the end
      if (marble.x > trackRight - 30) {
        marble.alpha = Math.max(0, (trackRight + 20 - marble.x) / 50)
      }

      const track = TRACKS[marble.trackIdx]
      const y = track.y
      const ops = [ingestOps, vizOps, netOps][marble.trackIdx]

      // Check operator collisions (trigger glow)
      for (let oi = 0; oi < ops.length; oi++) {
        const dist = Math.abs(marble.x - ops[oi])
        if (dist < OP_BOX_W / 2 + marble.radius) {
          let existing = this.opGlows.find(
            (g) => g.trackIdx === marble.trackIdx && g.opIdx === oi
          )
          if (existing) {
            existing.intensity = Math.min(1, existing.intensity + 0.15)
          } else {
            this.opGlows.push({
              trackIdx: marble.trackIdx,
              opIdx: oi,
              intensity: 0.6,
            })
          }
        }
      }

      // Draw marble glow
      const glowR = marble.radius * 3
      const glow = ctx.createRadialGradient(marble.x, y, 0, marble.x, y, glowR)
      glow.addColorStop(0, track.color)
      glow.addColorStop(0.5, `${track.color}44`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.globalAlpha = marble.alpha * 0.4
      ctx.beginPath()
      ctx.arc(marble.x, y, glowR, 0, Math.PI * 2)
      ctx.fill()

      // Draw marble core
      ctx.fillStyle = track.color
      ctx.globalAlpha = marble.alpha
      ctx.beginPath()
      ctx.arc(marble.x, y, marble.radius, 0, Math.PI * 2)
      ctx.fill()

      // White center highlight
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = marble.alpha * 0.6
      ctx.beginPath()
      ctx.arc(marble.x - 1, y - 1, marble.radius * 0.35, 0, Math.PI * 2)
      ctx.fill()

      // Batch marble pulsing ring
      if (marble.isBatch) {
        const pulseR = marble.radius + 2 + 2 * Math.sin(marble.pulsePhase)
        ctx.strokeStyle = track.color
        ctx.globalAlpha = marble.alpha * 0.5
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(marble.x, y, pulseR, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      return true
    })

    // ── Decay operator glows ────────────────────────────────────────────

    this.opGlows = this.opGlows.filter((g) => {
      g.intensity -= 0.02
      return g.intensity > 0
    })

    // ── Title ───────────────────────────────────────────────────────────

    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#555555'
    ctx.fillText('REACTIVE STREAMS', 16, 16)

    ctx.font = '9px monospace'
    ctx.fillStyle = '#333'
    ctx.fillText('RxJS marble diagram', 16, 28)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private roundRect(
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
    this.marbles = []
    this.opGlows = []
    this.circuitLines = []
    super.destroy()
  }
}

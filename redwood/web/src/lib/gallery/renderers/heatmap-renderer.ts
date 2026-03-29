/**
 * Heatmap Renderer - LED VU Meter / Spectrogram
 *
 * A time-frequency spectrogram of keystroke distribution patterns. Each row
 * represents a 500ms time slice with 20 histogram bins. Rows stack
 * upward from a glowing "NOW" line at the bottom, scrolling like a
 * spectrogram waterfall.
 *
 * Color ramp: black (#111) -> deep amber (#2a1f00) -> bright amber (#f59e0b)
 * -> white-hot (#fff). Each cell is a filled rectangle with a 1px gap,
 * creating the classic LED grid aesthetic.
 *
 * Canvas 2D only.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'

// ── Constants ─────────────────────────────────────────────────────────────────

const NUM_COLS = 20          // histogram bins (0-200ms in 10ms intervals)
const NUM_ROWS = 40          // time slices (40 * 500ms = 20 seconds)
const SLICE_INTERVAL_MS = 500 // ms between histogram snapshots
const BIN_WIDTH_MS = 10

// ── Colors ────────────────────────────────────────────────────────────────────

const BG = '#000000'
const CELL_EMPTY = '#111111'
const NOW_GLOW = '#f59e0b'

// ── Color ramp stops (hand-tuned for a warm spectrogram feel) ─────────────────

function heatColor(intensity: number): string {
  // intensity: 0..1
  const t = Math.max(0, Math.min(1, intensity))

  if (t < 0.01) return CELL_EMPTY
  if (t < 0.25) {
    // Dark amber
    const f = t / 0.25
    const r = Math.round(42 * f)
    const g = Math.round(31 * f)
    const b = 0
    return `rgb(${r},${g},${b})`
  }
  if (t < 0.5) {
    // Amber ramp
    const f = (t - 0.25) / 0.25
    const r = Math.round(42 + (245 - 42) * f)
    const g = Math.round(31 + (158 - 31) * f)
    const b = Math.round(11 * f)
    return `rgb(${r},${g},${b})`
  }
  if (t < 0.8) {
    // Bright amber to near-white
    const f = (t - 0.5) / 0.3
    const r = Math.round(245 + (255 - 245) * f)
    const g = Math.round(158 + (230 - 158) * f)
    const b = Math.round(11 + (170 - 11) * f)
    return `rgb(${r},${g},${b})`
  }
  // White-hot
  const f = (t - 0.8) / 0.2
  const r = 255
  const g = Math.round(230 + (255 - 230) * f)
  const b = Math.round(170 + (255 - 170) * f)
  return `rgb(${r},${g},${b})`
}

export class HeatmapRenderer extends GalleryRenderer {
  /** Ring buffer of row data. Each row is NUM_COLS counts. Newest at end. */
  private rows: number[][] = []
  /** Previous histogram snapshot for differential computation */
  private prevHistogram: number[] = new Array(NUM_COLS).fill(0)
  /** Accumulated keystroke deltas in the current 500ms window */
  private windowBuffer: number[] = []
  /** Frame counter since last slice */
  private framesSinceSlice = 0
  /** Scanline Y offset for subtle animation */
  private scanlinePhase = 0

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.rows = []
    this.prevHistogram = new Array(NUM_COLS).fill(0)
    this.windowBuffer = []
    this.framesSinceSlice = 0
    this.scanlinePhase = 0
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, lastKeystroke, replayIndex, frameCount } = context
    if (!ctx) return

    // ── Ingest new keystrokes into window buffer ────────────────────────

    if (lastKeystroke) {
      this.windowBuffer.push(lastKeystroke.delta)
    }

    // ── Time slicing: every ~30 frames (~500ms at 60fps) ────────────────

    this.framesSinceSlice++
    if (this.framesSinceSlice >= 30) {
      this.framesSinceSlice = 0

      // Build histogram for the window
      const bins = new Array(NUM_COLS).fill(0)
      for (const delta of this.windowBuffer) {
        const binIdx = Math.min(NUM_COLS - 1, Math.floor(delta / BIN_WIDTH_MS))
        bins[binIdx]++
      }

      this.rows.push(bins)
      if (this.rows.length > NUM_ROWS) {
        this.rows.shift()
      }

      this.prevHistogram = bins
      this.windowBuffer = []
    }

    // ── Layout ──────────────────────────────────────────────────────────

    const gridLeft = 56
    const gridRight = width - 16
    const gridTop = 26
    const gridBottom = height - 20
    const gridW = gridRight - gridLeft
    const gridH = gridBottom - gridTop
    const cellW = gridW / NUM_COLS
    const cellH = gridH / NUM_ROWS
    const cellGap = 1

    // ── Background ──────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // ── Find global max for normalization ────────────────────────────────

    let globalMax = 1
    for (const row of this.rows) {
      for (const val of row) {
        if (val > globalMax) globalMax = val
      }
    }

    // ── Draw cells ──────────────────────────────────────────────────────
    // Newest row at bottom, oldest at top

    for (let ri = 0; ri < this.rows.length; ri++) {
      const row = this.rows[ri]
      // Map row index: 0 = oldest at top, rows.length-1 = newest at bottom
      const visualRow = NUM_ROWS - this.rows.length + ri
      const y = gridTop + visualRow * cellH

      if (y < gridTop || y + cellH > gridBottom + 1) continue

      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = gridLeft + ci * cellW
        const intensity = row[ci] / globalMax
        const color = heatColor(intensity)

        ctx.fillStyle = color
        ctx.fillRect(
          x + cellGap * 0.5,
          y + cellGap * 0.5,
          cellW - cellGap,
          cellH - cellGap
        )

        // White-hot cells get a subtle glow
        if (intensity > 0.7) {
          ctx.globalAlpha = (intensity - 0.7) / 0.3 * 0.2
          ctx.shadowColor = '#ffffff'
          ctx.shadowBlur = 6
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(
            x + cellGap * 0.5,
            y + cellGap * 0.5,
            cellW - cellGap,
            cellH - cellGap
          )
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        }
      }
    }

    // ── Empty cells (unfilled rows at the top) ──────────────────────────

    const emptyRows = NUM_ROWS - this.rows.length
    for (let ri = 0; ri < emptyRows; ri++) {
      const y = gridTop + ri * cellH
      for (let ci = 0; ci < NUM_COLS; ci++) {
        const x = gridLeft + ci * cellW
        ctx.fillStyle = CELL_EMPTY
        ctx.fillRect(
          x + cellGap * 0.5,
          y + cellGap * 0.5,
          cellW - cellGap,
          cellH - cellGap
        )
      }
    }

    // ── Glowing "NOW" indicator at bottom edge ──────────────────────────

    const nowY = gridBottom
    const nowGlow = ctx.createLinearGradient(gridLeft, nowY - 6, gridLeft, nowY + 4)
    nowGlow.addColorStop(0, 'transparent')
    nowGlow.addColorStop(0.3, `${NOW_GLOW}30`)
    nowGlow.addColorStop(0.6, `${NOW_GLOW}80`)
    nowGlow.addColorStop(1, `${NOW_GLOW}60`)
    ctx.fillStyle = nowGlow
    ctx.fillRect(gridLeft, nowY - 6, gridW, 10)

    // Bright line
    const nowPulse = 0.6 + 0.4 * Math.sin(frameCount * 0.06)
    ctx.strokeStyle = NOW_GLOW
    ctx.globalAlpha = nowPulse
    ctx.lineWidth = 2
    ctx.shadowColor = NOW_GLOW
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(gridLeft, nowY)
    ctx.lineTo(gridRight, nowY)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1

    // ── Scanline effect (subtle horizontal sweep) ───────────────────────

    this.scanlinePhase = (this.scanlinePhase + 0.3) % NUM_ROWS
    const scanY = gridTop + this.scanlinePhase * cellH
    const scanGrad = ctx.createLinearGradient(gridLeft, scanY - 2, gridLeft, scanY + cellH + 2)
    scanGrad.addColorStop(0, 'transparent')
    scanGrad.addColorStop(0.5, `${NOW_GLOW}08`)
    scanGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = scanGrad
    ctx.fillRect(gridLeft, scanY - 2, gridW, cellH + 4)

    // ── Column headers (bin labels at top) ──────────────────────────────

    ctx.font = '7px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#444444'
    for (let ci = 0; ci < NUM_COLS; ci += 2) {
      const x = gridLeft + ci * cellW + cellW / 2
      ctx.fillText(`${ci * BIN_WIDTH_MS}`, x, gridTop - 4)
    }

    // ── Left-side time labels ───────────────────────────────────────────

    ctx.font = '8px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#444444'

    const timeLabels = [
      { label: 'NOW', row: NUM_ROWS - 1 },
      { label: '-5s', row: NUM_ROWS - 11 },
      { label: '-10s', row: NUM_ROWS - 21 },
      { label: '-15s', row: NUM_ROWS - 31 },
      { label: '-20s', row: NUM_ROWS - 41 },
    ]

    for (const tl of timeLabels) {
      if (tl.row < 0) continue
      const y = gridTop + tl.row * cellH + cellH / 2
      if (tl.label === 'NOW') {
        ctx.fillStyle = NOW_GLOW
      } else {
        ctx.fillStyle = '#444444'
      }
      ctx.fillText(tl.label, gridLeft - 6, y + 3)
    }

    // ── Title ───────────────────────────────────────────────────────────

    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#555555'
    ctx.fillText('LATENCY SPECTROGRAM', gridLeft, 16)

    ctx.textAlign = 'right'
    ctx.font = '10px monospace'
    ctx.fillStyle = '#444444'
    ctx.fillText(`${this.rows.length}/${NUM_ROWS} slices`, gridRight, 16)
  }

  destroy(): void {
    this.rows = []
    this.windowBuffer = []
    super.destroy()
  }
}

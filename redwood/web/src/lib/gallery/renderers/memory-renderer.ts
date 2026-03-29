/**
 * Memory Renderer - Data Matrix
 *
 * Visualizes the first 137 bytes of WASM linear memory as a hex grid.
 * Color-coded regions show Welford state, histogram bins, stats output,
 * and the overflow byte. Cells flash white when their value changes.
 *
 * A Matrix-rain effect of falling hex characters plays behind the grid,
 * giving the panel a "living data" aesthetic.
 *
 * Canvas 2D only.
 */

import { GalleryRenderer, type RendererContext } from '../base-renderer'

// ── Memory region definitions ──────────────────────────────────────────────

interface MemoryRegion {
  name: string
  start: number
  end: number     // exclusive
  color: string
  bgAlpha: number
}

const REGIONS: MemoryRegion[] = [
  { name: 'Welford State', start: 0, end: 40, color: '#ef4444', bgAlpha: 0.05 },
  { name: 'Histogram Bins', start: 40, end: 120, color: '#f59e0b', bgAlpha: 0.05 },
  { name: 'Stats Output', start: 120, end: 136, color: '#22c55e', bgAlpha: 0.05 },
  { name: 'Overflow', start: 136, end: 137, color: '#888888', bgAlpha: 0.05 },
]

const TOTAL_BYTES = 137

// ── Matrix rain column ─────────────────────────────────────────────────────

interface RainColumn {
  x: number
  y: number
  speed: number
  chars: string[]
  length: number
}

// ── Colors ─────────────────────────────────────────────────────────────────

const BG = '#000000'
const RAIN_COLOR = '#22c55e'
const HEX_CHARS = '0123456789ABCDEF'

export class MemoryRenderer extends GalleryRenderer {
  private prevBytes: Uint8Array = new Uint8Array(TOTAL_BYTES)
  private flashTimers: number[] = new Array(TOTAL_BYTES).fill(0)
  private rainColumns: RainColumn[] = []
  private initialized = false

  init(canvas: HTMLCanvasElement): void {
    super.init(canvas)
    this.prevBytes = new Uint8Array(TOTAL_BYTES)
    this.flashTimers = new Array(TOTAL_BYTES).fill(0)
    this.initialized = false

    // Initialize matrix rain columns
    this.rainColumns = []
    const colSpacing = 16
    const numCols = Math.floor(canvas.width / colSpacing)
    for (let i = 0; i < numCols; i++) {
      this.rainColumns.push(this.createRainColumn(i * colSpacing, canvas.height, true))
    }
  }

  draw(context: RendererContext): void {
    const { ctx, width, height, statsApi, frameCount } = context
    if (!ctx) return

    // ── Read WASM memory ───────────────────────────────────────────────

    let currentBytes: Uint8Array
    try {
      currentBytes = new Uint8Array(statsApi.memory.buffer, 0, TOTAL_BYTES)
    } catch {
      // Memory might not be accessible yet - show empty grid
      currentBytes = new Uint8Array(TOTAL_BYTES)
    }

    // ── Detect changes and update flash timers ─────────────────────────

    for (let i = 0; i < TOTAL_BYTES; i++) {
      if (this.initialized && currentBytes[i] !== this.prevBytes[i]) {
        this.flashTimers[i] = 20 // flash for 20 frames
      }
      if (this.flashTimers[i] > 0) {
        this.flashTimers[i]--
      }
    }

    // Copy current bytes for next frame comparison
    this.prevBytes = new Uint8Array(currentBytes)
    this.initialized = true

    // ── Background ─────────────────────────────────────────────────────

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, width, height)

    // ── Matrix rain (behind the grid) ──────────────────────────────────

    for (const col of this.rainColumns) {
      col.y += col.speed

      // Reset column when it falls off screen
      if (col.y - col.length * 14 > height) {
        col.y = -Math.random() * height * 0.5
        col.speed = 0.8 + Math.random() * 2
        col.length = 6 + Math.floor(Math.random() * 12)
        col.chars = Array.from({ length: col.length }, () =>
          HEX_CHARS[Math.floor(Math.random() * 16)]
        )
      }

      // Randomly mutate a character
      if (Math.random() < 0.05) {
        const idx = Math.floor(Math.random() * col.chars.length)
        col.chars[idx] = HEX_CHARS[Math.floor(Math.random() * 16)]
      }

      ctx.font = '11px monospace'
      ctx.textAlign = 'center'

      for (let j = 0; j < col.chars.length; j++) {
        const charY = col.y - j * 14
        if (charY < -14 || charY > height + 14) continue

        // Fade from bright (head) to dim (tail)
        const fade = 1 - j / col.chars.length
        ctx.globalAlpha = fade * 0.15
        ctx.fillStyle = RAIN_COLOR
        ctx.fillText(col.chars[j], col.x, charY)
      }
    }
    ctx.globalAlpha = 1

    // ── Grid layout calculation ────────────────────────────────────────

    const cellW = 28
    const cellH = 18
    const gridPadX = 16
    const gridPadY = 28
    const cols = Math.floor((width - gridPadX * 2) / cellW)
    const rows = Math.ceil(TOTAL_BYTES / cols)

    // Center the grid
    const gridW = cols * cellW
    const gridH = rows * cellH
    const offsetX = (width - gridW) / 2
    const offsetY = gridPadY

    // ── Title ──────────────────────────────────────────────────────────

    ctx.font = 'bold 13px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#555555'
    ctx.fillText('WASM LINEAR MEMORY', offsetX, 18)

    ctx.textAlign = 'right'
    ctx.font = '10px monospace'
    ctx.fillStyle = '#444444'
    ctx.fillText(`${TOTAL_BYTES} bytes`, offsetX + gridW, 18)

    // ── Draw hex cells ─────────────────────────────────────────────────

    ctx.font = '11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < TOTAL_BYTES; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = offsetX + col * cellW
      const y = offsetY + row * cellH

      // Determine which region this byte belongs to
      const region = REGIONS.find((r) => i >= r.start && i < r.end)

      // Region background tint
      if (region) {
        ctx.fillStyle = region.color
        ctx.globalAlpha = region.bgAlpha
        ctx.fillRect(x, y, cellW - 1, cellH - 1)
        ctx.globalAlpha = 1
      }

      // Cell border (very subtle)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, cellW - 1, cellH - 1)

      // Flash effect for changed bytes
      const flashIntensity = this.flashTimers[i] / 20
      if (flashIntensity > 0) {
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = flashIntensity * 0.3
        ctx.fillRect(x, y, cellW - 1, cellH - 1)
        ctx.globalAlpha = 1

        // Glow border on flash
        ctx.strokeStyle = '#ffffff'
        ctx.globalAlpha = flashIntensity * 0.6
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, cellW - 1, cellH - 1)
        ctx.globalAlpha = 1
      }

      // Hex value
      const byte = currentBytes[i]
      const hex = byte.toString(16).toUpperCase().padStart(2, '0')

      // Color: flash white, else region color (dimmed), else default gray
      if (flashIntensity > 0) {
        const gray = Math.round(255 * (0.5 + flashIntensity * 0.5))
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`
      } else if (byte === 0) {
        ctx.fillStyle = '#333333'
      } else if (region) {
        ctx.fillStyle = this.dimColor(region.color, 0.6)
      } else {
        ctx.fillStyle = '#888888'
      }

      ctx.fillText(hex, x + cellW / 2 - 0.5, y + cellH / 2)
    }

    // ── Address markers (every 16 bytes on left side) ──────────────────

    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#333333'
    for (let row = 0; row < rows; row++) {
      const addr = row * cols
      const y = offsetY + row * cellH + cellH / 2
      ctx.fillText(`0x${addr.toString(16).padStart(2, '0')}`, offsetX - 4, y)
    }

    // ── Legend at bottom ───────────────────────────────────────────────

    const legendY = offsetY + gridH + 16
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'

    let legendX = offsetX
    for (const region of REGIONS) {
      // Colored square
      ctx.fillStyle = region.color
      ctx.globalAlpha = 0.6
      ctx.fillRect(legendX, legendY - 8, 8, 8)
      ctx.globalAlpha = 1

      // Label
      ctx.fillStyle = '#888888'
      const label = `${region.name} [${region.start}-${region.end - 1}]`
      ctx.fillText(label, legendX + 12, legendY)

      legendX += ctx.measureText(label).width + 24
    }

    // ── Ambient scanner line (horizontal, sweeps down) ─────────────────

    const scanRow = (frameCount * 0.5) % (rows + 4)
    const scanY = offsetY + scanRow * cellH
    if (scanY >= offsetY && scanY <= offsetY + gridH) {
      const scanGrad = ctx.createLinearGradient(offsetX, scanY - 2, offsetX, scanY + cellH + 2)
      scanGrad.addColorStop(0, 'transparent')
      scanGrad.addColorStop(0.4, `${RAIN_COLOR}10`)
      scanGrad.addColorStop(0.6, `${RAIN_COLOR}10`)
      scanGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = scanGrad
      ctx.fillRect(offsetX, scanY - 2, gridW, cellH + 4)
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private createRainColumn(x: number, height: number, randomStart: boolean): RainColumn {
    const length = 6 + Math.floor(Math.random() * 12)
    return {
      x,
      y: randomStart ? Math.random() * height * 2 - height : -Math.random() * height,
      speed: 0.8 + Math.random() * 2,
      length,
      chars: Array.from({ length }, () => HEX_CHARS[Math.floor(Math.random() * 16)]),
    }
  }

  /** Produce a dimmed version of a hex color */
  private dimColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
  }

  destroy(): void {
    this.rainColumns = []
    this.flashTimers = []
    super.destroy()
  }
}

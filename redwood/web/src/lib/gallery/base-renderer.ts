import type { DemoKeystroke } from './demo-data'
import type { ChronoStatsApi } from '../wasm/stats'

export interface RendererContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  demoData: DemoKeystroke[]
  statsApi: ChronoStatsApi
  time: number
  frameCount: number
  lastKeystroke: DemoKeystroke | null
  replayIndex: number
}

export abstract class GalleryRenderer {
  protected ctx: CanvasRenderingContext2D | null = null
  protected width = 0
  protected height = 0

  init(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2d context')
    this.ctx = ctx
    this.width = canvas.width
    this.height = canvas.height
  }

  abstract draw(context: RendererContext): void

  destroy(): void {
    this.ctx = null
  }
}

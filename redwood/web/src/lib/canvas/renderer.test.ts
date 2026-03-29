import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HistogramRenderer, COLORS, type DrawStats } from './renderer'

/** Creates a mock CanvasRenderingContext2D with spied methods. */
function createMockContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    canvas: { width: 600, height: 300 },
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    globalAlpha: 1,
    lineWidth: 1,
  }
}

/** Creates a mock canvas element that returns our mock context. */
function createMockCanvas(ctx: ReturnType<typeof createMockContext> | null = null) {
  const mockCtx = ctx ?? createMockContext()
  return {
    getContext: vi.fn(() => mockCtx),
    width: 600,
    height: 300,
    __mockCtx: mockCtx,
  } as unknown as HTMLCanvasElement & { __mockCtx: ReturnType<typeof createMockContext> }
}

function createDrawStats(overrides?: Partial<DrawStats>): DrawStats {
  const histogram = new Uint32Array(20)
  histogram[2] = 5
  histogram[5] = 10
  histogram[10] = 3
  return {
    histogram,
    mean: 85.5,
    stddev: 12.3,
    wpm: 120,
    count: 42,
    ...overrides,
  }
}

describe('COLORS', () => {
  it('exports the correct color palette', () => {
    expect(COLORS.background).toBe('#0a0a0a')
    expect(COLORS.bar).toBe('#e5e5e5')
    expect(COLORS.label).toBe('#888888')
    expect(COLORS.tick).toBe('#555555')
    expect(COLORS.statsValue).toBe('#e5e5e5')
    expect(COLORS.statsLabel).toBe('#555555')
  })
})

describe('HistogramRenderer', () => {
  let renderer: HistogramRenderer

  beforeEach(() => {
    renderer = new HistogramRenderer()
  })

  describe('init', () => {
    it('succeeds with a valid canvas', () => {
      const canvas = createMockCanvas()
      expect(() => renderer.init(canvas)).not.toThrow()
      expect(canvas.getContext).toHaveBeenCalledWith('2d')
    })

    it('throws if getContext returns null', () => {
      const canvas = {
        getContext: vi.fn(() => null),
        width: 600,
        height: 300,
      } as unknown as HTMLCanvasElement

      expect(() => renderer.init(canvas)).toThrow()
    })
  })

  describe('draw', () => {
    it('is a no-op before init', () => {
      // Should not throw
      expect(() => renderer.draw(createDrawStats())).not.toThrow()
    })

    it('calls clearRect to clear the canvas', () => {
      const canvas = createMockCanvas()
      renderer.init(canvas)

      renderer.draw(createDrawStats())

      const ctx = canvas.__mockCtx
      expect(ctx.clearRect).toHaveBeenCalled()
    })

    it('calls fillRect to draw background and bars', () => {
      const canvas = createMockCanvas()
      renderer.init(canvas)

      renderer.draw(createDrawStats())

      const ctx = canvas.__mockCtx
      // At least one fillRect for background + bars with nonzero counts
      expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0)
    })

    it('calls fillText to render stats labels', () => {
      const canvas = createMockCanvas()
      renderer.init(canvas)

      renderer.draw(createDrawStats())

      const ctx = canvas.__mockCtx
      expect(ctx.fillText.mock.calls.length).toBeGreaterThan(0)

      // Should include stat values somewhere in fillText calls
      const allText = ctx.fillText.mock.calls.map((c: unknown[]) => String(c[0])).join(' ')
      expect(allText).toContain('Mean')
      expect(allText).toContain('WPM')
    })
  })

  describe('destroy', () => {
    it('makes subsequent draw calls no-ops', () => {
      const canvas = createMockCanvas()
      renderer.init(canvas)
      renderer.destroy()

      const ctx = canvas.__mockCtx
      ctx.clearRect.mockClear()
      ctx.fillRect.mockClear()
      ctx.fillText.mockClear()

      renderer.draw(createDrawStats())

      expect(ctx.clearRect).not.toHaveBeenCalled()
      expect(ctx.fillRect).not.toHaveBeenCalled()
      expect(ctx.fillText).not.toHaveBeenCalled()
    })
  })
})

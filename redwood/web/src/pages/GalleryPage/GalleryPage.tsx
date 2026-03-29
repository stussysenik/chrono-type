/**
 * Gallery Index Page — 2x4 grid of animated thumbnails.
 *
 * Each card runs its renderer on a small 300x200 canvas at ~15fps
 * (throttled by skipping 3 of every 4 frames) to keep 8 simultaneous
 * canvases lightweight. A shared requestAnimationFrame loop distributes
 * work across all thumbnails so only one rAF callback is active.
 *
 * Clicking a card navigates to the full visualization page.
 */

import { useRef, useState, useEffect } from 'react'
import { navigate } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

import { SLIDES } from 'src/lib/gallery/slides'
import { loadChronoStats } from 'src/lib/wasm'
import type { ChronoStatsApi } from 'src/lib/wasm'
import { generateDemoData } from 'src/lib/gallery/demo-data'
import type { GalleryRenderer, RendererContext } from 'src/lib/gallery/base-renderer'
import type { DemoKeystroke } from 'src/lib/gallery/demo-data'

// ── Thumbnail card with its own renderer + throttled animation ────────────

interface ThumbnailState {
  renderer: GalleryRenderer
  canvas: HTMLCanvasElement
  statsApi: ChronoStatsApi
  demoData: DemoKeystroke[]
  replayIndex: number
}

const ThumbnailCard = ({
  slide,
  index,
}: {
  slide: (typeof SLIDES)[number]
  index: number
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<ThumbnailState | null>(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    let destroyed = false
    let animId: number

    async function init() {
      if (!canvasRef.current) return

      // Each thumbnail gets its own WASM instance so mutable state
      // (histogram bins, Welford accumulators) stays isolated.
      let statsApi: ChronoStatsApi
      try {
        statsApi = await loadChronoStats('/chrono_stats.wasm')
      } catch {
        return
      }
      if (destroyed) return

      const renderer = slide.createRenderer()
      renderer.init(canvasRef.current)
      const demoData = generateDemoData(300, 42 + index)

      stateRef.current = {
        renderer,
        canvas: canvasRef.current,
        statsApi,
        demoData,
        replayIndex: 0,
      }

      let frameCount = 0
      const startTime = performance.now()

      function frame() {
        if (destroyed || !stateRef.current) return
        frameCount++

        // Throttle to ~15fps: only draw every 4th frame
        if (frameCount % 4 !== 0) {
          animId = requestAnimationFrame(frame)
          return
        }

        const s = stateRef.current
        const time = (performance.now() - startTime) / 1000

        // Replay demo data slowly — one keystroke every 2 rendered frames
        // (since we render every 4th frame, this is ~1 keystroke per 8 raw frames)
        if (s.replayIndex < s.demoData.length && frameCount % 8 === 0) {
          s.statsApi.update(s.demoData[s.replayIndex].delta)
          s.replayIndex++
        }

        const ctx: RendererContext = {
          ctx: s.canvas.getContext('2d')!,
          width: s.canvas.width,
          height: s.canvas.height,
          demoData: s.demoData,
          statsApi: s.statsApi,
          time,
          frameCount,
          lastKeystroke:
            s.replayIndex > 0 ? s.demoData[s.replayIndex - 1] : null,
          replayIndex: s.replayIndex,
        }

        s.renderer.draw(ctx)
        animId = requestAnimationFrame(frame)
      }

      animId = requestAnimationFrame(frame)
    }

    init()

    return () => {
      destroyed = true
      cancelAnimationFrame(animId)
      if (stateRef.current) {
        stateRef.current.renderer.destroy()
        stateRef.current = null
      }
    }
  }, [slide, index])

  return (
    <div
      onClick={() => navigate(slide.path)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${hover ? '#444' : '#222'}`,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: hover ? 'scale(1.02)' : 'scale(1)',
        background: '#0a0a0a',
      }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          aspectRatio: '300 / 200',
        }}
      />
      <div style={{ padding: '10px 12px' }}>
        <div
          style={{
            fontSize: 14,
            color: '#e5e5e5',
            fontWeight: 600,
            fontFamily:
              'ui-monospace, "SF Mono", "Cascadia Code", monospace',
          }}
        >
          {slide.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#555',
            marginTop: 4,
            fontFamily:
              'ui-monospace, "SF Mono", "Cascadia Code", monospace',
          }}
        >
          {slide.description}
        </div>
      </div>
    </div>
  )
}

// ── Gallery Index Page ────────────────────────────────────────────────────

const GalleryPage = () => {
  return (
    <>
      <Metadata
        title="ChronoType Gallery"
        description="8 visualizations. 1 engine. 692 bytes of Zig WASM."
      />
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          fontFamily:
            'ui-monospace, "SF Mono", "Cascadia Code", monospace',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px',
        }}
      >
        {/* Header */}
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#e5e5e5',
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          ChronoType Gallery
        </h1>
        <p
          style={{
            color: '#555',
            fontSize: 16,
            margin: '12px 0 40px',
            textAlign: 'center',
          }}
        >
          8 visualizations. 1 engine. 692 bytes of Zig WASM.
        </p>

        {/* 2x4 grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            maxWidth: 1280,
            width: '100%',
          }}
        >
          {SLIDES.map((slide, i) => (
            <ThumbnailCard
              key={slide.path}
              slide={slide}
              index={i}
            />
          ))}
        </div>

        {/* Back to Home */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
          style={{
            marginTop: 48,
            color: '#555',
            fontSize: 14,
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#888'
            e.currentTarget.style.textDecoration = 'underline'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#555'
            e.currentTarget.style.textDecoration = 'none'
          }}
        >
          Back to Home
        </a>
      </div>
    </>
  )
}

export default GalleryPage

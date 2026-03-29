/**
 * TypingArea — the core interactive component.
 *
 * Architecture:
 *   Canvas ← HistogramRenderer (imperative, 60fps via animationFrameScheduler)
 *   Textarea ← createKeystrokeStream (RxJS fromEvent wrapper)
 *   WASM ← loadChronoStats (Zig Welford's + histogram, zero-copy memory view)
 *
 * Three streams run concurrently (never inside React's render path):
 *   1. Ingestion: keydown → filter delta → wasm.update()
 *   2. Visualization: animationFrame → read WASM stats → canvas.draw()
 *   3. Network sync: keystroke$ → buffer(100ms) → push to Phoenix (Phase 4)
 *
 * React only manages: mount/unmount lifecycle and the disabled/placeholder
 * state of the textarea. No React re-renders inside the hot path.
 */
import { useRef, useEffect, useState } from 'react'

import { Subject, interval, animationFrameScheduler } from 'rxjs'

import { HistogramRenderer } from 'src/lib/canvas'
import type { DrawStats } from 'src/lib/canvas'
import {
  createKeystrokeStream,
  createStatsIngestionStream,
  createVisualizationStream,
} from 'src/lib/streams'
import { loadChronoStats } from 'src/lib/wasm'
import type { ChronoStatsApi } from 'src/lib/wasm'

interface Stats {
  mean: number
  stddev: number
  wpm: number
  count: number
}

const TypingArea = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const rendererRef = useRef<HistogramRenderer | null>(null)
  const [_stats, setStats] = useState<Stats>({ mean: 0, stddev: 0, wpm: 0, count: 0 })
  const [wasmLoaded, setWasmLoaded] = useState(false)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function init() {
      if (!canvasRef.current || !textareaRef.current) return

      // Init Canvas 2D renderer (no React, pure imperative)
      const renderer = new HistogramRenderer()
      renderer.init(canvasRef.current)
      rendererRef.current = renderer

      // Load Zig WASM engine
      let statsApi: ChronoStatsApi
      try {
        statsApi = await loadChronoStats('/chrono_stats.wasm')
        setWasmLoaded(true)
      } catch (err) {
        console.error('Failed to load WASM stats engine:', err)
        return
      }

      // Stream 1: stats ingestion (event rate — every keystroke)
      const keystroke$ = createKeystrokeStream(textareaRef.current!)
      const ingestionSub = createStatsIngestionStream(keystroke$, statsApi).subscribe()

      // Stream 2: visualization (frame rate — 60fps via animationFrameScheduler)
      // interval(0, animationFrameScheduler) fires on every animation frame.
      const frameTrigger$ = new Subject<void>()
      const frameSub = interval(0, animationFrameScheduler).subscribe(() =>
        frameTrigger$.next()
      )

      const vizSub = createVisualizationStream(statsApi, frameTrigger$).subscribe(
        (snapshot) => {
          const drawStats: DrawStats = {
            histogram: snapshot.histogram,
            mean: snapshot.mean,
            stddev: snapshot.stddev,
            wpm: snapshot.wpm,
            count: snapshot.count,
          }
          renderer.draw(drawStats)
          // Only update React state for stats readout below canvas;
          // canvas rendering itself never triggers a React re-render.
          setStats({
            mean: snapshot.mean,
            stddev: snapshot.stddev,
            wpm: snapshot.wpm,
            count: snapshot.count,
          })
        }
      )

      cleanup = () => {
        frameSub.unsubscribe()
        ingestionSub.unsubscribe()
        vizSub.unsubscribe()
        frameTrigger$.complete()
        renderer.destroy()
        statsApi.reset()
      }
    }

    init()
    return () => cleanup?.()
  }, [])

  // Auto-focus textarea once WASM is ready
  useEffect(() => {
    if (wasmLoaded) textareaRef.current?.focus()
  }, [wasmLoaded])

  return (
    <div
      style={{
        background: '#0a0a0a',
        padding: 24,
        borderRadius: 12,
        maxWidth: 640,
        width: '100%',
      }}
    >
      {/* Histogram — rendered imperatively via Canvas 2D, not via React */}
      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        style={{ display: 'block', marginBottom: 16, borderRadius: 4 }}
        aria-label="Keystroke latency histogram"
      />

      {/* Typing input */}
      <textarea
        ref={textareaRef}
        role="textbox"
        aria-label="Type here to start recording keystrokes"
        placeholder={wasmLoaded ? 'Start typing\u2026' : 'Loading WASM engine\u2026'}
        disabled={!wasmLoaded}
        style={{
          width: '100%',
          height: 80,
          background: '#111',
          color: '#e5e5e5',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '10px 12px',
          fontFamily: 'monospace',
          fontSize: 14,
          resize: 'none',
          outline: 'none',
          boxSizing: 'border-box',
          opacity: wasmLoaded ? 1 : 0.5,
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  )
}

export default TypingArea

/**
 * useGalleryViz — shared React hook for gallery visualization pages.
 *
 * Handles the full lifecycle that every visualization page needs:
 *   1. Create a canvas ref for the component to attach
 *   2. Load WASM via loadChronoStats
 *   3. Generate deterministic demo data (seeded PRNG)
 *   4. Instantiate the renderer
 *   5. Run a requestAnimationFrame loop that gradually replays demo keystrokes
 *      (~1 per 3 frames = ~20/sec at 60fps) and calls renderer.draw()
 *   6. Support "live" mode toggle — when live, demo replay pauses so
 *      real keystroke events can drive the WASM engine instead
 *   7. Clean up on unmount (cancel animation, destroy renderer)
 *
 * @param createRenderer - Factory function returning a fresh GalleryRenderer
 * @returns { canvasRef, wasmLoaded, isLive, toggleLive }
 */

import { useRef, useState, useEffect, useCallback } from 'react'

import { loadChronoStats } from '../wasm'
import type { ChronoStatsApi } from '../wasm'

import { generateDemoData } from './demo-data'
import type { GalleryRenderer, RendererContext } from './base-renderer'

export function useGalleryViz(createRenderer: () => GalleryRenderer) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [wasmLoaded, setWasmLoaded] = useState(false)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    let animId: number
    let destroyed = false

    async function init() {
      if (!canvasRef.current) return

      const renderer = createRenderer()
      renderer.init(canvasRef.current)

      let statsApi: ChronoStatsApi
      try {
        statsApi = await loadChronoStats('/chrono_stats.wasm')
        if (destroyed) return
        setWasmLoaded(true)
      } catch (e) {
        console.error('Failed to load WASM:', e)
        return
      }

      const demoData = generateDemoData(300)
      let replayIndex = 0
      let frameCount = 0
      const startTime = performance.now()

      function frame() {
        if (destroyed) return
        frameCount++
        const time = (performance.now() - startTime) / 1000

        // Replay one demo keystroke every 3 frames (~20 keystrokes/sec at 60fps)
        // to simulate realistic typing cadence. Pauses in live mode.
        if (!isLive && replayIndex < demoData.length && frameCount % 3 === 0) {
          statsApi.update(demoData[replayIndex].delta)
          replayIndex++
        }

        const ctx: RendererContext = {
          ctx: canvasRef.current!.getContext('2d')!,
          width: canvasRef.current!.width,
          height: canvasRef.current!.height,
          demoData,
          statsApi,
          time,
          frameCount,
          lastKeystroke: replayIndex > 0 ? demoData[replayIndex - 1] : null,
          replayIndex,
        }

        renderer.draw(ctx)
        animId = requestAnimationFrame(frame)
      }

      animId = requestAnimationFrame(frame)
    }

    init()

    return () => {
      destroyed = true
      cancelAnimationFrame(animId)
    }
  }, [createRenderer, isLive])

  // GalleryShell passes the desired boolean state; also works as a plain toggle.
  const toggleLive = useCallback(
    (live: boolean) => setIsLive(live),
    []
  )

  return { canvasRef, wasmLoaded, isLive, toggleLive }
}

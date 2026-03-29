import { useRef, useState, useEffect, useCallback } from 'react'
import { Metadata } from '@redwoodjs/web'

import GalleryShell from 'src/components/GalleryShell/GalleryShell'
import { SLIDES } from 'src/lib/gallery/slides'
import { loadChronoStats } from 'src/lib/wasm'
import type { ChronoStatsApi } from 'src/lib/wasm'
import { generateDemoData } from 'src/lib/gallery/demo-data'
import type { RendererContext } from 'src/lib/gallery/base-renderer'

const SLIDE_INDEX = 2

const GalleryWaveformPage = () => {
  const slide = SLIDES[SLIDE_INDEX]
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [wasmLoaded, setWasmLoaded] = useState(false)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    let animId: number
    let destroyed = false

    async function init() {
      if (!canvasRef.current) return

      const renderer = slide.createRenderer()
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

        if (replayIndex < demoData.length && frameCount % 3 === 0) {
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
  }, [])

  const toggleLive = useCallback((live: boolean) => setIsLive(live), [])

  return (
    <>
      <Metadata title={slide.title} description={slide.description} />
      <GalleryShell
        title={slide.title}
        description={slide.description}
        currentIndex={SLIDE_INDEX}
        slides={SLIDES}
        isLive={isLive}
        onLiveToggle={toggleLive}
      >
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </GalleryShell>
    </>
  )
}

export default GalleryWaveformPage

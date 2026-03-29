/**
 * Gallery Heatmap Page — full-screen "The Heatmap" visualization.
 *
 * Renders the LED spectrogram of rhythm over time using the HeatmapRenderer
 * at 1200x800 on a full-viewport canvas.
 */

import { Metadata } from '@redwoodjs/web'

import GalleryShell from 'src/components/GalleryShell/GalleryShell'
import { SLIDES } from 'src/lib/gallery/slides'
import { useGalleryViz } from 'src/lib/gallery/useGalleryViz'

const SLIDE_INDEX = 5

const GalleryHeatmapPage = () => {
  const slide = SLIDES[SLIDE_INDEX]
  const { canvasRef, isLive, toggleLive } = useGalleryViz(slide.createRenderer)

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

export default GalleryHeatmapPage

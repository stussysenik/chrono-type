import { useCallback, useEffect, useState } from 'react'
import { navigate } from '@redwoodjs/router'

interface GalleryShellProps {
  title: string
  description: string
  currentIndex: number
  slides: Array<{ path: string; title: string }>
  children: React.ReactNode
  onLiveToggle?: (live: boolean) => void
  isLive?: boolean
}

const GalleryShell = ({
  title,
  description,
  currentIndex,
  slides,
  children,
  onLiveToggle,
  isLive = false,
}: GalleryShellProps) => {
  const [hoverLeft, setHoverLeft] = useState(false)
  const [hoverRight, setHoverRight] = useState(false)

  const goPrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + slides.length) % slides.length
    navigate(slides[prevIndex].path)
  }, [currentIndex, slides])

  const goNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % slides.length
    navigate(slides[nextIndex].path)
  }, [currentIndex, slides])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        overflow: 'hidden',
        fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
      }}
    >
      {/* Canvas / visualization area */}
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>

      {/* Title overlay — top-left */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 24,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: '#555' }}>{description}</div>
      </div>

      {/* Gallery back link — top-right */}
      <button
        onClick={() => navigate('/gallery')}
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          zIndex: 10,
          background: 'none',
          border: 'none',
          color: '#555',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
          padding: '4px 8px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#888')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
      >
        Gallery
      </button>

      {/* Left arrow */}
      <button
        onClick={goPrev}
        onMouseEnter={() => setHoverLeft(true)}
        onMouseLeave={() => setHoverLeft(false)}
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          background: hoverLeft
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.04)',
          color: hoverLeft ? '#aaa' : '#555',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: hoverLeft ? '0 0 12px rgba(255,255,255,0.08)' : 'none',
        }}
        aria-label="Previous visualization"
      >
        &#8249;
      </button>

      {/* Right arrow */}
      <button
        onClick={goNext}
        onMouseEnter={() => setHoverRight(true)}
        onMouseLeave={() => setHoverRight(false)}
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          background: hoverRight
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.04)',
          color: hoverRight ? '#aaa' : '#555',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: hoverRight ? '0 0 12px rgba(255,255,255,0.08)' : 'none',
        }}
        aria-label="Next visualization"
      >
        &#8250;
      </button>

      {/* Bottom center: page indicator + live toggle */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* "Try it live" toggle */}
        {onLiveToggle && (
          <button
            onClick={() => onLiveToggle(!isLive)}
            style={{
              background: isLive
                ? 'rgba(100, 200, 100, 0.15)'
                : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isLive ? 'rgba(100, 200, 100, 0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              color: isLive ? '#8c8' : '#555',
              fontSize: 12,
              fontFamily: 'inherit',
              padding: '6px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isLive ? 'Exit live mode' : 'Try it live'}
          </button>
        )}

        {/* Page indicator */}
        <div style={{ fontSize: 12, color: '#555' }}>
          {currentIndex + 1} / {slides.length}
        </div>
      </div>
    </div>
  )
}

export default GalleryShell

import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

/**
 * HomePage — ChronoType landing page.
 *
 * Entry point for the typing test experience. Links to SessionPage
 * where the WASM engine + Canvas histogram + Phoenix Channels come alive.
 */
const HomePage = () => {
  return (
    <>
      <Metadata title="ChronoType" description="Real-time keystroke dynamics visualizer" />
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          color: '#e5e5e5',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, sans-serif',
          gap: 24,
        }}
      >
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>
          ChronoType
        </h1>
        <p style={{ color: '#555', fontSize: 16, margin: 0, maxWidth: 400, textAlign: 'center' }}>
          Real-time keystroke dynamics. Zig WASM statistics. Phoenix Channels. Canvas 2D at 60fps.
        </p>
        <Link
          to={routes.session()}
          style={{
            background: '#e5e5e5',
            color: '#000',
            padding: '12px 28px',
            borderRadius: 6,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          Start Typing
        </Link>
      </div>
    </>
  )
}

export default HomePage

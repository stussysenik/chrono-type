import { Metadata } from '@redwoodjs/web'

import TypingArea from 'src/components/TypingArea/TypingArea'

/**
 * SessionPage — active typing session.
 *
 * Mounts the TypingArea which owns the WASM engine + RxJS pipeline + Canvas renderer.
 * Centered on a full-viewport dark background to match the Stripe-minimal aesthetic.
 */
const SessionPage = () => {
  return (
    <>
      <Metadata title="Session" description="Typing session" />
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <TypingArea />
      </div>
    </>
  )
}

export default SessionPage

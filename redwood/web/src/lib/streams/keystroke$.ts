/**
 * RxJS observable that emits keystroke events from a DOM element.
 *
 * Each emission includes the raw key/code, a high-resolution timestamp
 * (performance.now()), and the delta in milliseconds since the previous
 * keystroke. The first keystroke has `delta: undefined`.
 *
 * Modifier keys (Shift, Control, Alt, Meta, CapsLock) and repeat events
 * are filtered out since they don't represent actual character input.
 * The event listener is removed automatically when the subscription ends.
 */

import { Observable } from 'rxjs'

// ── Types ───────────────────────────────────────────────────────────────────

export interface KeystrokeEvent {
  key: string
  code: string
  timestamp: number
  delta: number | undefined
}

// ── Modifier filter ─────────────────────────────────────────────────────────

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'CapsLock',
])

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates an observable of keystroke events from the given element.
 *
 * @param element - The DOM element to listen on (usually `document.body`
 *   or a focused input container).
 * @returns An observable that emits KeystrokeEvent objects on each
 *   non-modifier, non-repeat keydown.
 */
export function createKeystrokeStream(
  element: HTMLElement,
): Observable<KeystrokeEvent> {
  return new Observable<KeystrokeEvent>((subscriber) => {
    let lastTimestamp: number | undefined

    const handler = (e: KeyboardEvent) => {
      // Skip modifier keys and auto-repeat events
      if (MODIFIER_KEYS.has(e.key) || e.repeat) return

      const timestamp = performance.now()
      const delta = lastTimestamp !== undefined
        ? timestamp - lastTimestamp
        : undefined

      lastTimestamp = timestamp

      subscriber.next({
        key: e.key,
        code: e.code,
        timestamp,
        delta,
      })
    }

    element.addEventListener('keydown', handler)

    // Teardown: remove listener when unsubscribed
    return () => {
      element.removeEventListener('keydown', handler)
    }
  })
}

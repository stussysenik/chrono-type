import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createKeystrokeStream, type KeystrokeEvent } from './keystroke$'

/**
 * Creates a minimal mock HTMLElement with addEventListener/removeEventListener
 * spies that capture the registered handler so tests can dispatch events.
 */
function createMockElement() {
  let handler: ((e: KeyboardEvent) => void) | null = null

  const element = {
    addEventListener: vi.fn((event: string, h: (e: KeyboardEvent) => void) => {
      if (event === 'keydown') handler = h
    }),
    removeEventListener: vi.fn((event: string, h: (e: KeyboardEvent) => void) => {
      if (event === 'keydown' && handler === h) handler = null
    }),
  } as unknown as HTMLElement

  function dispatch(partial: Partial<KeyboardEvent>) {
    handler?.({
      key: 'a',
      code: 'KeyA',
      repeat: false,
      ...partial,
    } as KeyboardEvent)
  }

  return { element, dispatch, getHandler: () => handler }
}

describe('createKeystrokeStream', () => {
  beforeEach(() => {
    // Provide deterministic timestamps
    let time = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => {
      const t = time
      time += 100
      return t
    })
  })

  it('registers a keydown listener on subscribe', () => {
    const { element } = createMockElement()
    const sub = createKeystrokeStream(element).subscribe()

    expect(element.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    sub.unsubscribe()
  })

  it('emits events with key, code, and timestamp', () => {
    const { element, dispatch } = createMockElement()
    const events: KeystrokeEvent[] = []

    const sub = createKeystrokeStream(element).subscribe((e) => events.push(e))
    dispatch({ key: 'a', code: 'KeyA' })

    expect(events).toHaveLength(1)
    expect(events[0].key).toBe('a')
    expect(events[0].code).toBe('KeyA')
    expect(events[0].timestamp).toBe(1000)

    sub.unsubscribe()
  })

  it('first keystroke has delta undefined', () => {
    const { element, dispatch } = createMockElement()
    const events: KeystrokeEvent[] = []

    const sub = createKeystrokeStream(element).subscribe((e) => events.push(e))
    dispatch({ key: 'a', code: 'KeyA' })

    expect(events[0].delta).toBeUndefined()

    sub.unsubscribe()
  })

  it('computes delta between successive keystrokes', () => {
    const { element, dispatch } = createMockElement()
    const events: KeystrokeEvent[] = []

    const sub = createKeystrokeStream(element).subscribe((e) => events.push(e))
    dispatch({ key: 'a', code: 'KeyA' })
    dispatch({ key: 'b', code: 'KeyB' })

    expect(events).toHaveLength(2)
    expect(events[1].delta).toBe(100) // 1100 - 1000

    sub.unsubscribe()
  })

  it('filters out modifier keys', () => {
    const { element, dispatch } = createMockElement()
    const events: KeystrokeEvent[] = []

    const sub = createKeystrokeStream(element).subscribe((e) => events.push(e))
    dispatch({ key: 'Shift', code: 'ShiftLeft' })
    dispatch({ key: 'Control', code: 'ControlLeft' })
    dispatch({ key: 'Alt', code: 'AltLeft' })
    dispatch({ key: 'Meta', code: 'MetaLeft' })
    dispatch({ key: 'CapsLock', code: 'CapsLock' })

    expect(events).toHaveLength(0)

    sub.unsubscribe()
  })

  it('filters out repeat events', () => {
    const { element, dispatch } = createMockElement()
    const events: KeystrokeEvent[] = []

    const sub = createKeystrokeStream(element).subscribe((e) => events.push(e))
    dispatch({ key: 'a', code: 'KeyA', repeat: true })

    expect(events).toHaveLength(0)

    sub.unsubscribe()
  })

  it('removes listener on unsubscribe', () => {
    const { element } = createMockElement()

    const sub = createKeystrokeStream(element).subscribe()
    sub.unsubscribe()

    expect(element.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
})

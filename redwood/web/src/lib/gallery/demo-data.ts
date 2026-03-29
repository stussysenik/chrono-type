// Seeded PRNG for reproducible demo data
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normalRandom(rand: () => number, mean: number, stddev: number): number {
  const u1 = rand()
  const u2 = rand()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stddev
}

export interface DemoKeystroke {
  delta: number
  key: string
  timestamp: number
}

export function generateDemoData(count = 200, seed = 42): DemoKeystroke[] {
  const rand = mulberry32(seed)
  const text = 'the quick brown fox jumps over the lazy dog '
  const keys = text.split('')
  const result: DemoKeystroke[] = []
  let timestamp = 0

  for (let i = 0; i < count; i++) {
    const isWordBoundary = keys[i % keys.length] === ' '
    const mean = isWordBoundary ? 180 : 75
    const stddev = isWordBoundary ? 40 : 20
    const delta = Math.max(5, normalRandom(rand, mean, stddev))
    timestamp += delta
    result.push({ delta, key: keys[i % keys.length], timestamp })
  }
  return result
}

export function replayIntoWasm(
  data: DemoKeystroke[],
  statsApi: { update(delta: number): void },
  onEach?: (i: number, keystroke: DemoKeystroke) => void
): void {
  for (let i = 0; i < data.length; i++) {
    statsApi.update(data[i].delta)
    onEach?.(i, data[i])
  }
}

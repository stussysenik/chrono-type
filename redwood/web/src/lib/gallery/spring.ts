export interface Spring {
  position: number
  velocity: number
  target: number
}

export function createSpring(initial = 0): Spring {
  return { position: initial, velocity: 0, target: initial }
}

export function updateSpring(spring: Spring, stiffness = 180, damping = 12, dt = 1 / 60): void {
  const force = -stiffness * (spring.position - spring.target)
  const dampForce = -damping * spring.velocity
  spring.velocity += (force + dampForce) * dt
  spring.position += spring.velocity * dt
}

export function createSpringArray(count: number, initial = 0): Spring[] {
  return Array.from({ length: count }, () => createSpring(initial))
}

export function updateSprings(springs: Spring[], stiffness?: number, damping?: number, dt?: number): void {
  for (const s of springs) updateSpring(s, stiffness, damping, dt)
}

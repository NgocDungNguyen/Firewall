import { GATE_X } from './constants.js'

export function updateParticles(world, dt, callbacks) {
  const norm = dt / 16.667
  for (const [id, p] of world.particles) {
    if (p.state !== 'moving') continue
    p.x += p.vx * norm
    p.y += p.vy * norm
    if (p.x + p.width >= GATE_X && !p.reachedGate) {
      p.reachedGate = true
      p.state = 'breached'
      callbacks.onBreach(p)
    }
  }
}

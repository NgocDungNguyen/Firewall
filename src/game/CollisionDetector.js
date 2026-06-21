import { INTERACT_RADIUS } from './constants.js'

export function updateCollisions(world) {
  for (const p of world.players) {
    let nearest = null, bestDist = INTERACT_RADIUS
    const pcx = p.x + p.width / 2, pcy = p.y + p.height / 2
    for (const [, particle] of world.particles) {
      if (particle.state !== 'moving') continue
      if (particle.inspectedBy !== null && particle.inspectedBy !== p.id) continue
      const cx = particle.x + particle.width / 2
      const cy = particle.y + particle.height / 2
      const dist = Math.hypot(pcx - cx, pcy - cy)
      if (dist < bestDist) { bestDist = dist; nearest = particle.id }
    }
    p.nearParticleId = nearest
  }
}

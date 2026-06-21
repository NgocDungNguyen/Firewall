import { LANE_YS, PARTICLE_W, PARTICLE_H } from './constants.js'
import { generateMetadata } from '../data/metadataGenerator.js'
import { randInt, randFrom } from '../data/threatProfiles.js'

let particleIdCounter = 0

function makeId() { return 'p_' + (++particleIdCounter) }

function pickViruses(count, ratio) {
  const n = Math.round(count * ratio)
  const slots = Array(count).fill(false)
  const indices = [...Array(count).keys()].sort(() => Math.random() - 0.5)
  for (let i = 0; i < n; i++) slots[indices[i]] = true
  return slots
}

export function tickWaves(world, levelDef, callbacks) {
  // Drain pending spawn queue
  while (world.pendingSpawns.length > 0 && world.frameCount >= world.pendingSpawns[0].spawnAt) {
    const entry = world.pendingSpawns.shift()
    world.particles.set(entry.particle.id, entry.particle)
  }

  if (world.waveIndex >= levelDef.wavesPerRound) return
  if (world.frameCount < world.nextWaveFrame) return

  const virusSlots = pickViruses(levelDef.particlesPerWave, levelDef.virusRatio)
  const usedLanes  = new Set()

  for (let i = 0; i < levelDef.particlesPerWave; i++) {
    const isVirus = virusSlots[i]
    let lane
    do { lane = randInt(0, LANE_YS.length - 1) } while (usedLanes.size < LANE_YS.length && usedLanes.has(lane))
    usedLanes.add(lane)

    const threatType = isVirus ? randFrom(levelDef.threatTypes.filter(t => t !== 'clean')) : 'clean'
    const metadata   = generateMetadata(isVirus, threatType)

    const particle = {
      id: makeId(),
      x: -PARTICLE_W - 10,
      y: LANE_YS[lane] - PARTICLE_H / 2,
      vx: levelDef.baseSpeed + (Math.random() * 0.6 - 0.3),
      vy: 0,
      lane, width: PARTICLE_W, height: PARTICLE_H,
      spriteKey: threatType,
      metadata,
      isVirus,
      state: 'moving',
      inspectedBy: null,
      spawnedInWave: world.waveIndex,
      reachedGate: false,
    }

    world.pendingSpawns.push({ particle, spawnAt: world.frameCount + i * 20 })
  }

  world.waveIndex++
  world.nextWaveFrame = world.frameCount + levelDef.spawnIntervalFrames
  callbacks.onWaveAdvance(world.waveIndex, levelDef.wavesPerRound)
}

export function skipCurrentWave(world, levelDef, callbacks) {
  const currentWave = world.waveIndex - 1
  let damage = 0
  for (const [, p] of world.particles) {
    if (p.state === 'moving' && p.spawnedInWave === currentWave) {
      p.state = 'passed'
      if (p.isVirus) damage += levelDef.damage
    }
  }
  world.pendingSpawns = world.pendingSpawns.filter(e => e.particle.spawnedInWave !== currentWave)
  if (damage > 0) callbacks.onDamage(damage)
}

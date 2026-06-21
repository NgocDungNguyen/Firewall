import { LANE_YS, PARTICLE_W, PARTICLE_H } from './constants.js'
import { generateMetadata } from '../data/metadataGenerator.js'
import { randInt, randFrom } from '../data/threatProfiles.js'

let particleIdCounter = 0
function makeId() { return 'p_' + (++particleIdCounter) }

function pickViruses(count, ratio) {
  const n     = Math.round(count * ratio)
  const slots = Array(count).fill(false)
  const idx   = [...Array(count).keys()].sort(() => Math.random() - 0.5)
  for (let i = 0; i < n; i++) slots[idx[i]] = true
  return slots
}

export function tickWaves(world, levelDef, callbacks) {
  // Drain pending spawn queue (intra-wave stagger: 5 frames ≈ near-simultaneous)
  while (world.pendingSpawns.length > 0 && world.frameCount >= world.pendingSpawns[0].spawnAt) {
    const entry = world.pendingSpawns.shift()
    world.particles.set(entry.particle.id, entry.particle)
  }

  if (world.waveIndex >= levelDef.wavesPerRound) return
  if (world.frameCount < world.nextWaveFrame) return

  const virusSlots = pickViruses(levelDef.particlesPerWave, levelDef.virusRatio)
  const usedLanes  = new Set()

  for (let i = 0; i < levelDef.particlesPerWave; i++) {
    const isVirus    = virusSlots[i]
    let lane
    do { lane = randInt(0, LANE_YS.length - 1) } while (usedLanes.size < LANE_YS.length && usedLanes.has(lane))
    usedLanes.add(lane)

    const threatType = isVirus
      ? randFrom(levelDef.threatTypes.filter(t => t !== 'clean'))
      : 'clean'
    const metadata   = generateMetadata(isVirus, threatType)

    const particle = {
      id: makeId(),
      x: -PARTICLE_W - 10,
      y: LANE_YS[lane] - PARTICLE_H / 2,
      vx: levelDef.baseSpeed + (Math.random() * 0.4 - 0.2),
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

    // 5-frame stagger so all 3 appear near-simultaneously
    world.pendingSpawns.push({ particle, spawnAt: world.frameCount + i * 5 })
  }

  world.waveIndex++
  world.nextWaveFrame = world.frameCount + levelDef.spawnIntervalFrames
  callbacks.onWaveAdvance(world.waveIndex, levelDef.wavesPerRound)
}

// Spacebar: skip the inter-wave WAIT countdown — bring next wave NOW
export function skipWaveCountdown(world) {
  if (world.waveIndex >= world.levelDef?.wavesPerRound) return
  world.nextWaveFrame = world.frameCount   // trigger next wave on next tick
}

// Returns seconds remaining until next wave (for display)
export function getWaitSecondsLeft(world) {
  const framesLeft = world.nextWaveFrame - world.frameCount
  return Math.max(0, Math.ceil(framesLeft / 60))
}

// Renderer.js — thin wrapper over the Three.js Renderer3D engine.
// Keeps the same export names so GameEngine callers need only minimal changes.

import { renderer3D } from './Renderer3D.js'

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function initScene(canvas) {
  if (!renderer3D.renderer) {
    renderer3D.init(canvas)        // first-time WebGL setup
  } else {
    renderer3D.disposeRound()      // clean previous-round objects; keep scene
  }
}

export function disposeRound() { renderer3D.disposeRound() }

// ── Per-frame sync ────────────────────────────────────────────────────────────

export function syncParticles(particles, world) { renderer3D.syncParticles(particles, world) }
export function syncPlayers(players)             { renderer3D.syncPlayers(players) }
export function updateGate(firewallHP)           { renderer3D.updateGate(firewallHP) }
export function renderFrame()                    { renderer3D.renderFrame() }

// ── Wave countdown DOM overlay ────────────────────────────────────────────────

export function showCountdown(secsLeft, nextWave, totalWaves) {
  const el = document.getElementById('wave-countdown-3d')
  if (!el) return
  document.getElementById('wc3d-title').textContent   = `WAVE ${nextWave} OF ${totalWaves} INCOMING`
  document.getElementById('wc3d-number').textContent  = secsLeft
  el.classList.remove('wc3d--hidden')
}

export function hideCountdown() {
  document.getElementById('wave-countdown-3d')?.classList.add('wc3d--hidden')
}

// ── Camera animations (tutorial) ─────────────────────────────────────────────
export function animateCamera(pos, look, ms) { renderer3D.animateCamera(pos, look, ms) }
export function resetCamera(ms)              { renderer3D.resetCamera(ms) }

// ── Pause overlay — no-op (notebook/toolbox overlays cover the screen) ────────
export function drawPauseOverlay() {}

// ── Modal projection: game coords → CSS screen position ──────────────────────
export function projectGameToScreen(gameX, gameY) {
  return renderer3D.project(gameX, gameY)
}

// ── Legacy no-ops kept so any remaining callers don't throw ──────────────────
export function clear()           {}
export function drawBackground()  {}
export function drawGate()        {}
export function drawParticles()   {}
export function drawPlayers()     {}
export function drawInteractPrompts() {}
export function drawWaveCountdown()   {}

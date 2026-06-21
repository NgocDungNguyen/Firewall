import { CANVAS_W, CANVAS_H, HUD_H, PLAYER_W, PLAYER_H, PLAYER_SPEED } from './constants.js'

const FRAME_DURATION = 8

export function createPlayer(id, x, y, color, name) {
  return { id, x, y, vx: 0, vy: 0, width: PLAYER_W, height: PLAYER_H,
    animFrame: 0, frameTimer: 0, facingRight: true,
    nearParticleId: null, score: 0, color, name, isMoving: false }
}

export function updatePlayers(world, dt) {
  const norm = dt / 16.667
  for (const p of world.players) {
    const k  = world.keys
    const m  = world.mobileMove   // touch input (P1 only)
    const kb = world.keybindings[p.id]
    let dx = 0, dy = 0
    if (k.has(kb.left))  dx -= 1
    if (k.has(kb.right)) dx += 1
    if (k.has(kb.up))    dy -= 1
    if (k.has(kb.down))  dy += 1
    // Mobile d-pad (only applies to P1 in single-player)
    if (m && p.id === 'p1') {
      if (m.left)  dx = Math.max(-1, dx - 1)
      if (m.right) dx = Math.min( 1, dx + 1)
      if (m.up)    dy = Math.max(-1, dy - 1)
      if (m.down)  dy = Math.min( 1, dy + 1)
    }
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707 }
    p.vx = dx * PLAYER_SPEED * norm
    p.vy = dy * PLAYER_SPEED * norm
    p.x = Math.max(0, Math.min(CANVAS_W - p.width,  p.x + p.vx))
    p.y = Math.max(HUD_H, Math.min(CANVAS_H - p.height, p.y + p.vy))
    if (dx > 0) p.facingRight = true
    if (dx < 0) p.facingRight = false
    p.isMoving = dx !== 0 || dy !== 0
    if (p.isMoving) {
      p.frameTimer += 1
      if (p.frameTimer >= FRAME_DURATION) { p.frameTimer = 0; p.animFrame = (p.animFrame + 1) % 4 }
    } else {
      p.animFrame = 0; p.frameTimer = 0
    }
  }
}

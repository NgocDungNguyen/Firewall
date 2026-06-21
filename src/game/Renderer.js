import {
  CANVAS_W, CANVAS_H, HUD_H,
  GATE_X, GATE_Y, GATE_H, GATE_W,
  LANE_YS, INTERACT_RADIUS,
  THREAT_COLORS, PLAYER_COLORS,
} from './constants.js'

export function clear(ctx) {
  ctx.fillStyle = '#060912'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}

export function drawBackground(ctx) {
  // Scrolling grid
  ctx.save()
  ctx.strokeStyle = 'rgba(34,211,238,0.04)'
  ctx.lineWidth = 1
  const gs = 80
  for (let x = 0; x < CANVAS_W; x += gs) { ctx.beginPath(); ctx.moveTo(x,HUD_H); ctx.lineTo(x,CANVAS_H); ctx.stroke() }
  for (let y = HUD_H; y < CANVAS_H; y += gs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_W,y); ctx.stroke() }
  ctx.restore()

  // Lane guides
  ctx.save()
  ctx.strokeStyle = 'rgba(34,211,238,0.06)'
  ctx.lineWidth = 1
  ctx.setLineDash([8, 16])
  for (const ly of LANE_YS) {
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(GATE_X, ly); ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()
}

export function drawGate(ctx, hp) {
  // Wall
  ctx.save()
  ctx.fillStyle = '#0f1a2e'
  ctx.fillRect(GATE_X, 0, CANVAS_W - GATE_X, CANVAS_H)

  // Wall edge glow
  const grad = ctx.createLinearGradient(GATE_X - 30, 0, GATE_X + 10, 0)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, hp > 1 ? 'rgba(34,211,238,0.15)' : 'rgba(239,68,68,0.25)')
  ctx.fillStyle = grad
  ctx.fillRect(GATE_X - 30, 0, 40, CANVAS_H)

  // Gate opening
  const gateColor = hp === 3 ? '#22d3ee' : hp === 2 ? '#f59e0b' : '#ef4444'
  ctx.strokeStyle = gateColor
  ctx.lineWidth = 3
  ctx.shadowColor = gateColor
  ctx.shadowBlur  = 20
  ctx.strokeRect(GATE_X + 4, GATE_Y, GATE_W - 8, GATE_H)

  // Gate label
  ctx.shadowBlur = 0
  ctx.fillStyle = gateColor
  ctx.font = 'bold 18px "Share Tech Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('FIREWALL', GATE_X + GATE_W / 2, GATE_Y - 16)
  ctx.fillText('GATE', GATE_X + GATE_W / 2, GATE_Y - 0)

  // HP crack lines on wall
  if (hp < 3) {
    ctx.strokeStyle = 'rgba(239,68,68,0.4)'
    ctx.lineWidth = 2
    for (let i = 0; i < (3 - hp) * 3; i++) {
      const y1 = GATE_Y + Math.random() * GATE_H
      ctx.beginPath()
      ctx.moveTo(GATE_X + 8, y1)
      ctx.lineTo(GATE_X + 50 + Math.random() * 60, y1 + (Math.random() - 0.5) * 60)
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawParticles(ctx, particles, scale) {
  for (const [, p] of particles) {
    if (p.state !== 'moving') continue
    const cx = p.x + p.width / 2, cy = p.y + p.height / 2
    const color = THREAT_COLORS[p.spriteKey] || '#ffffff'

    ctx.save()

    // Inspected highlight ring
    if (p.inspectedBy) {
      ctx.strokeStyle = p.inspectedBy === 'p1' ? '#3b82f6' : '#f59e0b'
      ctx.lineWidth = 3
      ctx.shadowColor = ctx.strokeStyle
      ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(cx, cy, p.width * 0.65, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowBlur = 0
    }

    // Particle body
    ctx.fillStyle = color + '22'
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.shadowColor = color
    ctx.shadowBlur = 14
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.width, p.height, 6); ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0

    // Icon
    ctx.font = '26px serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(spriteIcon(p.spriteKey), cx, cy)

    ctx.restore()
  }
}

function spriteIcon(key) {
  return { clean:'📄', corrupted:'💀', adware:'📢', trojan:'🐴', ransomware:'🔒' }[key] || '📄'
}

export function drawPlayers(ctx, players) {
  for (const p of players) {
    ctx.save()
    const cx = p.x + p.width / 2, cy = p.y + p.height / 2

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath(); ctx.ellipse(cx, p.y + p.height - 4, p.width * 0.4, 6, 0, 0, Math.PI * 2); ctx.fill()

    // Body
    ctx.fillStyle = p.color + '33'
    ctx.strokeStyle = p.color
    ctx.lineWidth = 2
    ctx.shadowColor = p.color
    ctx.shadowBlur = 16
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.width, p.height, 8); ctx.fill(); ctx.stroke()
    ctx.shadowBlur = 0

    // Detective hat silhouette
    ctx.font = '28px serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🕵️', cx, cy - 4)

    // Name badge
    ctx.font = '11px "Share Tech Mono", monospace'
    ctx.fillStyle = p.color
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(p.id.toUpperCase(), cx, p.y + p.height + 4)

    ctx.restore()
  }
}

export function drawInteractPrompts(ctx, world) {
  for (const p of world.players) {
    if (!p.nearParticleId) continue
    const particle = world.particles.get(p.nearParticleId)
    if (!particle || particle.state !== 'moving') continue
    const cx = particle.x + particle.width / 2
    const ty = particle.y - 20

    ctx.save()
    const label = p.id === 'p1' ? '[E] Inspect' : '[Num0] Inspect'
    ctx.font = 'bold 14px "Share Tech Mono", monospace'
    ctx.textAlign = 'center'
    const tw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(cx - tw/2 - 6, ty - 18, tw + 12, 22)
    ctx.strokeStyle = p.color
    ctx.lineWidth = 1
    ctx.strokeRect(cx - tw/2 - 6, ty - 18, tw + 12, 22)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, cx, ty - 4)
    ctx.restore()
  }
}

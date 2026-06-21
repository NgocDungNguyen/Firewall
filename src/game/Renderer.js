import {
  CANVAS_W, CANVAS_H, HUD_H,
  GATE_X, GATE_Y, GATE_H, GATE_W,
  LANE_YS, INTERACT_RADIUS,
  THREAT_COLORS,
} from './constants.js'

export function clear(ctx) {
  ctx.fillStyle = '#060912'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}

export function drawBackground(ctx) {
  ctx.save()
  ctx.strokeStyle = 'rgba(34,211,238,0.04)'
  ctx.lineWidth = 1
  const gs = 80
  for (let x = 0; x < CANVAS_W; x += gs) { ctx.beginPath(); ctx.moveTo(x, HUD_H); ctx.lineTo(x, CANVAS_H); ctx.stroke() }
  for (let y = HUD_H; y < CANVAS_H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }

  ctx.strokeStyle = 'rgba(34,211,238,0.06)'
  ctx.setLineDash([8, 16])
  for (const ly of LANE_YS) {
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(GATE_X, ly); ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()
}

export function drawGate(ctx, hp) {
  ctx.save()
  ctx.fillStyle = '#0d1629'
  ctx.fillRect(GATE_X, 0, CANVAS_W - GATE_X, CANVAS_H)

  const grad = ctx.createLinearGradient(GATE_X - 30, 0, GATE_X + 10, 0)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(1, hp > 1 ? 'rgba(34,211,238,0.12)' : 'rgba(239,68,68,0.22)')
  ctx.fillStyle = grad
  ctx.fillRect(GATE_X - 30, 0, 40, CANVAS_H)

  const gateColor = hp === 3 ? '#22d3ee' : hp === 2 ? '#f59e0b' : '#ef4444'
  ctx.strokeStyle = gateColor
  ctx.lineWidth   = 3
  ctx.shadowColor = gateColor
  ctx.shadowBlur  = 18
  ctx.strokeRect(GATE_X + 4, GATE_Y, GATE_W - 8, GATE_H)
  ctx.shadowBlur  = 0
  ctx.fillStyle   = gateColor
  ctx.font        = 'bold 16px "Share Tech Mono",monospace'
  ctx.textAlign   = 'center'
  ctx.fillText('FIREWALL', GATE_X + GATE_W / 2, GATE_Y - 18)
  ctx.fillText('GATE',     GATE_X + GATE_W / 2, GATE_Y - 4)
  ctx.restore()
}

export function drawParticles(ctx, particles) {
  for (const [, p] of particles) {
    if (p.state !== 'moving') continue
    const cx    = p.x + p.width / 2
    const cy    = p.y + p.height / 2
    const color = THREAT_COLORS[p.spriteKey] || '#ffffff'

    ctx.save()
    if (p.inspectedBy) {
      ctx.strokeStyle = p.inspectedBy === 'p1' ? '#3b82f6' : '#f59e0b'
      ctx.lineWidth   = 3
      ctx.shadowColor = ctx.strokeStyle
      ctx.shadowBlur  = 14
      ctx.beginPath(); ctx.arc(cx, cy, p.width * 0.7, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowBlur  = 0
    }
    ctx.fillStyle   = color + '22'
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.shadowColor = color
    ctx.shadowBlur  = 12
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.width, p.height, 8); ctx.fill(); ctx.stroke()
    ctx.shadowBlur  = 0
    ctx.font        = '26px serif'
    ctx.textAlign   = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(spriteIcon(p.spriteKey), cx, cy)
    ctx.restore()
  }
}

function spriteIcon(key) {
  return { clean: '📄', corrupted: '💀', adware: '📢', trojan: '🐴', ransomware: '🔒' }[key] || '📄'
}

export function drawPlayers(ctx, players) {
  for (const p of players) {
    const cx = p.x + p.width / 2, cy = p.y + p.height / 2
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath(); ctx.ellipse(cx, p.y + p.height, p.width * 0.4, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle   = p.color + '33'
    ctx.strokeStyle = p.color
    ctx.lineWidth   = 2
    ctx.shadowColor = p.color
    ctx.shadowBlur  = 14
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.width, p.height, 8); ctx.fill(); ctx.stroke()
    ctx.shadowBlur  = 0
    ctx.font        = '28px serif'
    ctx.textAlign   = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🕵️', cx, cy - 4)
    ctx.font      = '11px "Share Tech Mono",monospace'
    ctx.fillStyle = p.color
    ctx.textBaseline = 'top'
    ctx.fillText(p.id.toUpperCase(), cx, p.y + p.height + 3)
    ctx.restore()
  }
}

export function drawInteractPrompts(ctx, world) {
  for (const p of world.players) {
    if (!p.nearParticleId) continue
    const particle = world.particles.get(p.nearParticleId)
    if (!particle || particle.state !== 'moving') continue
    const cx   = particle.x + particle.width / 2
    const ty   = particle.y - 18
    const label = p.id === 'p1' ? '[E] Inspect' : '[Num0] Inspect'
    ctx.save()
    ctx.font    = 'bold 13px "Share Tech Mono",monospace'
    ctx.textAlign = 'center'
    const tw    = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(cx - tw / 2 - 6, ty - 16, tw + 12, 20)
    ctx.strokeStyle = p.color; ctx.lineWidth = 1
    ctx.strokeRect(cx - tw / 2 - 6, ty - 16, tw + 12, 20)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, cx, ty - 3)
    ctx.restore()
  }
}

export function drawWaveCountdown(ctx, secsLeft, nextWave, totalWaves) {
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2
  ctx.save()

  // Semi-transparent backdrop
  ctx.fillStyle = 'rgba(6,9,18,0.65)'
  ctx.fillRect(cx - 340, cy - 70, 680, 140)
  ctx.strokeStyle = 'rgba(34,211,238,0.3)'
  ctx.lineWidth   = 1
  ctx.strokeRect(cx - 340, cy - 70, 680, 140)

  // Wave info
  ctx.fillStyle = '#22d3ee'
  ctx.font      = 'bold 20px "Share Tech Mono",monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`WAVE ${nextWave} OF ${totalWaves} INCOMING`, cx, cy - 30)

  // Countdown
  ctx.fillStyle   = '#ffffff'
  ctx.font        = 'bold 48px "Share Tech Mono",monospace'
  ctx.fillText(secsLeft, cx, cy + 24)

  ctx.fillStyle = '#6b7280'
  ctx.font      = '14px "Share Tech Mono",monospace'
  ctx.fillText('SECONDS UNTIL NEXT FILES  —  PRESS SPACE TO SKIP WAIT', cx, cy + 52)

  ctx.restore()
}

export function drawPauseOverlay(ctx) {
  ctx.save()
  ctx.fillStyle = 'rgba(6,9,18,0.72)'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.fillStyle   = '#22d3ee'
  ctx.font        = 'bold 56px "Share Tech Mono",monospace'
  ctx.textAlign   = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⏸  GAME PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 30)
  ctx.fillStyle = '#6b7280'
  ctx.font      = '22px "Share Tech Mono",monospace'
  ctx.fillText('Press TAB to close notebook and resume', CANVAS_W / 2, CANVAS_H / 2 + 40)
  ctx.restore()
}

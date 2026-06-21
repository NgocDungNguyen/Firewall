import {
  CANVAS_W, CANVAS_H, HUD_H,
  GATE_X, GATE_Y, GATE_H, GATE_W,
  LANE_YS,
} from './constants.js'

// ── Extension-based appearance (reveals file TYPE, NOT threat status) ────────

function displayExt(extStr) {
  // ".jpg.exe" → "jpg" (what the file CLAIMS to be)
  const parts = String(extStr || '').replace(/^\.+/, '').split('.').filter(Boolean)
  return (parts[0] || 'txt').toLowerCase()
}

const EXT_ICONS = {
  txt: '📄', docx: '📝', doc: '📝', pdf: '📋', xlsx: '📊', xls: '📊',
  csv: '📊', pptx: '📑', ppt: '📑', json: '📄', xml: '📄',
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', bmp: '🖼', svg: '🖼',
  mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵',
  mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
  zip: '🗜', rar: '🗜', '7z': '🗜', tar: '🗜',
  exe: '⚙️', dll: '🔧', bat: '📜', cmd: '📜',
  vbs: '📜', scr: '💾', sys: '🗄', bin: '💾',
}

const EXT_COLORS = {
  // Documents → blue
  txt: '#60a5fa', docx: '#60a5fa', doc: '#60a5fa', pdf: '#818cf8',
  xlsx: '#34d399', xls: '#34d399', csv: '#34d399',
  json: '#60a5fa', xml: '#60a5fa', pptx: '#fb923c', ppt: '#fb923c',
  // Images → indigo/violet
  jpg: '#a78bfa', jpeg: '#a78bfa', png: '#a78bfa', gif: '#a78bfa', bmp: '#a78bfa', svg: '#c084fc',
  // Audio/Video → pink
  mp3: '#f472b6', wav: '#f472b6', ogg: '#f472b6', flac: '#f472b6',
  mp4: '#fb7185', avi: '#fb7185', mkv: '#fb7185', mov: '#fb7185',
  // Archives → orange
  zip: '#fb923c', rar: '#fb923c', '7z': '#fb923c', tar: '#fb923c',
  // Executables/System → slate (neutral, not red — player must inspect!)
  exe: '#94a3b8', dll: '#94a3b8', bat: '#94a3b8', cmd: '#94a3b8',
  vbs: '#94a3b8', scr: '#94a3b8', sys: '#94a3b8', bin: '#94a3b8',
}

function fileIcon(ext)  { return EXT_ICONS[ext]  || '📄' }
function fileColor(ext) { return EXT_COLORS[ext] || '#60a5fa' }

// ── Renderers ────────────────────────────────────────────────────────────────

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
  for (const ly of LANE_YS) { ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(GATE_X, ly); ctx.stroke() }
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
    const ext   = displayExt(p.metadata?.extension || '.txt')
    const color = fileColor(ext)
    const icon  = fileIcon(ext)
    const cx    = p.x + p.width / 2
    const cy    = p.y + p.height / 2

    ctx.save()

    // Inspection highlight ring
    if (p.inspectedBy) {
      ctx.strokeStyle = p.inspectedBy === 'p1' ? '#3b82f6' : '#f59e0b'
      ctx.lineWidth   = 3
      ctx.shadowColor = ctx.strokeStyle
      ctx.shadowBlur  = 16
      ctx.beginPath(); ctx.arc(cx, cy, p.width * 0.7, 0, Math.PI * 2); ctx.stroke()
      ctx.shadowBlur  = 0
    }

    // Neutral card background — color by file category only, NOT by threat
    ctx.fillStyle   = color + '18'
    ctx.strokeStyle = color + 'aa'
    ctx.lineWidth   = 1.5
    ctx.shadowColor = color
    ctx.shadowBlur  = 8
    ctx.beginPath(); ctx.roundRect(p.x, p.y, p.width, p.height, 8); ctx.fill(); ctx.stroke()
    ctx.shadowBlur  = 0

    // File icon from extension
    ctx.font         = '26px serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(icon, cx, cy)

    ctx.restore()
  }
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
    ctx.font         = '28px serif'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🕵️', cx, cy - 4)
    ctx.font         = '11px "Share Tech Mono",monospace'
    ctx.fillStyle    = p.color
    ctx.textBaseline = 'top'
    ctx.fillText(p.id.toUpperCase(), cx, p.y + p.height + 3)
    ctx.restore()
  }
}

function _kLabel(code) {
  if (code.startsWith('Key'))    return code.slice(3)
  if (code.startsWith('Digit'))  return code.slice(5)
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6)
  const MAP = { ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→', Enter:'Enter', Backspace:'⌫', Space:'Space' }
  return MAP[code] || code
}

export function drawInteractPrompts(ctx, world) {
  for (const p of world.players) {
    if (!p.nearParticleId) continue
    const particle = world.particles.get(p.nearParticleId)
    if (!particle || particle.state !== 'moving') continue
    const cx      = particle.x + particle.width / 2
    const ty      = particle.y - 18
    const inspKey = world.keybindings?.[p.id]?.inspect ?? 'KeyE'
    const label   = `[${_kLabel(inspKey)}] Inspect`
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
  ctx.fillStyle = 'rgba(6,9,18,0.65)'
  ctx.fillRect(cx - 340, cy - 70, 680, 140)
  ctx.strokeStyle = 'rgba(34,211,238,0.3)'
  ctx.lineWidth   = 1
  ctx.strokeRect(cx - 340, cy - 70, 680, 140)
  ctx.fillStyle = '#22d3ee'
  ctx.font      = 'bold 20px "Share Tech Mono",monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`WAVE ${nextWave} OF ${totalWaves} INCOMING`, cx, cy - 30)
  ctx.fillStyle = '#ffffff'
  ctx.font      = 'bold 48px "Share Tech Mono",monospace'
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
  ctx.fillStyle    = '#22d3ee'
  ctx.font         = 'bold 56px "Share Tech Mono",monospace'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⏸  GAME PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 40)
  ctx.fillStyle = '#6b7280'
  ctx.font      = '22px "Share Tech Mono",monospace'
  ctx.fillText('TAB — Investigator Notes    T — Analyst Toolkit    TAB/T again to resume', CANVAS_W / 2, CANVAS_H / 2 + 30)
  ctx.restore()
}

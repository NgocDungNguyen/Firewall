import { PLAYER_NAMES } from '../game/constants.js'
import { soundEngine }  from '../audio/SoundEngine.js'

function _kLabel(code) {
  if (code.startsWith('Key'))    return code.slice(3)
  if (code.startsWith('Digit'))  return code.slice(5)
  if (code.startsWith('Numpad')) return 'NUM' + code.slice(6)
  const MAP = { ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→', Enter:'ENT', Space:'SPC' }
  return MAP[code] || code
}

export class InspectionModal {
  constructor(gameState) {
    this.gs        = gameState
    this._modals   = new Map()   // particleId → { el, onAction, isVirus }
    this._scale    = 1
    this._container = null
    this._canvas    = null
    this._resizeObs = null
  }

  _setup(canvas) {
    if (this._canvas === canvas) return
    this._canvas    = canvas
    this._container = document.getElementById('modal-container')
    this._updateScale()
    this._resizeObs?.disconnect()
    this._resizeObs = new ResizeObserver(() => this._updateScale())
    this._resizeObs.observe(canvas)
  }

  _updateScale() {
    if (!this._canvas) return
    this._scale = this._canvas.getBoundingClientRect().width / 1920
  }

  _canvasToCSS(x, y) { return { x: x * this._scale, y: y * this._scale } }

  open(particle, player, canvas, onAction) {
    this._setup(canvas)
    if (this._modals.has(particle.id)) return

    const m       = particle.metadata
    const pos     = this._canvasToCSS(particle.x, particle.y)
    const MODAL_W = 340

    const rawLeft = pos.x + particle.width * this._scale + 16
    const left    = rawLeft + MODAL_W > window.innerWidth ? pos.x - MODAL_W - 16 : rawLeft
    const top     = Math.max(56, Math.min(pos.y - 20, window.innerHeight - 400))

    const playerTag = player.id === 'p1'
      ? `🔵 ${PLAYER_NAMES.p1} — STATION 1`
      : `🟡 ${PLAYER_NAMES.p2} — STATION 2`

    const el = document.createElement('div')
    el.className = 'dossier'
    el.style.cssText = `left:${left}px;top:${top}px;`
    el.dataset.particleId = particle.id

    const qLeft     = this.gs.quarantineLeft
    const qDisabled = qLeft <= 0 ? 'dossier__btn--disabled' : ''
    const kb        = this.gs.keybindings?.[player.id] ?? {}
    const kPass     = _kLabel(kb.pass       ?? 'Digit1')
    const kQuar     = _kLabel(kb.quarantine ?? 'Digit2')
    const kElim     = _kLabel(kb.eliminate  ?? 'Digit3')

    el.innerHTML = `
      <div class="dossier__header">
        <div>
          <div class="dossier__header-title">🔍 EVIDENCE FILE</div>
          <div class="dossier__case-num">CASE #${m.caseId || 'XX-0000'}</div>
        </div>
        <div class="dossier__classified">CLASSIFIED</div>
      </div>
      <div class="dossier__player-tag">${playerTag}</div>
      <div class="dossier__evidence">
        ${this._row('FILE NAME',  m.fileName)}
        ${this._row('FILE SIZE',  m.fileSize)}
        ${this._row('ORIGIN IP',  m.originIP)}
        ${this._row('EXTENSION',  m.extension)}
        ${this._row('SIGNATURE',  this._truncHash(m.securityHash))}
      </div>
      <div class="dossier__actions">
        <button class="dossier__btn dossier__btn--pass" data-action="pass">
          <span class="dossier__btn-icon">✅</span>
          <span>CLEAR</span>
          <span class="dossier__hotkey">${kPass}</span>
        </button>
        <button class="dossier__btn dossier__btn--quarantine ${qDisabled}" data-action="quarantine">
          <span class="dossier__btn-icon">⚠️</span>
          <span>QUARANTINE${qLeft === 0 ? ' ✖' : ` (${qLeft})`}</span>
          <span class="dossier__hotkey">${kQuar}</span>
        </button>
        <button class="dossier__btn dossier__btn--eliminate" data-action="eliminate">
          <span class="dossier__btn-icon">❌</span>
          <span>ELIMINATE</span>
          <span class="dossier__hotkey">${kElim}</span>
        </button>
      </div>
      <div class="dossier__stamp" id="stamp-${particle.id}"></div>
    `

    const handleAction = (action) => {
      if (action === 'quarantine' && this.gs.quarantineLeft <= 0) return
      // Play action sound
      if (action === 'pass')       soundEngine.playPass()
      else if (action === 'quarantine') soundEngine.playQuarantine()
      else if (action === 'eliminate')  soundEngine.playEliminate()
      this._showStamp(el, action, particle.isVirus)
      setTimeout(() => this.close(particle.id, onAction, action), 800)
    }

    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action))
    })

    this._container.appendChild(el)
    this._modals.set(particle.id, { el, onAction, isVirus: particle.isVirus })

    this.gs.set({
      openModals: [...this.gs.openModals, {
        particleId: particle.id, playerId: player.id,
        metadata: m, position: { x: left, y: top },
      }],
    })
  }

  triggerAction(particleId, action) {
    const entry = this._modals.get(particleId)
    if (!entry) return
    if (action === 'quarantine' && this.gs.quarantineLeft <= 0) return
    if (action === 'pass')       soundEngine.playPass()
    else if (action === 'quarantine') soundEngine.playQuarantine()
    else if (action === 'eliminate')  soundEngine.playEliminate()
    this._showStamp(entry.el, action, entry.isVirus)
    setTimeout(() => this.close(particleId, entry.onAction, action), 800)
  }

  close(particleId, onAction, action) {
    const entry = this._modals.get(particleId)
    if (entry) { entry.el.remove(); this._modals.delete(particleId) }
    this.gs.set({ openModals: this.gs.openModals.filter(m => m.particleId !== particleId) })
    onAction?.(action)
  }

  forceClose(particleId) {
    const entry = this._modals.get(particleId)
    if (entry) { entry.el.remove(); this._modals.delete(particleId) }
    this.gs.set({ openModals: this.gs.openModals.filter(m => m.particleId !== particleId) })
  }

  closeAll() {
    this._modals.forEach(({ el }) => el.remove())
    this._modals.clear()
    this.gs.set({ openModals: [] })
  }

  _showStamp(el, action, isVirus) {
    const stamp = el.querySelector('.dossier__stamp')
    if (!stamp) return
    let text = '', cls = ''
    if (action === 'quarantine')    { text = 'QUARANTINED';       cls = 'quarantined' }
    else if (action === 'pass')     { text = 'CLEARED';           cls = 'cleared' }
    else if (action === 'eliminate') {
      text = isVirus ? 'THREAT NEUTRALIZED' : 'ERROR — CLEAN FILE'
      cls  = isVirus ? 'neutralized' : 'error'
    } else { text = action.toUpperCase(); cls = 'cleared' }
    stamp.innerHTML = `<span class="dossier__stamp-text dossier__stamp-text--${cls}">${text}</span>`
    el.querySelectorAll('.dossier__btn').forEach(b => { b.style.pointerEvents = 'none' })
  }

  _row(label, value) {
    return `<div class="dossier__row">
      <span class="dossier__row-label">${label}</span>
      <span class="dossier__row-value">${this._esc(value)}</span>
    </div>`
  }

  _truncHash(hash) {
    if (!hash) return '—'
    return hash.length === 64
      ? hash.slice(0, 8) + '…' + hash.slice(-8) + ` <small style="color:#666">(${hash.length} chars)</small>`
      : `<span class="dossier__row-value--anomaly">${hash.slice(0,8)}…${hash.slice(-8)} ⚠ ${hash.length} chars</span>`
  }

  _esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }
}

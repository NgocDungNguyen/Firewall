// Touch detection — true on phones/tablets
export const isMobile = () =>
  ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1200

export class MobileControls {
  constructor() {
    // Shared mutable object — PlayerController reads this directly
    this.move = { up: false, down: false, left: false, right: false }
    this._worldRef  = null
    this._engineRef = null
  }

  // Called by GameEngine.start() after world is built
  init(world, engine) {
    this._worldRef  = world
    this._engineRef = engine
    world.mobileMove = this.move    // share the same reference

    if (!isMobile()) return
    document.getElementById('mobile-controls')?.classList.remove('mobile-controls--hidden')
    this._bindDpad()
    this._bindActionButtons()
    this._blockCanvasScroll()
    this._watchModalState()
  }

  hide() {
    this.move.up = this.move.down = this.move.left = this.move.right = false
    document.getElementById('mobile-controls')?.classList.add('mobile-controls--hidden')
  }

  // ── D-pad ────────────────────────────────────────────────────────────────────
  _bindDpad() {
    for (const dir of ['up', 'down', 'left', 'right']) {
      const btn = document.getElementById(`mobile-dpad-${dir}`)
      if (!btn) continue

      const press = (e) => {
        e.preventDefault()
        this.move[dir] = true
        btn.classList.add('mobile-dpad__btn--active')
      }
      const release = () => {
        this.move[dir] = false
        btn.classList.remove('mobile-dpad__btn--active')
      }

      btn.addEventListener('touchstart',  press,   { passive: false })
      btn.addEventListener('touchend',    release, { passive: true })
      btn.addEventListener('touchcancel', release, { passive: true })
    }
  }

  // ── Action buttons ───────────────────────────────────────────────────────────
  _bindActionButtons() {
    this._bindBtn('mobile-btn-inspect', () => this._triggerP1Action('inspect'))
    this._bindBtn('mobile-btn-pass',    () => this._triggerP1ModalAction('pass'))
    this._bindBtn('mobile-btn-elim',    () => this._triggerP1ModalAction('eliminate'))
    this._bindBtn('mobile-btn-quar',    () => this._triggerP1ModalAction('quarantine'))
    this._bindBtn('mobile-btn-skip',    () => this._synth('Space', ' '))
    this._bindBtn('mobile-btn-notes',   () => this._synth('Tab', 'Tab'))
    this._bindBtn('mobile-btn-tools',   () => this._synth('KeyT', 't'))
  }

  _bindBtn(id, fn) {
    const el = document.getElementById(id)
    if (!el) return
    el.addEventListener('touchstart', (e) => { e.preventDefault(); fn() }, { passive: false })
  }

  // Fire synthetic keydown matching P1's bound key for an action
  _triggerP1Action(action) {
    const code = this._worldRef?.keybindings?.p1?.[action] ?? 'KeyE'
    this._synth(code, code.replace('Key', '').toLowerCase())
  }

  // Directly trigger a modal action for P1's open modal (pass/eliminate/quarantine)
  _triggerP1ModalAction(action) {
    const openModals = this._engineRef?.gs?.openModals ?? []
    const modal = openModals.find(m => m.playerId === 'p1')
    if (modal) this._engineRef?.modal?.triggerAction(modal.particleId, action)
  }

  _synth(code, key) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true }))
  }

  _blockCanvasScroll() {
    const canvas = document.getElementById('game-canvas')
    canvas?.addEventListener('touchmove', e => e.preventDefault(), { passive: false })
  }

  // Show/hide modal action buttons when a P1 dossier is open
  _watchModalState() {
    const gs = this._engineRef?.gs
    if (!gs) return
    const row = document.getElementById('mobile-modal-btns')
    if (!row) return
    gs.addEventListener('change', () => {
      const hasModal = (gs.openModals ?? []).some(m => m.playerId === 'p1')
      row.classList.toggle('mobile-modal-btns--visible', hasModal)
    })
  }
}

export const mobileControls = new MobileControls()

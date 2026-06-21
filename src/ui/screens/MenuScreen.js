const ACTION_LABELS = {
  up:         'MOVE UP',
  down:       'MOVE DOWN',
  left:       'MOVE LEFT',
  right:      'MOVE RIGHT',
  inspect:    'INSPECT',
  pass:       'PASS',
  quarantine: 'QUARANTINE',
  eliminate:  'ELIMINATE',
}

// Keys reserved by the game system — cannot be rebound
const RESERVED = new Set(['Tab', 'KeyT', 'KeyM', 'Space', 'Escape'])

function keyLabel(code) {
  if (code.startsWith('Key'))    return code.slice(3)
  if (code.startsWith('Digit'))  return code.slice(5)
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6)
  const MAP = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Enter: 'ENTER', Backspace: '⌫',
    ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT',
    ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL',
    AltLeft: 'L-ALT', AltRight: 'R-ALT',
  }
  return MAP[code] || code
}

export class MenuScreen {
  constructor(gameState, engine) {
    this.gs           = gameState
    this.engine       = engine
    this._playerCount = 1
    this._listening   = null   // { playerId, action } while capturing
    this._captureHandler = null
    this._init()
  }

  _init() {
    const btn1p  = document.getElementById('btn-1p')
    const btn2p  = document.getElementById('btn-2p')
    const p2ctrl = document.getElementById('p2-controls')
    const start  = document.getElementById('btn-start')
    const lb     = document.getElementById('btn-leaderboard')

    btn1p.addEventListener('click', () => {
      this._playerCount = 1
      btn1p.classList.add('menu-btn--active')
      btn2p.classList.remove('menu-btn--active')
      p2ctrl.classList.add('hidden')
      this._cancelCapture()
    })

    btn2p.addEventListener('click', () => {
      this._playerCount = 2
      btn2p.classList.add('menu-btn--active')
      btn1p.classList.remove('menu-btn--active')
      p2ctrl.classList.remove('hidden')
      this._cancelCapture()
    })

    start.addEventListener('click', () => {
      this._cancelCapture()
      this.gs.resetForNewGame()
      this.gs.set({ playerCount: this._playerCount, phase: 'briefing' })
    })

    lb.addEventListener('click', () => {
      this._cancelCapture()
      this.gs.set({ phase: 'leaderboard' })
    })

    this._renderBindings('p1')
    this._renderBindings('p2')
  }

  _renderBindings(playerId) {
    const container = document.getElementById(`${playerId}-bindings`)
    if (!container) return
    const kb = this.gs.keybindings[playerId]

    container.innerHTML = Object.entries(ACTION_LABELS).map(([action, label]) => {
      const listening = this._listening?.playerId === playerId && this._listening?.action === action
      return `<div class="keybind-row${listening ? ' keybind-row--listening' : ''}"
                   data-player="${playerId}" data-action="${action}" title="Click to rebind">
        <span class="keybind-action">${label}</span>
        <span class="keybind-key">${listening ? 'PRESS A KEY…' : keyLabel(kb[action])}</span>
      </div>`
    }).join('')

    container.querySelectorAll('.keybind-row').forEach(row => {
      row.addEventListener('click', () => {
        const p = row.dataset.player
        const a = row.dataset.action
        if (this._listening?.playerId === p && this._listening?.action === a) {
          this._cancelCapture()
        } else {
          this._startCapture(p, a)
        }
      })
    })
  }

  _startCapture(playerId, action) {
    this._cancelCapture()
    this._listening = { playerId, action }
    this._renderBindings('p1')
    this._renderBindings('p2')

    this._captureHandler = (e) => {
      e.preventDefault()
      e.stopImmediatePropagation()

      if (e.code === 'Escape') { this._cancelCapture(); return }

      if (RESERVED.has(e.code)) {
        this._flashError(playerId, action, `"${keyLabel(e.code)}" IS RESERVED`)
        return
      }

      // Block duplicate within same player
      const kb   = this.gs.keybindings[playerId]
      const dupe = Object.entries(kb).find(([k, v]) => v === e.code && k !== action)
      if (dupe) {
        this._flashError(playerId, action, `ALREADY USED FOR ${ACTION_LABELS[dupe[0]]}`)
        return
      }

      const newBindings = {
        ...this.gs.keybindings,
        [playerId]: { ...this.gs.keybindings[playerId], [action]: e.code },
      }
      this.gs.set({ keybindings: newBindings })
      this._listening = null
      window.removeEventListener('keydown', this._captureHandler, true)
      this._captureHandler = null
      this._renderBindings('p1')
      this._renderBindings('p2')
    }

    window.addEventListener('keydown', this._captureHandler, true)
  }

  _cancelCapture() {
    if (this._captureHandler) {
      window.removeEventListener('keydown', this._captureHandler, true)
      this._captureHandler = null
    }
    this._listening = null
    this._renderBindings('p1')
    this._renderBindings('p2')
  }

  _flashError(playerId, action, msg) {
    const row = document.querySelector(`[data-player="${playerId}"][data-action="${action}"]`)
    if (!row) return
    const keyEl = row.querySelector('.keybind-key')
    if (!keyEl) return
    keyEl.textContent = msg
    keyEl.classList.add('keybind-key--error')
    setTimeout(() => {
      keyEl.textContent = 'PRESS A KEY…'
      keyEl.classList.remove('keybind-key--error')
    }, 1600)
  }
}

import { SCORING, MAX_QUARANTINE } from '../game/constants.js'

export class HUD {
  constructor(gameState) {
    this.gs = gameState
  }

  init() {
    this.gs.addEventListener('change', (e) => {
      const d = e.detail
      if ('firewallHP'     in d) this._renderHP(d.firewallHP)
      if ('timeRemaining'  in d) this._renderTimer(d.timeRemaining)
      if ('waveDisplay'    in d) this._renderWave(d.waveDisplay)
      if ('quarantineUsed' in d) this._renderQuarantine(d.quarantineUsed)
      if ('scores'         in d) this._renderScores(d.scores)
      if ('playerCount'    in d) this._renderPlayerCount(d.playerCount)
      if ('phase'          in d && d.phase === 'playing') this._renderAll()
    })
  }

  _renderAll() {
    this._renderHP(this.gs.firewallHP)
    this._renderTimer(this.gs.timeRemaining)
    this._renderWave(this.gs.waveDisplay)
    this._renderQuarantine(this.gs.quarantineUsed)
    this._renderScores(this.gs.scores)
    this._renderPlayerCount(this.gs.playerCount)
  }

  _renderHP(hp) {
    const el = document.getElementById('hud-hp')
    if (!el) return
    el.innerHTML = ''
    for (let i = 0; i < SCORING.MAX_HP; i++) {
      const pip = document.createElement('div')
      pip.className = 'hp-pip ' + (i < hp ? (hp === 1 ? 'hp-pip--low' : 'hp-pip--full') : 'hp-pip--empty')
      el.appendChild(pip)
    }
  }

  _renderTimer(sec) {
    const el = document.getElementById('hud-timer')
    if (!el) return
    const m = Math.floor(sec / 60), s = sec % 60
    el.textContent = `${m}:${String(s).padStart(2, '0')}`
    el.className = 'hud-value hud-timer'
    if (sec <= 30)      el.classList.add('hud-timer--danger')
    else if (sec <= 60) el.classList.add('hud-timer--warning')
  }

  _renderWave({ current, total }) {
    const el = document.getElementById('hud-wave')
    if (el) el.textContent = `${current} / ${total}`
  }

  _renderQuarantine(used) {
    const el = document.getElementById('hud-quarantine')
    if (!el) return
    const left = MAX_QUARANTINE - used
    el.textContent = `${left} / ${MAX_QUARANTINE}`
    el.className   = 'hud-value' + (left === 0 ? ' hud-quarantine--exhausted' : '')
  }

  _renderScores({ p1, p2 }) {
    const ep1 = document.getElementById('hud-score-p1')
    const ep2 = document.getElementById('hud-score-p2')
    if (ep1) ep1.textContent = (p1 || 0).toLocaleString()
    if (ep2) ep2.textContent = (p2 || 0).toLocaleString()
  }

  _renderPlayerCount(count) {
    const p2block = document.getElementById('hud-score-p2-block')
    if (p2block) p2block.classList.toggle('hidden', count < 2)
  }
}

import { LEVELS } from '../../data/levels.js'
import { SCORING } from '../../game/constants.js'

export class BriefingScreen {
  constructor(gameState, engine) {
    this.gs     = gameState
    this.engine = engine
    this._timer = null
    this._init()
  }

  _init() {
    document.getElementById('btn-briefing-skip').addEventListener('click', () => this._launch())
    this.gs.addEventListener('change', (e) => {
      if (e.detail.phase === 'briefing') this._populate()
    })
  }

  _populate() {
    clearInterval(this._timer)
    const level = LEVELS.find(l => l.id === this.gs.level) || LEVELS[0]

    document.getElementById('briefing-round-label').textContent  = `ROUND ${this.gs.round}`
    document.getElementById('briefing-level-name').textContent   = `LEVEL ${level.id}: ${level.name}`

    const ul = document.getElementById('briefing-bullets')
    ul.innerHTML = ''
    for (const b of level.briefingBullets) {
      const li = document.createElement('li')
      if (b.threat) li.classList.add('threat')
      li.textContent = b.text
      ul.appendChild(li)
    }

    this._renderHP(this.gs.firewallHP)

    let count = 5
    const cd = document.getElementById('briefing-countdown')
    cd.textContent = count
    this._timer = setInterval(() => {
      count--
      cd.textContent = count
      if (count <= 0) { clearInterval(this._timer); this._launch() }
    }, 1000)
  }

  _renderHP(hp) {
    const el = document.getElementById('briefing-hp')
    el.innerHTML = ''
    for (let i = 0; i < SCORING.MAX_HP; i++) {
      const pip = document.createElement('div')
      pip.className = 'hp-pip ' + (i < hp ? (hp === 1 ? 'hp-pip--low' : 'hp-pip--full') : 'hp-pip--empty')
      el.appendChild(pip)
    }
  }

  _launch() {
    clearInterval(this._timer)
    this.gs.resetForNewRound()
    this.gs.set({ phase: 'playing' })
    this.engine.start(this.gs.level, this.gs.playerCount)
  }
}

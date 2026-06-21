import { LEVELS } from '../../data/levels.js'
import { SCORING } from '../../game/constants.js'

export class BriefingScreen {
  constructor(gameState, engine) {
    this.gs     = gameState
    this.engine = engine
    this._init()
  }

  _init() {
    document.getElementById('btn-briefing-skip').addEventListener('click', () => this._launch())
    this.gs.addEventListener('change', (e) => {
      if (e.detail.phase === 'briefing') this._populate()
    })
  }

  _populate() {
    const level = LEVELS.find(l => l.id === this.gs.level) || LEVELS[0]
    const round = this.gs.round

    document.getElementById('briefing-round-label').textContent = `ROUND ${round}  ·  LEVEL ${level.id}`
    document.getElementById('briefing-level-name').textContent  = level.name

    // Build threat cards
    const allThreats = this._buildThreatsForLevel(level)
    const cardsEl    = document.getElementById('briefing-threat-cards')
    cardsEl.innerHTML = allThreats.map(t => `
      <div class="threat-card" style="border-color:${t.color}40;background:${t.color}08">
        <div class="threat-card__header" style="color:${t.color}">
          <span style="font-size:1.5rem">${t.icon}</span>
          <div>
            <div class="threat-card__name">${t.name}</div>
            ${t.damage > 0
              ? `<div class="threat-card__damage">⚠ −${t.damage} HP if it passes</div>`
              : `<div class="threat-card__safe">✓ Always safe to PASS</div>`}
          </div>
        </div>
        <ul class="threat-card__clues">
          ${t.clues.map(c => `<li>${c}</li>`).join('')}
        </ul>
        ${t.example ? `<div class="threat-card__example">${t.example}</div>` : ''}
        ${t.damage > 0 ? `<div class="threat-card__action" style="color:${t.color}">→ ${t.action}</div>` : ''}
      </div>
    `).join('')

    // Wave info bar
    document.getElementById('briefing-wave-info').innerHTML = `
      <span>📦 ${level.wavesPerRound} waves of 3 files each</span>
      <span>⏳ New wave every <strong>${level.spawnIntervalFrames >= 1800 ? '30' : '15'} seconds</strong></span>
      <span>SPACE to skip wait</span>
    `

    // HP pips
    this._renderHP(this.gs.firewallHP)

    // Update skip button
    document.getElementById('btn-briefing-skip').textContent = '▶ DEPLOY TO CHECKPOINT'
  }

  _buildThreatsForLevel(level) {
    const all = []

    // Always show clean first
    all.push({
      type: 'clean', icon: '📄', color: '#22c55e', name: 'Clean File', damage: 0,
      clues: [
        'Normal small file size (KB range)',
        'Single extension: .txt, .jpg, .pdf, .docx',
        'IP from home/school network: 192.168.x.x or 10.x.x.x',
        'Signature is exactly 64 characters, all letters a-f and numbers 0-9',
      ],
      action: 'PASS',
      example: '',
    })

    // Show ALL threat types in this level's pool — search all levels for the definition
    const nonClean = level.threatTypes.filter(t => t !== 'clean')
    for (const type of nonClean) {
      for (const lvl of LEVELS) {
        const def = lvl.threats?.find(t => t.type === type)
        if (def) { all.push(def); break }
      }
    }

    return all
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
    this.gs.resetForNewRound()
    this.gs.set({ phase: 'playing' })
    this.engine.start(this.gs.level, this.gs.playerCount)
  }
}

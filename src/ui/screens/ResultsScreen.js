import { LEVELS } from '../../data/levels.js'
import { SCORING } from '../../game/constants.js'

export class ResultsScreen {
  constructor(gameState) {
    this.gs = gameState
    this._init()
  }

  _init() {
    document.getElementById('btn-next-round').addEventListener('click', () => {
      const nextLevel = Math.min(this.gs.level + 1, LEVELS.length)
      this.gs.set({ level: nextLevel, round: this.gs.round + 1, phase: 'briefing' })
    })
    document.getElementById('btn-results-menu').addEventListener('click', () => {
      this.gs.set({ phase: 'menu' })
    })
    this.gs.addEventListener('change', (e) => {
      if (e.detail.phase === 'results') this._populate()
    })
  }

  _populate() {
    const rs      = this.gs._lastRoundScore ?? 0
    const hpBonus = this.gs._lastHPBonus    ?? 0
    const elapsed = this.gs._lastElapsed    ?? 120_000
    const hp      = this.gs.firewallHP

    const header = document.getElementById('results-header')
    header.textContent = 'ROUND COMPLETE'
    header.className   = 'results-card__header'

    const grid  = document.getElementById('results-grid')
    const rows  = [
      { label: 'BASE ROUND BONUS',    val: `+${SCORING.BASE_ROUND}`,  cls: 'pos' },
      { label: 'TIME ELAPSED',        val: this._fmtTime(elapsed),     cls: '' },
      { label: 'TIME BONUS',          val: this._timeBonusLabel(elapsed), cls: 'pos' },
      { label: 'FLAWLESS DEFENSE',    val: this.gs.hpLostThisRound === 0 ? `+${SCORING.FLAWLESS}` : '+0', cls: 'pos' },
      { label: 'HP PENALTY',          val: this.gs.hpLostThisRound > 0 ? `${this.gs.hpLostThisRound * SCORING.HP_PENALTY}` : '—', cls: this.gs.hpLostThisRound > 0 ? 'neg' : '' },
      { label: 'HP BONUS AWARDED',    val: hpBonus > 0 ? `+${hpBonus} HP` : '—', cls: '' },
      { label: 'ROUND SCORE',         val: `+${rs}`,          cls: 'pos', total: true },
      { label: 'TOTAL SCORE',         val: this.gs.totalScore, cls: '',   total: true },
    ]

    grid.innerHTML = rows.map(r => `
      <div class="results-row ${r.total ? 'results-row--total' : ''}">
        <span>${r.label}</span>
        <span class="${r.cls === 'pos' ? 'results-row__val--pos' : r.cls === 'neg' ? 'results-row__val--neg' : ''}">${r.val}</span>
      </div>`).join('')

    const pips = document.getElementById('results-hp-pips')
    pips.innerHTML = ''
    for (let i = 0; i < SCORING.MAX_HP; i++) {
      const pip = document.createElement('div')
      pip.className = 'hp-pip ' + (i < hp ? (hp === 1 ? 'hp-pip--low' : 'hp-pip--full') : 'hp-pip--empty')
      pips.appendChild(pip)
    }
  }

  _fmtTime(ms) {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
  }

  _timeBonusLabel(ms) {
    if (ms < 30_000) return `+${SCORING.TIME_BONUS_30} (< 30s)`
    if (ms < 60_000) return `+${SCORING.TIME_BONUS_60} (< 60s)`
    return '+0'
  }
}

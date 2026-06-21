import { DEFAULT_KEYS, MAX_QUARANTINE, SCORING } from '../game/constants.js'

class GameState extends EventTarget {
  constructor() {
    super()
    this.phase          = 'menu'
    this.firewallHP     = SCORING.MAX_HP
    this.round          = 1
    this.level          = 1
    this.scores         = { p1: 0, p2: 0 }
    this.quarantineUsed = 0
    this.timeRemaining  = 120
    this.waveDisplay    = { current: 0, total: 0 }
    this.openModals     = []
    this.notebookOpen   = false
    this.playerCount    = 1
    this.keybindings    = structuredClone(DEFAULT_KEYS)
    this.hpLostThisRound= 0
    this.totalScore     = 0
  }

  get quarantineLeft() { return MAX_QUARANTINE - this.quarantineUsed }

  set(updates) {
    Object.assign(this, updates)
    this.dispatchEvent(new CustomEvent('change', { detail: updates }))
  }

  resetForNewGame() {
    this.set({
      firewallHP: SCORING.MAX_HP,
      round: 1, level: 1,
      scores: { p1: 0, p2: 0 },
      quarantineUsed: 0,
      timeRemaining: 120,
      waveDisplay: { current: 0, total: 0 },
      openModals: [],
      notebookOpen: false,
      hpLostThisRound: 0,
      totalScore: 0,
    })
  }

  resetForNewRound() {
    this.set({
      quarantineUsed: 0,
      timeRemaining: 120,
      waveDisplay: { current: 0, total: 0 },
      openModals: [],
      hpLostThisRound: 0,
    })
  }
}

export const gameState = new GameState()

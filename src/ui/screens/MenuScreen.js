export class MenuScreen {
  constructor(gameState, engine) {
    this.gs     = gameState
    this.engine = engine
    this._playerCount = 1
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
    })

    btn2p.addEventListener('click', () => {
      this._playerCount = 2
      btn2p.classList.add('menu-btn--active')
      btn1p.classList.remove('menu-btn--active')
      p2ctrl.classList.remove('hidden')
    })

    start.addEventListener('click', () => {
      this.gs.resetForNewGame()
      this.gs.set({ playerCount: this._playerCount, phase: 'briefing' })
    })

    lb.addEventListener('click', () => {
      this.gs.set({ phase: 'leaderboard' })
    })
  }
}

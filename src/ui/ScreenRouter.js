export class ScreenRouter {
  constructor(gameState) {
    this.gs = gameState
    this._screens = {}
  }

  init() {
    document.querySelectorAll('[id^="screen-"]').forEach(el => {
      const name = el.id.replace('screen-', '')
      this._screens[name] = el
    })
    this.gs.addEventListener('change', (e) => {
      if ('phase' in e.detail) this._show(e.detail.phase)
    })
    this._show(this.gs.phase)
  }

  _show(phase) {
    const map = {
      menu: 'menu', briefing: 'briefing', playing: 'game',
      results: 'results', gameover: 'gameover', leaderboard: 'leaderboard',
    }
    const target = map[phase] || 'menu'
    Object.entries(this._screens).forEach(([name, el]) => {
      el.classList.toggle('active', name === target)
    })
  }
}

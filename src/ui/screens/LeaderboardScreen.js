import { fetchLeaderboard, submitScore } from '../../firebase/leaderboard.js'

export class LeaderboardScreen {
  constructor(gameState) {
    this.gs = gameState
    this._init()
  }

  _init() {
    document.getElementById('btn-lb-menu').addEventListener('click', () => {
      this.gs.set({ phase: 'menu' })
    })

    document.getElementById('btn-submit-score')?.addEventListener('click', async () => {
      const btn  = document.getElementById('btn-submit-score')
      const name = document.getElementById('gameover-name').value.trim().toUpperCase() || 'UNKNOWN'
      btn.textContent = 'SUBMITTING…'
      btn.disabled    = true
      const ok = await submitScore(name, this.gs.totalScore, this.gs.level)
      if (ok) {
        this.gs.set({ phase: 'leaderboard' })
      } else {
        btn.textContent = '⚠ SUBMIT FAILED — RETRY'
        btn.disabled    = false
      }
    })

    document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
      this.gs.set({ phase: 'menu' })
    })

    // Populate gameover screen values
    this.gs.addEventListener('change', (e) => {
      if (e.detail.phase === 'gameover') {
        document.getElementById('gameover-score').textContent = this.gs.totalScore.toLocaleString()
        document.getElementById('gameover-level').textContent = `LEVEL ${this.gs.level}`
      }
      if (e.detail.phase === 'leaderboard') this._load()
    })
  }

  async _load() {
    const tbody = document.getElementById('leaderboard-body')
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 font-mono py-4">Loading...</td></tr>'
    try {
      const entries = await fetchLeaderboard(10)
      if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 font-mono py-4">No entries yet.</td></tr>'
        return
      }
      tbody.innerHTML = entries.map((e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${e.playerName}</td>
          <td>${e.score.toLocaleString()}</td>
          <td>${e.levelReached}</td>
        </tr>`).join('')
    } catch {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-red-500 font-mono py-4">Failed to load.</td></tr>'
    }
  }
}

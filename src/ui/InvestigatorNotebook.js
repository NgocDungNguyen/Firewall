import { LEVELS } from '../data/levels.js'

const THREAT_TIPS = {
  corrupted:   { icon: '💀', color: '#94a3b8', tips: ['Double extension: name.pdf.exe','File size is 0 bytes or 999+ GB','Extension doesn\'t match content type'] },
  adware:      { icon: '📢', color: '#f59e0b', tips: ['Origin IP starts with 185., 203., or 91.','Uses .dll or .scr extension','Suspicious bundle names (toolbars, optimizers)'] },
  trojan:      { icon: '🐴', color: '#8b5cf6', tips: ['Signature hash is exactly 63 chars (not 64)','Mimics system file names (svchost, lsass)','Uses .exe, .bin, or .sys extension'] },
  ransomware:  { icon: '🔒', color: '#ef4444', tips: ['Hash contains non-hex chars (G, H, X, Z) near end','Double extension: INVOICE.pdf.exe','File size 15–25 MB for "documents"','Origin IP from untrusted ranges'] },
  clean:       { icon: '📄', color: '#22c55e', tips: ['Trusted IP (10.x, 192.168.x)','64-char valid hex signature','Single clean extension (.txt, .json, .log)','Reasonable file size (KB range)'] },
}

export class InvestigatorNotebook {
  constructor(gameState) {
    this.gs = gameState
  }

  init() {
    this.gs.addEventListener('change', (e) => {
      if ('notebookOpen' in e.detail) this._toggle(e.detail.notebookOpen)
      if ('level' in e.detail || e.detail.phase === 'playing') this._render()
    })
  }

  _toggle(open) {
    const panel = document.getElementById('notebook-panel')
    if (!panel) return
    panel.classList.toggle('notebook-panel--hidden', !open)
  }

  _render() {
    const el = document.getElementById('notebook-content')
    if (!el) return
    const level = LEVELS.find(l => l.id === this.gs.level) || LEVELS[0]
    const knownThreats = new Set(['clean', ...level.threatTypes])

    el.innerHTML = [...knownThreats].map(threat => {
      const info = THREAT_TIPS[threat]
      if (!info) return ''
      const dmgLevel = LEVELS.find(l => l.threatTypes.includes(threat))
      const damage   = dmgLevel?.damage ?? 1
      return `
        <div class="notebook-entry">
          <div class="notebook-entry__threat">
            ${info.icon} ${threat.toUpperCase()}
            <span class="notebook-entry__damage">-${damage} HP</span>
          </div>
          <ul>
            ${info.tips.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>`
    }).join('<hr style="border-color:#d4a843;margin:0.75rem 0">')
  }
}

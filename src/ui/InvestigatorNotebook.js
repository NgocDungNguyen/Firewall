import { LEVELS } from '../data/levels.js'

const THREAT_INFO = {
  clean: {
    icon: '📄', color: '#22c55e', label: 'Clean File', damage: 0,
    tips: [
      'Origin IP starts with 192.168.x or 10.x.x.x (home/school)',
      'Single extension only — .txt, .jpg, .docx, .pdf',
      'File size is small and reasonable (KB range)',
      'Signature: exactly 64 chars, only digits 0-9 and letters a-f',
      'Action → PASS',
    ],
  },
  corrupted: {
    icon: '⚠️', color: '#94a3b8', label: 'Corrupted File', damage: 1,
    tips: [
      'Double extension: e.g. photo.jpg.exe or doc.pdf.bat',
      'File size is wrong: 0 bytes OR absurdly large (e.g. 999 GB)',
      'The rest may look normal — extension is the only real clue',
      'Action → ELIMINATE',
    ],
  },
  adware: {
    icon: '📡', color: '#f59e0b', label: 'Adware / Spyware', damage: 1,
    tips: [
      'Origin IP starts with 185., 203., or 91. (foreign/suspicious)',
      'File name sounds like free software, tools, or speed boosters',
      'Uses .dll, .scr, or .exe extension',
      'Action → QUARANTINE or ELIMINATE',
    ],
  },
  trojan: {
    icon: '🎭', color: '#8b5cf6', label: 'Trojan Horse', damage: 2,
    tips: [
      'Signature hash has ONLY 63 characters — valid is always 64',
      'Disguised as Windows Update, Chrome, or Adobe patches',
      'Uses .exe, .sys, or .bin extension',
      'Action → ELIMINATE',
    ],
  },
  ransomware: {
    icon: '🔐', color: '#ef4444', label: 'Ransomware', damage: 3,
    tips: [
      'Signature contains non-hex letters: G H X Z Q W (hex = 0-9, a-f only)',
      'Double extension: e.g. INVOICE.pdf.exe',
      'File size 15–25 MB for something claiming to be a document',
      'File name is often in ALL CAPS',
      'Action → ELIMINATE IMMEDIATELY',
    ],
  },
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
    const level       = LEVELS.find(l => l.id === this.gs.level) || LEVELS[0]
    const knownThreats = ['clean', ...level.threatTypes]

    el.innerHTML = knownThreats.map(key => {
      const info = THREAT_INFO[key]
      if (!info) return ''
      const dmgBadge = info.damage > 0
        ? `<span class="notebook-entry__damage">−${info.damage} HP if it passes</span>`
        : `<span class="notebook-entry__safe">✓ SAFE TO PASS</span>`

      return `<div class="notebook-entry" style="--entry-color:${info.color}">
        <div class="notebook-entry__head">
          <span class="notebook-entry__icon">${info.icon}</span>
          <span class="notebook-entry__label">${info.label}</span>
          ${dmgBadge}
        </div>
        <ul>
          ${info.tips.map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>`
    }).join('')
  }
}

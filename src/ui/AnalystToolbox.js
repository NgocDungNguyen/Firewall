import { lookupIP }    from '../data/ipDatabase.js'
import { activityLog } from '../data/activityLog.js'
import { LEVELS }       from '../data/levels.js'
import { soundEngine }  from '../audio/SoundEngine.js'

const EXT_INFO = {
  txt:  { type: 'Document',    safe: true,  desc: 'Plain text file — safe to open' },
  docx: { type: 'Document',    safe: true,  desc: 'Microsoft Word document' },
  doc:  { type: 'Document',    safe: true,  desc: 'Microsoft Word document (older)' },
  pdf:  { type: 'Document',    safe: true,  desc: 'Portable Document Format — usually safe' },
  xlsx: { type: 'Spreadsheet', safe: true,  desc: 'Microsoft Excel spreadsheet' },
  xls:  { type: 'Spreadsheet', safe: true,  desc: 'Microsoft Excel (older)' },
  csv:  { type: 'Spreadsheet', safe: true,  desc: 'Comma-Separated Values — plain text data' },
  jpg:  { type: 'Image',       safe: true,  desc: 'JPEG photo/image' },
  jpeg: { type: 'Image',       safe: true,  desc: 'JPEG photo/image' },
  png:  { type: 'Image',       safe: true,  desc: 'PNG image (supports transparency)' },
  gif:  { type: 'Image',       safe: true,  desc: 'Animated or static GIF image' },
  mp3:  { type: 'Audio',       safe: true,  desc: 'MP3 audio file' },
  wav:  { type: 'Audio',       safe: true,  desc: 'Uncompressed audio file' },
  mp4:  { type: 'Video',       safe: true,  desc: 'MP4 video file' },
  zip:  { type: 'Archive',     safe: true,  desc: 'Compressed archive — check contents' },
  rar:  { type: 'Archive',     safe: true,  desc: 'RAR archive — check contents' },
  json: { type: 'Data',        safe: true,  desc: 'JSON data file — plain text' },
  exe:  { type: 'Executable',  safe: false, desc: '⚠ Windows executable — CAN RUN CODE on your system' },
  dll:  { type: 'Library',     safe: false, desc: '⚠ Dynamic Link Library — loaded and executed by programs' },
  bat:  { type: 'Script',      safe: false, desc: '⚠ Batch script — RUNS COMMANDS automatically' },
  cmd:  { type: 'Script',      safe: false, desc: '⚠ Command script — RUNS COMMANDS automatically' },
  vbs:  { type: 'Script',      safe: false, desc: '⚠ Visual Basic Script — CAN MODIFY your system' },
  scr:  { type: 'Executable',  safe: false, desc: '⚠ Windows screensaver — disguised executable' },
  sys:  { type: 'System',      safe: false, desc: '⚠ Kernel-mode system driver — deepest system access' },
  bin:  { type: 'Binary',      safe: false, desc: '⚠ Raw binary — likely executable code' },
}

export class AnalystToolbox {
  constructor(gameState) {
    this.gs = gameState
    this._activeTab = 'ip'
    this._scanTimer = null
  }

  init() {
    // Tab buttons
    document.querySelectorAll('.toolbox__tab').forEach(tab => {
      tab.addEventListener('click', () => {
        soundEngine.playClick()
        this._switchTab(tab.dataset.tool)
      })
    })

    // IP Lookup
    document.getElementById('btn-ip-lookup').addEventListener('click', () => this._runIPLookup())
    document.getElementById('ip-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._runIPLookup()
      e.stopPropagation()
    })
    document.getElementById('ip-input').addEventListener('keyup', e => e.stopPropagation())

    // Hash validator
    document.getElementById('btn-hash-check').addEventListener('click', () => this._runHashCheck())
    document.getElementById('hash-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._runHashCheck()
      e.stopPropagation()
    })
    document.getElementById('hash-input').addEventListener('keyup', e => e.stopPropagation())

    // Extension decoder
    document.getElementById('btn-ext-check').addEventListener('click', () => this._runExtDecode())
    document.getElementById('ext-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._runExtDecode()
      e.stopPropagation()
    })
    document.getElementById('ext-input').addEventListener('keyup', e => e.stopPropagation())

    // Stop keypresses inside toolbox from leaking to game
    document.getElementById('toolbox-overlay').addEventListener('keydown', e => e.stopPropagation())

    // Listen for toolbox toggle
    this.gs.addEventListener('change', e => {
      if ('toolboxOpen' in e.detail) this._onToggle(e.detail.toolboxOpen)
    })
  }

  _onToggle(open) {
    const el = document.getElementById('toolbox-overlay')
    el.classList.toggle('toolbox-overlay--hidden', !open)
    if (open) {
      this._prefillFromDossier()
      if (this._activeTab === 'log')   this._renderLog()
      if (this._activeTab === 'guide') this._renderGuide()
      // Always refresh log tab badge
      this._renderLog()
    }
  }

  _prefillFromDossier() {
    const meta = this.gs.openModals[0]?.metadata
    if (!meta) return
    if (meta.originIP && document.getElementById('ip-input').value === '')
      document.getElementById('ip-input').value = meta.originIP
    if (meta.securityHash && document.getElementById('hash-input').value === '')
      document.getElementById('hash-input').value = meta.securityHash
    if (meta.extension && document.getElementById('ext-input').value === '')
      document.getElementById('ext-input').value = meta.extension
  }

  _switchTab(tool) {
    this._activeTab = tool
    document.querySelectorAll('.toolbox__tab').forEach(t =>
      t.classList.toggle('toolbox__tab--active', t.dataset.tool === tool))
    document.querySelectorAll('.tool-panel').forEach(p =>
      p.classList.toggle('tool-panel--active', p.id === `tool-${tool}`))
    if (tool === 'log')   this._renderLog()
    if (tool === 'guide') this._renderGuide()
  }

  // ── IP LOOKUP ──────────────────────────────────────────────────────────────

  _runIPLookup() {
    const ip  = document.getElementById('ip-input').value.trim()
    const out = document.getElementById('ip-result')
    if (!ip) { out.innerHTML = '<div class="tool-msg">Enter an IP address above.</div>'; return }
    soundEngine.playIPLookup()
    out.innerHTML = '<div class="tool-scanning"><span class="scanning-spinner">◌</span> QUERYING INTELLIGENCE DATABASE…</div>'
    clearTimeout(this._scanTimer)
    this._scanTimer = setTimeout(() => {
      const data = lookupIP(ip)
      out.innerHTML = this._buildIPCard(ip, data)
    }, 750)
  }

  _buildIPCard(ip, d) {
    const colors = { TRUSTED: '#22c55e', CAUTION: '#f59e0b', BLOCKED: '#ef4444' }
    const c = colors[d.trust] || '#6b7280'
    const bar = d.trust === 'TRUSTED' ? '████░░░░░░░░' : d.trust === 'CAUTION' ? '████████░░░░' : '████████████'
    return `<div class="ip-card" style="--tc:${c}">
      <div class="ip-card__head">
        <span class="ip-card__flag">${d.flag}</span>
        <div>
          <div class="ip-card__country">${d.country}</div>
          <div class="ip-card__org">${d.org}</div>
        </div>
      </div>
      <div class="ip-card__rows">
        <div class="ip-card__row"><span>IP ADDRESS</span><span>${ip}</span></div>
        <div class="ip-card__row"><span>NETWORK TYPE</span><span>${d.netType}</span></div>
      </div>
      <div class="ip-card__trust" style="color:${c}">TRUST: <span class="trust-bar">${bar}</span> ${d.trust}</div>
      <div class="ip-card__note">${d.note}</div>
    </div>`
  }

  // ── HASH VALIDATOR ─────────────────────────────────────────────────────────

  _runHashCheck() {
    const hash = document.getElementById('hash-input').value.trim()
    const out  = document.getElementById('hash-result')
    if (!hash) { out.innerHTML = '<div class="tool-msg">Paste a security hash above.</div>'; return }
    soundEngine.playClick()

    const len   = hash.length
    const bad   = [...hash].filter(c => !/[0-9a-f]/.test(c))
    const badSet = [...new Set(bad)]
    const tailAnomaly = len >= 8 && [...hash.slice(-8)].some(c => /[g-zG-Z]/.test(c))
    const isThreat = len !== 64 || bad.length > 0

    const rows = []
    if (len === 64) rows.push({ ok: true,  msg: `Length: 64 characters ✓` })
    else            rows.push({ ok: false, msg: `Length: ${len} chars ✗  (valid = 64, ${len < 64 ? `missing ${64-len}` : `extra ${len-64}`})` })

    if (bad.length === 0) rows.push({ ok: true,  msg: `Characters: all valid hex (0-9, a-f) ✓` })
    else                  rows.push({ ok: false, msg: `Invalid characters: ${badSet.join(', ')} — SHA-256 only uses 0-9 and a-f` })

    if (tailAnomaly) rows.push({ ok: false, msg: `⚠ RANSOMWARE INDICATOR: Non-hex chars in last 8 characters — signature has been poisoned` })

    out.innerHTML = `<div class="evidence-card ${isThreat ? 'evidence-card--threat' : 'evidence-card--clean'}">
      <div class="evidence-card__title">${isThreat ? '⚠ ANOMALIES DETECTED — SUSPICIOUS FILE' : '✓ HASH VALIDATES — SIGNATURE APPEARS LEGITIMATE'}</div>
      ${rows.map(r => `<div class="evidence-card__row ${r.ok ? '' : 'evidence-card__row--bad'}">${r.msg}</div>`).join('')}
    </div>`
  }

  // ── EXTENSION DECODER ──────────────────────────────────────────────────────

  _runExtDecode() {
    const raw   = document.getElementById('ext-input').value.trim()
    const out   = document.getElementById('ext-result')
    if (!raw) { out.innerHTML = '<div class="tool-msg">Enter an extension (e.g. .jpg.exe or .docx)</div>'; return }
    soundEngine.playClick()

    const parts   = raw.replace(/^\.+/, '').split('.').filter(Boolean).map(e => e.toLowerCase())
    const isDouble = parts.length > 1

    if (isDouble) {
      const claimed = parts[0], real = parts[parts.length - 1]
      const claimedInfo = EXT_INFO[claimed] || { type: 'Unknown', desc: 'Unknown file type', safe: true }
      const realInfo    = EXT_INFO[real]    || { type: 'Unknown', desc: 'Unknown', safe: false }
      out.innerHTML = `<div class="evidence-card evidence-card--threat">
        <div class="evidence-card__title">⚠ DOUBLE EXTENSION — HIGH RISK INDICATOR</div>
        <div class="evidence-card__row">Full extension string: <strong>${raw}</strong></div>
        <div class="evidence-card__row">Claimed type (.${claimed}): ${claimedInfo.desc}</div>
        <div class="evidence-card__row evidence-card__row--bad">Actual type (.${real}): ${realInfo.desc}</div>
        <div class="evidence-card__row">Windows executes based on <strong>LAST extension (.${real})</strong> — the claimed .${claimed} is a disguise!</div>
        <div class="evidence-card__row evidence-card__row--bad">VERDICT: DISGUISED ${realInfo.type.toUpperCase()} — ELIMINATE OR QUARANTINE</div>
      </div>`
    } else {
      const ext  = parts[0]
      const info = EXT_INFO[ext]
      if (!info) {
        out.innerHTML = `<div class="evidence-card evidence-card--neutral">
          <div class="evidence-card__title">❓ UNKNOWN EXTENSION — .${ext}</div>
          <div class="evidence-card__row">Not in our database. Verify with other evidence fields.</div>
        </div>`
        return
      }
      out.innerHTML = `<div class="evidence-card ${info.safe ? 'evidence-card--clean' : 'evidence-card--threat'}">
        <div class="evidence-card__title">${info.safe ? `✓ SAFE TYPE — ${info.type.toUpperCase()}` : `⚠ EXECUTABLE TYPE — ${info.type.toUpperCase()}`}</div>
        <div class="evidence-card__row">Extension: <strong>.${ext}</strong></div>
        <div class="evidence-card__row">Category: ${info.type}</div>
        <div class="evidence-card__row">${info.desc}</div>
        ${!info.safe ? `<div class="evidence-card__row evidence-card__row--bad">Executables can run code on your machine — inspect IP and signature carefully!</div>` : ''}
      </div>`
    }
  }

  // ── CASE LOG ───────────────────────────────────────────────────────────────

  _renderLog() {
    const el = document.getElementById('log-entries')
    if (!el) return
    if (activityLog.entries.length === 0) {
      el.innerHTML = '<div class="log-empty">No files have been processed yet this round.<br>Inspect and decide on incoming files to build the log.</div>'
      return
    }
    el.innerHTML = [...activityLog.entries].reverse().map(e => {
      const ac = { pass: '#60a5fa', quarantine: '#f59e0b', eliminate: '#f87171' }[e.action] || '#9ca3af'
      const cc = e.correct ? '#22c55e' : '#ef4444'
      const ci = e.correct ? '✓' : '✗'
      return `<div class="log-entry ${e.correct ? '' : 'log-entry--error'}">
        <div class="log-entry__name">${e.fileName}</div>
        <div class="log-entry__meta">
          <span style="color:${ac}">${e.action.toUpperCase()}</span>
          <span style="color:${cc}">${ci} ${e.correct ? 'CORRECT' : 'WRONG'}</span>
          <span class="log-ip">${e.ip}</span>
          <span class="log-pts" style="color:${e.pointsEarned > 0 ? '#22c55e' : e.pointsEarned < 0 ? '#ef4444' : '#6b7280'}">${e.pointsEarned > 0 ? '+' : ''}${e.pointsEarned}</span>
        </div>
      </div>`
    }).join('')
  }

  // ── THREAT GUIDE ───────────────────────────────────────────────────────────

  _renderGuide() {
    const el = document.getElementById('guide-content')
    if (!el) return
    const level  = LEVELS.find(l => l.id === this.gs.level) || LEVELS[0]
    const known  = new Set(['clean', ...level.threatTypes])

    const TIPS = {
      clean:      { icon: '📄', color: '#22c55e', rows: ['IP starts with 192.168.x or 10.x.x.x', 'Single extension (.txt, .jpg, .docx, .pdf)', 'File size is small (KB range, not MB or GB)', 'Signature: exactly 64 characters, only 0-9 and a-f', '→ ACTION: PASS'] },
      corrupted:  { icon: '📁', color: '#94a3b8', rows: ['Has TWO extensions: e.g. photo.jpg.exe', 'File size is 0 bytes OR absurdly large (999 GB)', 'Everything else may look normal!', '→ ACTION: ELIMINATE'] },
      adware:     { icon: '⚙️', color: '#f59e0b', rows: ['Origin IP starts with 185. / 203. / 91.', 'File name sounds like free software or a tool', 'Extension is .dll, .scr, or .exe', '→ ACTION: QUARANTINE (or Eliminate)'] },
      trojan:     { icon: '⚙️', color: '#8b5cf6', rows: ['Signature hash has ONLY 63 characters (not 64!)', 'Disguised as system updates or software patches', 'Extension .exe / .sys / .bin with trusted-looking name', '→ ACTION: ELIMINATE'] },
      ransomware: { icon: '📄', color: '#ef4444', rows: ['Signature contains non-hex chars: G H X Z Q W', 'TWO extensions: document.pdf.exe', 'File size 15–25 MB for what claims to be a document', 'Often ALL CAPS file name', '→ ACTION: ELIMINATE IMMEDIATELY'] },
    }

    el.innerHTML = [...known].map(t => {
      const info = TIPS[t]
      if (!info) return ''
      return `<div class="guide-entry" style="border-color:${info.color}40">
        <div class="guide-entry__head" style="color:${info.color}">${info.icon} ${t.toUpperCase()}</div>
        ${info.rows.map(r => `<div class="guide-entry__row">${r}</div>`).join('')}
      </div>`
    }).join('')
  }
}

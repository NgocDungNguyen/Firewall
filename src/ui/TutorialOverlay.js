import * as Renderer from '../game/Renderer.js'
import { isMobile } from '../game/MobileControls.js'

const LS_KEY = 'fwd-tutorial-v1'

// Camera presets (world-space pos + lookAt)
const CAM = {
  overview: { pos: [0, 36, 68],    look: [0, 2, 0] },
  spawn:    { pos: [-28, 16, 42],  look: [-42, 1, 0] },
  gate:     { pos: [26, 13, 36],   look: [38, 5, 0] },
  center:   { pos: [0, 22, 52],    look: [0, 1, 0] },
  high:     { pos: [0, 60, 70],    look: [0, 0, 0] },
}

const STEPS = [
  {
    cam: null, spot: null, pos: 'center',
    title: '🔍 Welcome, Detective.',
    body: `You are the last line of defense against digital threats.<br><br>
Files will flow through this network checkpoint. Your job: <strong>inspect every file</strong> and judge whether it's safe or a threat before it reaches the Firewall Gate.<br><br>
Let us walk you through the field.`,
  },
  {
    cam: 'high', spot: 'canvas', pos: 'bottom',
    title: '🖥️ The Game Field',
    body: `This is the network checkpoint. Files appear on the <strong>left</strong> and travel to the <strong>right</strong> across multiple lanes.<br><br>
You control a detective who moves freely across the field. Intercept files and inspect them before they reach the gate.`,
  },
  {
    cam: 'spawn', spot: 'left', pos: 'right',
    title: '📂 File Spawn Zone',
    body: `Every wave, a batch of files appears here and starts moving right.<br><br>
Each file has a <strong>name</strong>, <strong>extension</strong>, <strong>origin IP</strong>, <strong>file size</strong>, and <strong>security signature</strong>. Look for anomalies in any of these fields.`,
  },
  {
    cam: 'gate', spot: 'right', pos: 'left',
    title: '⚡ Firewall Gate',
    body: `This is what you protect.<br><br>
If a <strong>virus file</strong> reaches the gate undetected, it <em>breaches the firewall</em> and you lose HP.<br><br>
Clean files may pass freely — but threats must be stopped here.`,
  },
  {
    cam: 'center', spot: 'canvas-center', pos: 'bottom',
    title: `🕵️ Your Detective`,
    body: `Move with <kbd>W A S D</kbd> or <kbd>↑ ↓ ← →</kbd>.
<span class="tut-mobile-only"><br>On mobile: use the <strong>D-pad</strong> in the bottom-left corner.</span><br><br>
Walk close to a file to interact with it. The game is real-time — don't let files slip past!`,
  },
  {
    cam: 'overview', spot: 'inspect-btn', pos: 'top',
    title: '🔍 Inspecting a File',
    body: `When you're <strong>near a file</strong>, press <kbd>E</kbd> to open the Evidence Dossier.
<span class="tut-mobile-only"><br>On mobile, tap the large <strong>🔍 INSPECT</strong> button.</span><br><br>
Study the dossier carefully — the clue that reveals a threat is hidden in one of the fields.`,
  },
  {
    cam: 'overview', spot: 'hud', pos: 'bottom',
    title: '📊 Mission HUD',
    body: `<strong>HP</strong> — Firewall health. Zero means game over.<br>
<strong>WAVE</strong> — Current wave out of the total.<br>
<strong>TIME</strong> — Time remaining in this round.<br>
<strong>QUARANTINE</strong> — Limited-use "hold" option.<br>
<strong>SCORE</strong> — Your investigation accuracy score.`,
  },
  {
    cam: null, spot: 'toolbox', pos: 'center', action: 'open-toolbox',
    title: '🔧 Analyst Toolkit  [T]',
    body: `Press <kbd>T</kbd> to open the Analyst Toolkit (pauses game).<br><br>
• <strong>IP Lookup</strong> — Check if an origin IP is from a trusted or suspicious range<br>
• <strong>Evidence Analyzer</strong> — Validate security hashes and decode extensions<br>
• <strong>Case Log</strong> — Full history of every file you've judged this round<br>
• <strong>Threat Guide</strong> — Reference card for every threat type`,
  },
  {
    cam: null, spot: 'notebook', pos: 'center', action: 'open-notebook',
    title: `📓 Investigator's Notes  [Tab]`,
    body: `Press <kbd>Tab</kbd> to open your notes (pauses game).<br><br>
Quick-reference guide to identifying each threat type — check it whenever you're unsure about a suspicious pattern. Threats grow more complex in higher levels.`,
  },
  {
    cam: 'overview', spot: null, pos: 'center',
    title: '⚖️ Your Three Decisions',
    body: `Every file in the dossier gets one verdict:<br><br>
<div class="tut-decisions">
  <div>✅ <strong>CLEAR</strong> — File looks clean, let it pass freely</div>
  <div>⚠️ <strong>QUARANTINE</strong> — Not sure? Hold it safely (limited uses per round)</div>
  <div>❌ <strong>ELIMINATE</strong> — Confirmed threat — destroy it</div>
</div><br>
Wrong calls cost you score or HP. Read every clue.`,
  },
  {
    cam: 'overview', spot: null, pos: 'center', last: true,
    title: '🚨 Checkpoint is Open.',
    body: `The first wave arrives shortly.<br><br>
Trust your instincts. Read every field. Protect the network.<br><br>
<em>Good luck, Detective.</em>`,
  },
]

class TutorialOverlay {
  constructor() {
    this._engine  = null
    this._step    = 0
    this._active  = false
    this._rafId   = null
    this._overlay = null
  }

  // Call after engine.start() — skips silently if already seen
  show(engine) {
    if (localStorage.getItem(LS_KEY) === '1') return
    this._engine = engine
    this._step   = 0
    this._active = true
    engine.pause()
    this._buildDOM()
    this._startRenderLoop()
    this._goTo(0)
  }

  // ── Render loop (keeps 3D scene alive while game is paused) ──────────────────
  _startRenderLoop() {
    const tick = () => {
      if (!this._active) return
      Renderer.renderFrame()
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  // ── DOM ──────────────────────────────────────────────────────────────────────
  _buildDOM() {
    const div = document.createElement('div')
    div.id = 'tut-overlay'
    div.className = 'tut-overlay'
    div.innerHTML = `
      <div id="tut-spot" class="tut-spot" style="opacity:0;pointer-events:none"></div>
      <div id="tut-card" class="tut-card">
        <div id="tut-label" class="tut-label"></div>
        <div id="tut-title" class="tut-title"></div>
        <div id="tut-body"  class="tut-body"></div>
        <div class="tut-btns">
          <button id="tut-skip" class="tut-btn tut-btn--skip">SKIP TUTORIAL</button>
          <button id="tut-next" class="tut-btn tut-btn--next">NEXT →</button>
        </div>
      </div>
    `
    document.getElementById('screen-game').appendChild(div)
    this._overlay = div

    document.getElementById('tut-skip').addEventListener('click', () => this._finish())
    document.getElementById('tut-next').addEventListener('click', () => this._advance())
  }

  // ── Step navigation ───────────────────────────────────────────────────────────
  _goTo(n) {
    const s = STEPS[n]
    if (!s) { this._finish(); return }

    // Camera
    if (s.cam && CAM[s.cam]) {
      const c = CAM[s.cam]
      Renderer.animateCamera(c.pos, c.look, n === 0 ? 0 : 1400)
    }

    // Spotlight
    this._setSpotlight(s.spot)

    // Step-specific UI side-effects
    if (s.action === 'open-toolbox')  this._showPanel('toolbox-overlay',  false)
    if (s.action === 'open-notebook') this._showPanel('notebook-panel',   false)

    // Card content
    document.getElementById('tut-label').textContent = `TUTORIAL  ·  ${n + 1} / ${STEPS.length}`
    document.getElementById('tut-title').innerHTML   = s.title
    document.getElementById('tut-body').innerHTML    = s.body
    document.getElementById('tut-next').textContent  = s.last ? '▶ START MISSION' : 'NEXT →'

    const card = document.getElementById('tut-card')
    card.className = `tut-card tut-card--${s.pos}`
  }

  _advance() {
    // Close any panels the current step opened
    const cur = STEPS[this._step]
    if (cur?.action === 'open-toolbox')  this._showPanel('toolbox-overlay',  true)
    if (cur?.action === 'open-notebook') this._showPanel('notebook-panel',   true)
    this._step++
    if (this._step >= STEPS.length) { this._finish(); return }
    this._goTo(this._step)
  }

  _finish() {
    this._active = false
    cancelAnimationFrame(this._rafId)

    // Ensure panels are closed
    this._showPanel('toolbox-overlay', true)
    this._showPanel('notebook-panel',  true)

    // Remove overlay
    this._overlay?.remove()
    this._overlay = null

    // Reset camera to default
    Renderer.resetCamera(800)

    // Save and resume
    localStorage.setItem(LS_KEY, '1')
    this._engine?.resume()
  }

  // ── Spotlight ─────────────────────────────────────────────────────────────────
  _setSpotlight(id) {
    const el = document.getElementById('tut-spot')
    if (!id) { el.style.opacity = '0'; return }

    const r = this._spotRect(id)
    if (!r) { el.style.opacity = '0'; return }

    const pad = 10
    el.style.cssText = `
      top:${r.top - pad}px; left:${r.left - pad}px;
      width:${r.width + pad * 2}px; height:${r.height + pad * 2}px;
      opacity:1; pointer-events:none;
    `
  }

  _spotRect(id) {
    if (id === 'hud')          return document.getElementById('hud')?.getBoundingClientRect()
    if (id === 'toolbox')      return document.querySelector('.toolbox')?.getBoundingClientRect()
    if (id === 'notebook')     return document.getElementById('notebook-panel')?.getBoundingClientRect()
    if (id === 'inspect-btn') {
      const btn = document.getElementById('mobile-btn-inspect')
      if (btn && !btn.closest('.mobile-controls--hidden')) return btn.getBoundingClientRect()
      // Desktop fallback — bottom-centre of screen
      const W = window.innerWidth, H = window.innerHeight
      return { top: H * 0.75, left: W * 0.35, width: W * 0.3, height: H * 0.08 }
    }

    const c = document.getElementById('game-canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()

    if (id === 'canvas')        return r
    if (id === 'left')          return { top: r.top + r.height*0.08, left: r.left + r.width*0.01, width: r.width*0.35, height: r.height*0.84 }
    if (id === 'right')         return { top: r.top + r.height*0.08, left: r.left + r.width*0.66, width: r.width*0.33, height: r.height*0.84 }
    if (id === 'canvas-center') return { top: r.top + r.height*0.15, left: r.left + r.width*0.28, width: r.width*0.44, height: r.height*0.6 }
    return null
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  _showPanel(id, hide) {
    const el = document.getElementById(id)
    if (!el) return
    // toolbox uses toolbox-overlay--hidden; notebook uses notebook-panel--hidden
    const cls = id === 'toolbox-overlay' ? 'toolbox-overlay--hidden' : 'notebook-panel--hidden'
    el.classList.toggle(cls, hide)
  }
}

export const tutorialOverlay = new TutorialOverlay()

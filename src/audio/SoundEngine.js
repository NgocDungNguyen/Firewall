// Procedural audio engine — all sounds generated via Web Audio API, no external files.

class SoundEngine {
  constructor() {
    this.ctx    = null
    this.master = null
    this.enabled = true
    this._ambNodes = []
  }

  _ctx() {
    if (!this.ctx) {
      this.ctx    = new (window.AudioContext || window.webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.45
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  _tone(type, freq, vol, dur, freqEnd, delay = 0) {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime + delay
    const o   = ctx.createOscillator()
    const g   = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (freqEnd != null) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.master)
    o.start(t); o.stop(t + dur + 0.01)
  }

  _noise(dur, vol, filterFreq, filterQ, delay = 0) {
    if (!this.enabled) return
    const ctx     = this._ctx()
    const t       = ctx.currentTime + delay
    const bufSize = Math.ceil(ctx.sampleRate * dur)
    const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data    = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const src  = ctx.createBufferSource()
    src.buffer = buf
    const flt  = ctx.createBiquadFilter()
    flt.type            = 'bandpass'
    flt.frequency.value = filterFreq || 800
    flt.Q.value         = filterQ   || 1.5
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(flt); flt.connect(g); g.connect(this.master)
    src.start(t); src.stop(t + dur)
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  playClick() {
    this._tone('sine', 750, 0.12, 0.07, 500)
  }

  playNotebookToggle() {
    this._noise(0.14, 0.1, 500, 2)
    this._tone('sine', 320, 0.08, 0.12, 240, 0.05)
  }

  playToolboxToggle() {
    // Terminal-style electronic open/close
    this._tone('square', 620, 0.07, 0.05, 820)
    this._tone('square', 820, 0.07, 0.08, 620, 0.06)
    this._noise(0.07, 0.05, 3200, 0.8)
  }

  // ── File lifecycle ────────────────────────────────────────────────────────

  playFileSpawn() {
    this._tone('sine', 180, 0.09, 0.18, 520)
    this._noise(0.1, 0.025, 2200, 1.5)
  }

  playInspectOpen() {
    this._noise(0.12, 0.09, 380, 3)
    this._tone('sine', 480, 0.09, 0.09, null, 0.08)
  }

  // ── Dossier actions ───────────────────────────────────────────────────────

  playPass() {
    // Rubber stamp thud
    this._tone('sine', 160, 0.22, 0.13, 90)
    this._noise(0.09, 0.06, 280, 4)
  }

  playQuarantine() {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime
    ;[360, 460, 575].forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'square'
      o.frequency.value = freq
      const s = t + i * 0.11
      g.gain.setValueAtTime(0, s)
      g.gain.linearRampToValueAtTime(0.1, s + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.13)
      o.connect(g); g.connect(this.master)
      o.start(s); o.stop(s + 0.15)
    })
  }

  playEliminate() {
    this._tone('sawtooth', 360, 0.18, 0.09, 110)
    this._noise(0.16, 0.13, 1800, 0.7)
    this._tone('sawtooth', 200, 0.1, 0.1, 60, 0.07)
  }

  // ── Decision feedback ─────────────────────────────────────────────────────

  playCorrect() {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime
    ;[[660, 0], [880, 0.1], [1100, 0.2]].forEach(([freq, d]) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.12, t + d)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.28)
      o.connect(g); g.connect(this.master)
      o.start(t + d); o.stop(t + d + 0.3)
    })
  }

  playWrong() {
    if (!this.enabled) return
    this._tone('sawtooth', 220, 0.18, 0.09)
    this._tone('sawtooth', 185, 0.16, 0.09, null, 0.1)
    this._tone('sawtooth', 150, 0.14, 0.13, null, 0.2)
  }

  // ── Threat events ─────────────────────────────────────────────────────────

  playBreach() {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sawtooth'
      const s = t + i * 0.22
      o.frequency.setValueAtTime(240, s)
      o.frequency.exponentialRampToValueAtTime(80, s + 0.2)
      g.gain.setValueAtTime(0.22, s)
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2)
      o.connect(g); g.connect(this.master)
      o.start(s); o.stop(s + 0.22)
    }
    this._noise(0.35, 0.09, 180, 1)
  }

  playHPLoss() {
    this._tone('sine', 100, 0.28, 0.7, 38)
    this._tone('sawtooth', 440, 0.13, 0.1, null, 0.12)
    this._tone('sawtooth', 440, 0.11, 0.1, null, 0.26)
  }

  // ── Wave / round ──────────────────────────────────────────────────────────

  playCountdownTick() {
    this._tone('sine', 440, 0.08, 0.09)
  }

  playCountdownLastTick() {
    this._tone('sine', 660, 0.12, 0.12)
  }

  playWaveArrival() {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime
    const o   = ctx.createOscillator()
    const g   = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(190, t)
    o.frequency.linearRampToValueAtTime(340, t + 0.18)
    o.frequency.linearRampToValueAtTime(210, t + 0.5)
    g.gain.setValueAtTime(0.14, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    o.connect(g); g.connect(this.master)
    o.start(t); o.stop(t + 0.56)
  }

  playRoundComplete() {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime
    ;[523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      const s = t + i * 0.13
      g.gain.setValueAtTime(0.14, s)
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.45)
      o.connect(g); g.connect(this.master)
      o.start(s); o.stop(s + 0.46)
    })
    this._tone('sine', 784, 0.06, 0.8, null, 0.45)
  }

  playGameOver() {
    if (!this.enabled) return
    const ctx = this._ctx()
    const t   = ctx.currentTime
    const o   = ctx.createOscillator()
    const g   = ctx.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(420, t)
    o.frequency.exponentialRampToValueAtTime(70, t + 2.2)
    g.gain.setValueAtTime(0.2, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
    o.connect(g); g.connect(this.master)
    o.start(t); o.stop(t + 2.5)
    this._tone('sine', 55, 0.32, 0.6)
    this._noise(0.4, 0.06, 120, 1.5, 0.1)
  }

  // ── Toolbox tools ─────────────────────────────────────────────────────────

  playIPLookup() {
    // Data scanning — rapid ascending beeps
    if (!this.enabled) return
    for (let i = 0; i < 7; i++) {
      this._tone('sine', 300 + i * 60, 0.04, 0.07, null, i * 0.08)
    }
    this._noise(0.55, 0.02, 1400, 1.5, 0.1)
  }

  // ── Ambient drone ─────────────────────────────────────────────────────────

  startAmbient() {
    if (!this.enabled) return
    this._stopAmb()
    const ctx  = this._ctx()
    const freqs = [55, 82.5, 110]
    const vols  = [0.032, 0.022, 0.013]
    freqs.forEach((freq, i) => {
      const o    = ctx.createOscillator()
      const g    = ctx.createGain()
      const lfo  = ctx.createOscillator()
      const lfog = ctx.createGain()
      o.type            = 'sine'
      o.frequency.value = freq
      lfo.type          = 'sine'
      lfo.frequency.value = 0.07 + i * 0.035
      lfog.gain.value   = freq * 0.012
      lfo.connect(lfog); lfog.connect(o.frequency)
      g.gain.value = vols[i]
      o.connect(g); g.connect(this.master)
      o.start(); lfo.start()
      this._ambNodes.push(o, g, lfo, lfog)
    })
  }

  _stopAmb() {
    this._ambNodes.forEach(n => { try { n.stop?.(); n.disconnect?.() } catch (_) {} })
    this._ambNodes = []
  }

  stopAmbient() { this._stopAmb() }

  // ── Mute ──────────────────────────────────────────────────────────────────

  setEnabled(on) {
    this.enabled = on
    if (!on) this._stopAmb()
    if (this.master) this.master.gain.value = on ? 0.45 : 0
  }

  toggle() {
    this.setEnabled(!this.enabled)
    return this.enabled
  }
}

export const soundEngine = new SoundEngine()

import { CANVAS_W, CANVAS_H, DEFAULT_KEYS, SCORING, PLAYER_COLORS, PLAYER_NAMES } from './constants.js'
import { LEVELS } from '../data/levels.js'
import { updatePlayers, createPlayer } from './PlayerController.js'
import { updateParticles } from './ParticleSystem.js'
import { updateCollisions } from './CollisionDetector.js'
import { tickWaves, skipWaveCountdown, getWaitSecondsLeft } from './WaveScheduler.js'
import { resolveAction, calcRoundScore, calcHPBonus } from './ScoreEngine.js'
import { soundEngine } from '../audio/SoundEngine.js'
import { activityLog } from '../data/activityLog.js'
import * as Renderer from './Renderer.js'

export class GameEngine {
  constructor(gameState, modalManager) {
    this.gs     = gameState
    this.modal  = modalManager
    this.canvas = null
    this.ctx    = null
    this.world  = null
    this.rafId  = null
    this.timerInterval = null
    this._actionPoints  = 0
    this._paused        = false
    this._lastTickSec   = -1
    this._keyDown = this._keyDown.bind(this)
    this._keyUp   = this._keyUp.bind(this)
  }

  _buildWorld(levelId, playerCount) {
    const level   = LEVELS.find(l => l.id === levelId) || LEVELS[0]
    const players = [createPlayer('p1', 260, 500, PLAYER_COLORS.p1, PLAYER_NAMES.p1)]
    if (playerCount === 2) players.push(createPlayer('p2', 260, 680, PLAYER_COLORS.p2, PLAYER_NAMES.p2))
    return {
      particles: new Map(), players,
      keys: new Set(), keybindings: structuredClone(this.gs.keybindings),
      frameCount: 0, lastTimestamp: 0,
      waveIndex: 0, nextWaveFrame: 120,
      pendingSpawns: [], roundTimeElapsed: 0,
      levelDef: level, rafId: null,
    }
  }

  start(levelId, playerCount) {
    const canvas  = document.getElementById('game-canvas')
    canvas.width  = CANVAS_W
    canvas.height = CANVAS_H
    this.canvas   = canvas
    this.ctx      = canvas.getContext('2d')
    this.world    = this._buildWorld(levelId, playerCount)
    this._actionPoints = 0
    this._paused       = false
    this._lastTickSec  = -1
    activityLog.reset()

    window.addEventListener('keydown', this._keyDown)
    window.addEventListener('keyup',   this._keyUp)

    soundEngine.startAmbient()
    this._startTimer()
    this.rafId = requestAnimationFrame(ts => this._loop(ts))
  }

  stop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
    clearInterval(this.timerInterval)
    window.removeEventListener('keydown', this._keyDown)
    window.removeEventListener('keyup',   this._keyUp)
    if (this.ctx) this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    this.gs.set({ openModals: [], notebookOpen: false, toolboxOpen: false })
    this.modal.closeAll()
    this._paused = false
    soundEngine.stopAmbient()
  }

  pause() {
    if (this._paused) return
    this._paused = true
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
    clearInterval(this.timerInterval)
    if (this.ctx && this.world) Renderer.drawPauseOverlay(this.ctx)
  }

  resume() {
    if (!this._paused) return
    if (this._anyOverlayOpen()) return   // don't resume while another panel is open
    this._paused = false
    if (this.world) this.world.lastTimestamp = 0
    this._startTimer()
    this.rafId = requestAnimationFrame(ts => this._loop(ts))
  }

  _anyOverlayOpen() {
    return this.gs.notebookOpen || this.gs.toolboxOpen
  }

  _loop(timestamp) {
    const w = this.world
    if (!w || this._paused || this.gs.toolboxOpen || this.gs.notebookOpen) return

    const dt = w.lastTimestamp ? timestamp - w.lastTimestamp : 16.667
    w.lastTimestamp = timestamp
    w.roundTimeElapsed += dt
    w.frameCount++

    const cb = this._callbacks()
    updatePlayers(w, dt)
    tickWaves(w, w.levelDef, cb)
    updateParticles(w, dt, cb)
    updateCollisions(w)

    if (w.roundTimeElapsed >= 120_000) { this._endRound(); return }

    const allSpawned   = w.waveIndex >= w.levelDef.wavesPerRound && w.pendingSpawns.length === 0
    const allDone      = allSpawned && [...w.particles.values()].every(p => p.state !== 'moving')
    if (allDone) { this._endRound(); return }

    const secsLeft     = w.waveIndex < w.levelDef.wavesPerRound ? getWaitSecondsLeft(w) : 0
    const movingCount  = [...w.particles.values()].filter(p => p.state === 'moving').length
    const showCountdown = secsLeft > 0 && movingCount === 0 && w.pendingSpawns.length === 0

    // Countdown tick sound (each new second ≤ 10)
    if (showCountdown && secsLeft !== this._lastTickSec) {
      this._lastTickSec = secsLeft
      if (secsLeft <= 5 && secsLeft > 0)      soundEngine.playCountdownLastTick()
      else if (secsLeft <= 10 && secsLeft > 0) soundEngine.playCountdownTick()
    }

    Renderer.clear(this.ctx)
    Renderer.drawBackground(this.ctx)
    Renderer.drawGate(this.ctx, this.gs.firewallHP)
    Renderer.drawParticles(this.ctx, w.particles)
    Renderer.drawPlayers(this.ctx, w.players)
    Renderer.drawInteractPrompts(this.ctx, w)
    if (showCountdown) Renderer.drawWaveCountdown(this.ctx, secsLeft, w.waveIndex + 1, w.levelDef.wavesPerRound)

    this.rafId = requestAnimationFrame(ts => this._loop(ts))
  }

  _callbacks() {
    return {
      onBreach: (p) => {
        if (!p.isVirus) return
        const dmg   = Math.min(this.world.levelDef.damage, this.gs.firewallHP)
        const newHP = this.gs.firewallHP - dmg
        this.gs.set({ firewallHP: newHP, hpLostThisRound: this.gs.hpLostThisRound + dmg })
        this.modal.forceClose(p.id)
        soundEngine.playBreach()
        setTimeout(() => soundEngine.playHPLoss(), 200)
        if (newHP <= 0) this._gameOver()
      },
      onDamage: (dmg) => {
        const newHP = Math.max(0, this.gs.firewallHP - dmg)
        this.gs.set({ firewallHP: newHP, hpLostThisRound: this.gs.hpLostThisRound + dmg })
        soundEngine.playHPLoss()
        if (newHP <= 0) this._gameOver()
      },
      onScore: (playerId, points) => {
        this._actionPoints += points
        const scores = { ...this.gs.scores }
        scores[playerId] = Math.max(0, (scores[playerId] || 0) + points)
        this.gs.set({ scores })
      },
      onWaveAdvance: (current, total) => {
        this.gs.set({ waveDisplay: { current, total } })
        this._lastTickSec = -1   // reset tick tracker for new wave
        soundEngine.playWaveArrival()
        // Stagger 3 spawn sounds to match 5-frame particle stagger
        for (let i = 0; i < 3; i++) setTimeout(() => soundEngine.playFileSpawn(), 60 + i * 85)
      },
    }
  }

  _startTimer() {
    clearInterval(this.timerInterval)
    this.timerInterval = setInterval(() => {
      if (!this.world || this._paused) return
      const remaining = Math.max(0, Math.ceil((120_000 - this.world.roundTimeElapsed) / 1000))
      this.gs.set({ timeRemaining: remaining })
    }, 250)
  }

  _endRound() {
    if (this.gs.firewallHP <= 0) { this._gameOver(); return }
    const elapsed    = this.world?.roundTimeElapsed ?? 120_000
    const hpBonus    = calcHPBonus(elapsed)
    const roundScore = calcRoundScore(this._actionPoints, elapsed, this.gs.hpLostThisRound)
    const newHP      = Math.min(SCORING.MAX_HP, this.gs.firewallHP + hpBonus)
    const totalScore = this.gs.totalScore + roundScore
    this.stop()
    soundEngine.playRoundComplete()
    this.gs.set({ totalScore, firewallHP: newHP, phase: 'results', _lastRoundScore: roundScore, _lastHPBonus: hpBonus, _lastElapsed: elapsed })
  }

  _gameOver() {
    const elapsed    = this.world?.roundTimeElapsed ?? 120_000
    const roundScore = calcRoundScore(this._actionPoints, elapsed, this.gs.hpLostThisRound)
    const totalScore = this.gs.totalScore + Math.max(0, roundScore)
    this.stop()
    soundEngine.playGameOver()
    this.gs.set({ totalScore, firewallHP: 0, phase: 'gameover' })
  }

  _keyDown(e) {
    if (!this.world || this.gs.phase !== 'playing') return
    // Block if typing in a toolbox/notebook input
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return

    const w = this.world
    w.keys.add(e.code)

    // ── Tab — notebook toggle ────────────────────────────────────────────────
    if (e.code === 'Tab') {
      e.preventDefault()
      const open = !this.gs.notebookOpen
      if (open && this.gs.toolboxOpen) this.gs.set({ toolboxOpen: false })
      this.gs.set({ notebookOpen: open })
      if (open) this.pause()
      else if (!this._anyOverlayOpen()) this.resume()
      soundEngine.playNotebookToggle()
      return
    }

    // ── T — toolbox toggle ───────────────────────────────────────────────────
    if (e.code === 'KeyT') {
      e.preventDefault()
      const open = !this.gs.toolboxOpen
      if (open && this.gs.notebookOpen) this.gs.set({ notebookOpen: false })
      this.gs.set({ toolboxOpen: open })
      if (open) this.pause()
      else if (!this._anyOverlayOpen()) this.resume()
      soundEngine.playToolboxToggle()
      return
    }

    // ── Escape — close any open overlay ─────────────────────────────────────
    if (e.code === 'Escape') {
      if (this.gs.toolboxOpen) {
        this.gs.set({ toolboxOpen: false })
        if (!this._anyOverlayOpen()) this.resume()
        soundEngine.playToolboxToggle()
        return
      }
      if (this.gs.notebookOpen) {
        this.gs.set({ notebookOpen: false })
        if (!this._anyOverlayOpen()) this.resume()
        soundEngine.playNotebookToggle()
        return
      }
    }

    // ── M — mute toggle ──────────────────────────────────────────────────────
    if (e.code === 'KeyM') {
      const on = soundEngine.toggle()
      const btn = document.getElementById('btn-mute')
      if (btn) btn.textContent = on ? '🔊' : '🔇'
      return
    }

    if (this._paused) return   // ignore game keys while any overlay open

    // ── Space — skip inter-wave countdown ────────────────────────────────────
    if (e.code === 'Space') {
      e.preventDefault()
      skipWaveCountdown(w)
      soundEngine.playClick()
      return
    }

    // ── Player action keys ───────────────────────────────────────────────────
    for (const player of w.players) {
      const kb = w.keybindings[player.id]

      if (e.code === kb.inspect && player.nearParticleId) {
        const particle = w.particles.get(player.nearParticleId)
        if (particle && particle.state === 'moving' && particle.inspectedBy === null) {
          particle.inspectedBy = player.id
          soundEngine.playInspectOpen()
          this.modal.open(particle, player, this.canvas, (action) => {
            if (!this.world) return
            particle.inspectedBy = null
            if (action === 'quarantine') this.gs.set({ quarantineUsed: this.gs.quarantineUsed + 1 })
            const result = resolveAction(particle, action, player.id, w.levelDef.damage, this._callbacks())
            // Record to activity log
            activityLog.record({
              fileName:     particle.metadata.fileName,
              extension:    particle.metadata.extension,
              ip:           particle.metadata.originIP,
              action, isVirus: particle.isVirus,
              correct:      result.correct,
              pointsEarned: result.points,
              waveNum:      w.waveIndex,
            })
            // Delayed result sound (after stamp animation)
            if (action !== 'quarantine') {
              setTimeout(() => {
                if (result.correct) soundEngine.playCorrect()
                else soundEngine.playWrong()
              }, 180)
            }
          })
        }
        return
      }

      const openModal = this.gs.openModals.find(m => m.playerId === player.id)
      if (openModal) {
        if (e.code === kb.pass)      { this.modal.triggerAction(openModal.particleId, 'pass');      return }
        if (e.code === kb.eliminate) { this.modal.triggerAction(openModal.particleId, 'eliminate'); return }
        if (e.code === kb.quarantine && this.gs.quarantineLeft > 0) {
          this.modal.triggerAction(openModal.particleId, 'quarantine'); return
        }
      }
    }
  }

  _keyUp(e) { this.world?.keys.delete(e.code) }
}

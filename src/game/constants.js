export const CANVAS_W = 1920
export const CANVAS_H = 1080
export const HUD_H    = 56

export const GATE_X     = 1720
export const GATE_Y     = 180
export const GATE_H     = 720
export const GATE_W     = 80

export const LANE_COUNT = 5
export const LANE_YS    = [270, 390, 510, 630, 750]

export const PARTICLE_W = 56
export const PARTICLE_H = 56
export const INTERACT_RADIUS = 120

export const PLAYER_W = 48
export const PLAYER_H = 72
export const PLAYER_SPEED = 7

export const ROUND_DURATION_MS = 120_000
export const WAVE_SPAWN_DELAY_FRAMES = 20

export const MAX_QUARANTINE = 5

export const SCORING = {
  BASE_ROUND:      1000,
  CORRECT_ACTION:   500,
  WRONG_ELIMINATE: -300,
  TIME_BONUS_60:    500,
  TIME_BONUS_30:   1500,
  FLAWLESS:        1000,
  HP_PENALTY:      -300,
  HP_BONUS_60:       1,
  HP_BONUS_30:       2,
  MAX_HP:            3,
}

export const DEFAULT_KEYS = {
  p1: {
    up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
    inspect: 'KeyE',
    pass: 'Digit1', quarantine: 'Digit2', eliminate: 'Digit3',
  },
  p2: {
    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    inspect: 'Numpad0',
    pass: 'Numpad1', quarantine: 'Numpad2', eliminate: 'Numpad3',
  },
}

export const PLAYER_COLORS = { p1: '#3b82f6', p2: '#f59e0b' }
export const PLAYER_NAMES  = { p1: 'DETECTIVE RYAN', p2: 'DETECTIVE CHEN' }

export const THREAT_COLORS = {
  clean:       '#22c55e',
  corrupted:   '#94a3b8',
  adware:      '#f59e0b',
  trojan:      '#8b5cf6',
  ransomware:  '#ef4444',
}

export const Z = {
  CANVAS:   0,
  MODALS:  40,
  HUD:     50,
  NOTEBOOK:60,
  OVERLAY:100,
}

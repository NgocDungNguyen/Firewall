import { SCORING } from './constants.js'

export function resolveAction(particle, action, playerId, levelDamage, callbacks) {
  const { isVirus } = particle
  let points = 0
  let damage  = 0

  if (action === 'pass') {
    if (!isVirus) points = SCORING.CORRECT_ACTION
    else          damage  = levelDamage
  } else if (action === 'quarantine') {
    points = 0
  } else if (action === 'eliminate') {
    if (isVirus)  points = SCORING.CORRECT_ACTION
    else          points = SCORING.WRONG_ELIMINATE
  }

  particle.state = action === 'eliminate' ? 'eliminated'
                 : action === 'quarantine' ? 'quarantined'
                 : 'passed'

  callbacks.onScore(playerId, points)
  if (damage > 0) callbacks.onDamage(damage)

  return { points, damage, correct: isVirus ? action !== 'pass' : action !== 'eliminate' }
}

export function calcRoundScore(actionPoints, elapsedMs, hpLostThisRound) {
  let score = SCORING.BASE_ROUND + actionPoints
  if (elapsedMs < 30_000)      score += SCORING.TIME_BONUS_30
  else if (elapsedMs < 60_000) score += SCORING.TIME_BONUS_60
  if (hpLostThisRound === 0)   score += SCORING.FLAWLESS
  score += hpLostThisRound * SCORING.HP_PENALTY
  return score
}

export function calcHPBonus(elapsedMs) {
  if (elapsedMs < 30_000) return SCORING.HP_BONUS_30
  if (elapsedMs < 60_000) return SCORING.HP_BONUS_60
  return 0
}

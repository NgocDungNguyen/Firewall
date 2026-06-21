import { getDatabase, ref, push, get } from 'firebase/database'
import { getApp } from './config.js'

function db() { return getDatabase(getApp()) }

export async function submitScore(playerName, score, levelReached) {
  try {
    await push(ref(db(), 'leaderboard'), {
      playerName,
      score: Number(score),
      levelReached: Number(levelReached),
      timestamp: new Date().toISOString(),
    })
    return true
  } catch (err) {
    console.warn('Leaderboard submit failed:', err)
    return false
  }
}

export async function fetchLeaderboard(limit = 10) {
  try {
    const snap = await get(ref(db(), 'leaderboard'))
    if (!snap.exists()) return []
    const entries = []
    snap.forEach(child => {
      const val = child.val()
      if (val && typeof val.score === 'number') entries.push(val)
    })
    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  } catch (err) {
    console.warn('Leaderboard fetch failed:', err)
    return []
  }
}

import { getDatabase, ref, push, query, orderByChild, limitToLast, get } from 'firebase/database'
import { getApp } from './config.js'

function db() { return getDatabase(getApp()) }

export async function submitScore(playerName, score, levelReached) {
  try {
    await push(ref(db(), 'leaderboard'), {
      playerName, score, levelReached,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('Leaderboard submit failed:', err)
  }
}

export async function fetchLeaderboard(limit = 10) {
  try {
    const q    = query(ref(db(), 'leaderboard'), orderByChild('score'), limitToLast(limit))
    const snap = await get(q)
    if (!snap.exists()) return []
    const entries = []
    snap.forEach(child => entries.push(child.val()))
    return entries.sort((a, b) => b.score - a.score)
  } catch (err) {
    console.warn('Leaderboard fetch failed:', err)
    return []
  }
}

// Fix 100vh on mobile browsers (iOS Safari, Chrome Android address-bar issue)
const _setVH = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
_setVH()
window.addEventListener('resize', _setVH)

import { gameState }           from './state/GameState.js'
import { ScreenRouter }        from './ui/ScreenRouter.js'
import { MenuScreen }          from './ui/screens/MenuScreen.js'
import { BriefingScreen }      from './ui/screens/BriefingScreen.js'
import { ResultsScreen }       from './ui/screens/ResultsScreen.js'
import { LeaderboardScreen }   from './ui/screens/LeaderboardScreen.js'
import { HUD }                 from './ui/HUD.js'
import { InspectionModal }     from './ui/InspectionModal.js'
import { InvestigatorNotebook } from './ui/InvestigatorNotebook.js'
import { AnalystToolbox }      from './ui/AnalystToolbox.js'
import { GameEngine }          from './game/GameEngine.js'
import { soundEngine }         from './audio/SoundEngine.js'

const router   = new ScreenRouter(gameState)
const hud      = new HUD(gameState)
const modal    = new InspectionModal(gameState)
const notebook = new InvestigatorNotebook(gameState)
const toolbox  = new AnalystToolbox(gameState)
const engine   = new GameEngine(gameState, modal)

new MenuScreen(gameState, engine)
new BriefingScreen(gameState, engine)
new ResultsScreen(gameState)
new LeaderboardScreen(gameState)

router.init()
hud.init()
notebook.init()
toolbox.init()

// ── Mute button ──────────────────────────────────────────────────────────────
document.getElementById('btn-mute').addEventListener('click', () => {
  const on = soundEngine.toggle()
  document.getElementById('btn-mute').textContent = on ? '🔊' : '🔇'
})

// ── Global click sounds on all navigation buttons ───────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.start-btn, .menu-btn, #btn-leaderboard, #btn-lb-menu, #btn-results-menu, #btn-gameover-menu, #btn-next-round, #btn-submit-score')
  if (btn) soundEngine.playClick()
}, true)

// ── Unlock AudioContext on first user gesture ─────────────────────────────
document.addEventListener('pointerdown', () => soundEngine['_ctx'](), { once: true, capture: true })

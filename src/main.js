import { gameState } from './state/GameState.js'
import { ScreenRouter } from './ui/ScreenRouter.js'
import { MenuScreen } from './ui/screens/MenuScreen.js'
import { BriefingScreen } from './ui/screens/BriefingScreen.js'
import { ResultsScreen } from './ui/screens/ResultsScreen.js'
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen.js'
import { HUD } from './ui/HUD.js'
import { InspectionModal } from './ui/InspectionModal.js'
import { InvestigatorNotebook } from './ui/InvestigatorNotebook.js'
import { GameEngine } from './game/GameEngine.js'

const router = new ScreenRouter(gameState)
const hud = new HUD(gameState)
const modal = new InspectionModal(gameState)
const notebook = new InvestigatorNotebook(gameState)
const engine = new GameEngine(gameState, modal)

new MenuScreen(gameState, engine)
new BriefingScreen(gameState, engine)
new ResultsScreen(gameState)
new LeaderboardScreen(gameState)

router.init()
hud.init()
notebook.init()

import * as THREE from 'three'
import { CANVAS_W, CANVAS_H, HUD_H, GATE_X, GATE_Y, GATE_H, GATE_W, LANE_YS } from './constants.js'

// ── Coordinate mapping: game space (1920×1080) → 3D world space ──────────────
const S           = 0.05
const CENTER_X    = CANVAS_W / 2          // 960
const CENTER_Z    = (LANE_YS[0] + LANE_YS[LANE_YS.length - 1]) / 2  // 510
const FLOAT_Y     = 4.0                   // height files float at

const gx = x => (x - CENTER_X) * S       // world X  (−48 … +48)
const gz = y => (y - CENTER_Z) * S       // world Z  (−12 … +12 for lanes)

// ── Extension colour table (same as 2D Renderer) ─────────────────────────────
const EXT_COLORS = {
  txt:'#60a5fa', docx:'#60a5fa', doc:'#60a5fa', pdf:'#818cf8',
  xlsx:'#34d399', xls:'#34d399', csv:'#34d399',
  json:'#60a5fa', xml:'#60a5fa', pptx:'#fb923c', ppt:'#fb923c',
  jpg:'#a78bfa',  jpeg:'#a78bfa', png:'#a78bfa', gif:'#a78bfa', bmp:'#a78bfa', svg:'#c084fc',
  mp3:'#f472b6',  wav:'#f472b6',  ogg:'#f472b6', flac:'#f472b6',
  mp4:'#fb7185',  avi:'#fb7185',  mkv:'#fb7185', mov:'#fb7185',
  zip:'#fb923c',  rar:'#fb923c',  tar:'#fb923c',
  exe:'#94a3b8',  dll:'#94a3b8',  bat:'#94a3b8', sys:'#94a3b8', bin:'#94a3b8',
}

function fileColor(ext) { return EXT_COLORS[ext] || '#60a5fa' }

function displayExt(extStr) {
  const parts = String(extStr || '').replace(/^\.+/, '').split('.').filter(Boolean)
  return (parts[0] || 'txt').toLowerCase()
}

function kLabel(code) {
  if (code.startsWith('Key'))    return code.slice(3)
  if (code.startsWith('Digit'))  return code.slice(5)
  if (code.startsWith('Numpad')) return 'NUM' + code.slice(6)
  const M = { ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→' }
  return M[code] || code
}

// ─────────────────────────────────────────────────────────────────────────────
class Renderer3D {
  constructor() {
    this.renderer        = null
    this.scene           = null
    this.camera          = null
    this._gateFrameMat   = null
    this._gateGlowLight  = null
    this._textureCache   = new Map()   // "ext#color" → CanvasTexture
    this._particleMeshes = new Map()   // particleId  → { group, prompt }
    this._playerMeshes   = new Map()   // playerId    → THREE.Group
    this._resizeHandler  = null
  }

  // ═══════════════════════════════════════════════════ INITIALISE ════════════

  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.renderer.shadowMap.enabled  = true
    this.renderer.shadowMap.type     = THREE.PCFSoftShadowMap
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 2.0   // much brighter overall

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x08101e)
    this.scene.fog = new THREE.FogExp2(0x08101e, 0.0025)  // far less fog — see the whole field

    const aspect = window.innerWidth / window.innerHeight
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500)
    this.camera.position.set(0, 36, 68)
    this.camera.lookAt(0, 2, 0)

    this._setupLights()
    this._buildEnvironment()

    this._resizeHandler = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    }
    window.addEventListener('resize', this._resizeHandler)
  }

  // ═══════════════════════════════════════════════════ LIGHTS ═══════════════

  _setupLights() {
    // Strong ambient so everything is visible
    this.scene.add(new THREE.AmbientLight(0x4466aa, 12))

    // Main key light from above-left
    const dir = new THREE.DirectionalLight(0xccddff, 6)
    dir.position.set(-20, 50, 40)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    Object.assign(dir.shadow.camera, { near: 0.1, far: 200, left: -65, right: 65, top: 45, bottom: -45 })
    this.scene.add(dir)

    // Front fill light (illuminates the faces of cards/characters facing camera)
    const front = new THREE.DirectionalLight(0xaabbee, 4)
    front.position.set(0, 15, 80)
    this.scene.add(front)

    // Top-down fill so ground area is bright
    const top = new THREE.DirectionalLight(0x88aacc, 3)
    top.position.set(0, 60, 0)
    this.scene.add(top)

    // Hemisphere (sky blue / ground grey)
    this.scene.add(new THREE.HemisphereLight(0x3355aa, 0x223344, 4))

    // Gate glow
    this._gateGlowLight = new THREE.PointLight(0x22d3ee, 18, 45)
    this._gateGlowLight.position.set(gx(GATE_X) + 2, 10, gz(GATE_Y + GATE_H / 2))
    this.scene.add(this._gateGlowLight)

    // Spawn-side accent
    const spawnFill = new THREE.PointLight(0x4455ff, 8, 70)
    spawnFill.position.set(gx(150), 20, gz(CENTER_Z))
    this.scene.add(spawnFill)

    // Mid-field fill so the action area is well lit
    const midFill = new THREE.PointLight(0x6677cc, 6, 60)
    midFill.position.set(gx(900), 25, gz(CENTER_Z))
    this.scene.add(midFill)
  }

  // ═══════════════════════════════════════════════════ ENVIRONMENT ══════════

  _buildEnvironment() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(115, 62, 50, 34),
      new THREE.MeshStandardMaterial({ color: 0x0d1f35, metalness: 0.1, roughness: 0.9 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, gz(CENTER_Z))
    floor.receiveShadow = true
    this.scene.add(floor)

    // Grid — visible cyan tones
    const grid = new THREE.GridHelper(115, 30, 0x1a4080, 0x0d2040)
    grid.position.set(0, 0.02, gz(CENTER_Z))
    this.scene.add(grid)

    // Lane highlight strips
    const laneMat = new THREE.MeshBasicMaterial({ color: 0x1a5090, transparent: true, opacity: 0.6 })
    for (const ly of LANE_YS) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(CANVAS_W * S + 2, 0.28), laneMat)
      strip.rotation.x = -Math.PI / 2
      strip.position.set(0, 0.03, gz(ly))
      this.scene.add(strip)
    }

    this._buildGate()
    this._buildDecorations()
  }

  _buildGate() {
    const gX      = gx(GATE_X)
    const cZ      = gz(GATE_Y + GATE_H / 2)
    const hWorld  = GATE_H * S    // 36
    const wWorld  = GATE_W * S    // 4
    const group   = new THREE.Group()

    // Translucent panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(wWorld, hWorld, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x0a1a2e, emissive: 0x0a2a4e, emissiveIntensity: 0.3,
        metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.65,
      })
    )
    panel.position.set(gX + wWorld / 2, hWorld / 2, cZ)
    group.add(panel)

    // Glowing frame pieces
    this._gateFrameMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 2.5,
      metalness: 0.9, roughness: 0.1,
    })
    const fm = this._gateFrameMat

    const addBar = (w, h, d, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm)
      m.position.set(px, py, pz)
      group.add(m)
    }
    addBar(wWorld + 0.7, 0.55, 0.9, gX + wWorld / 2, hWorld + 0.28, cZ)  // top
    addBar(wWorld + 0.7, 0.55, 0.9, gX + wWorld / 2, -0.28, cZ)           // bottom
    addBar(0.5, hWorld, 0.9, gX,                     hWorld / 2, cZ)       // left pillar

    // Scan lines
    const slMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.12 })
    for (let i = 0; i < 14; i++) {
      const sl = new THREE.Mesh(new THREE.PlaneGeometry(wWorld, 0.14), slMat)
      sl.position.set(gX + wWorld / 2, (i / 13) * hWorld, cZ + 0.25)
      group.add(sl)
    }

    // Label
    const lc = document.createElement('canvas')
    lc.width = 256; lc.height = 80
    const lctx = lc.getContext('2d')
    lctx.fillStyle = '#22d3ee'
    lctx.font = 'bold 28px "Share Tech Mono", monospace'
    lctx.textAlign = 'center'
    lctx.textBaseline = 'middle'
    lctx.fillText('FIREWALL', 128, 28)
    lctx.fillText('GATE', 128, 56)
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wWorld + 1, 3.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lc), transparent: true })
    )
    labelMesh.position.set(gX + wWorld / 2, hWorld + 3.5, cZ)
    group.add(labelMesh)

    this.scene.add(group)
  }

  _buildDecorations() {
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0a1525, metalness: 0.7, roughness: 0.3 })
    const ledMats = [
      new THREE.MeshBasicMaterial({ color: 0x22d3ee }),
      new THREE.MeshBasicMaterial({ color: 0x34d399 }),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
    ]
    const topZ = gz(LANE_YS[0] - 55)

    for (let i = 0; i < 4; i++) {
      const rx = gx(120 + i * 390)
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 10, 1.0), rackMat)
      rack.position.set(rx, 5, topZ)
      rack.castShadow = true
      this.scene.add(rack)
      for (let j = 0; j < 5; j++) {
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), ledMats[(i + j) % 3])
        led.position.set(rx - 0.52, 1.5 + j * 1.5, topZ - 0.52)
        this.scene.add(led)
      }
    }

    // Holographic background panels
    const holMat = new THREE.MeshBasicMaterial({ color: 0x0a2a5a, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.5), holMat)
      p.position.set(gx(250 + i * 500), 9 + i * 2, topZ - 2)
      p.rotation.y = (i - 1) * 0.12
      this.scene.add(p)
    }
  }

  // ═══════════════════════════════════════════════════ FILE TEXTURE ══════════

  _getFileTexture(ext, color) {
    const key = ext + color
    if (this._textureCache.has(key)) return this._textureCache.get(key)

    const W = 256, H = 256
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')

    // Background — visible dark-blue, not black
    ctx.fillStyle = '#0f1e30'
    ctx.fillRect(0, 0, W, H)

    // Bold colour header bar
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, color)
    grad.addColorStop(1, color + '66')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, 24)

    // Left accent bar
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 10, H)

    // Fold-corner triangle
    ctx.fillStyle = color + '55'
    ctx.beginPath(); ctx.moveTo(W - 50, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 50); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(W - 50, 24); ctx.lineTo(W - 50, 50); ctx.lineTo(W, 50); ctx.stroke()

    // Extension text — big and bright
    ctx.font = 'bold 64px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Shadow for readability
    ctx.shadowColor = color; ctx.shadowBlur = 12
    ctx.fillText('.' + ext.toUpperCase(), W / 2, H * 0.44)
    ctx.shadowBlur = 0

    // Sub-label (file type name)
    ctx.font = 'bold 22px monospace'
    ctx.fillStyle = color
    ctx.fillText(ext.toUpperCase() + ' FILE', W / 2, H * 0.62)

    // Fake document lines (visible light colour)
    ctx.fillStyle = '#1e3a5a'
    const lineLengths = [0.72, 0.9, 0.55, 0.82, 0.65]
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(18, H * 0.70 + i * 22, lineLengths[i] * (W - 36), 9)
    }

    // Border — bright
    ctx.strokeStyle = color; ctx.lineWidth = 3
    ctx.strokeRect(2, 2, W - 4, H - 4)

    const tex = new THREE.CanvasTexture(c)
    this._textureCache.set(key, tex)
    return tex
  }

  // ═══════════════════════════════════════════════════ FILE CARD MESH ════════

  _createFileMesh(particle) {
    const ext   = displayExt(particle.metadata?.extension || '.txt')
    const color = fileColor(ext)
    const tex   = this._getFileTexture(ext, color)
    const c3    = new THREE.Color(color)
    const group = new THREE.Group()

    const W = 5.0, H = 5.5, D = 0.25   // big visible cards

    // Card body (thin box)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      new THREE.MeshStandardMaterial({ color: 0x0f1e30, metalness: 0.2, roughness: 0.8 })
    )
    body.castShadow = true
    group.add(body)

    // Front face with file-type texture — emissive so it glows in the dark
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({
        map: tex, metalness: 0, roughness: 0.8,
        emissive: new THREE.Color(color).multiplyScalar(0.18),
      })
    )
    front.position.z = D / 2 + 0.01
    group.add(front)

    // Glowing edge outline — thicker/brighter
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.1, H + 0.1, D + 0.06)),
      new THREE.LineBasicMaterial({ color: c3, transparent: true, opacity: 0.9 })
    )
    group.add(edges)

    // Strong point light so card illuminates the scene around it
    const pLight = new THREE.PointLight(c3, 3, 12)
    pLight.position.z = 2
    group.add(pLight)

    return { group, ext, color, edges }
  }

  // ═══════════════════════════════════════════════════ DETECTIVE MODEL ════════

  _createDetectiveMesh(playerColor, playerId) {
    const group = new THREE.Group()
    const c3    = new THREE.Color(playerColor)

    // ── Materials (lighter, visible colours) ──────────────────────────────────
    const mat = (hex, opts = {}) => new THREE.MeshStandardMaterial({ color: hex, metalness: 0.08, roughness: 0.85, ...opts })

    // Trenchcoat — visible medium-dark slate blue (not near-black)
    const coat   = mat(0x3d5a7a, { emissive: 0x1a2a3a, emissiveIntensity: 0.2 })
    const coatDk = mat(0x2d4260)     // darker coat accents
    const skin   = mat(0xf5c88a, { metalness: 0, roughness: 1 })
    const hat    = mat(0x223344, { metalness: 0.2, emissive: 0x0a1825, emissiveIntensity: 0.3 })
    const pant   = mat(0x2a3f55)     // visible dark-blue trousers
    const shoe   = mat(0x1e1e1e, { metalness: 0.4, roughness: 0.5 })
    const shirt  = mat(0xe8eef8, { metalness: 0, roughness: 1 })   // white-ish shirt
    const gold   = mat(0xddbb44, { metalness: 0.95, roughness: 0.05 })
    const badge  = mat(0xeecc44, { metalness: 1, roughness: 0, emissive: 0xddaa22, emissiveIntensity: 0.5 })
    const band   = new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 1.0 })
    const tieMat = new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 0.6 })
    const glass_ = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.45,
                    metalness: 0.1, roughness: 0, emissive: c3, emissiveIntensity: 0.3 })
    const glowMat = new THREE.MeshBasicMaterial({ color: c3, transparent: true, opacity: 0.5, depthWrite: false })

    const add = (geo, material, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, material)
      m.position.set(px, py, pz)
      if (rx || ry || rz) m.rotation.set(rx, ry, rz)
      m.castShadow = true
      group.add(m)
      return m
    }

    // ── SHOES ─────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(1.0, 0.45, 1.3),  shoe, -0.6, 0.0,  0.15)
    add(new THREE.BoxGeometry(1.0, 0.45, 1.3),  shoe,  0.6, 0.0,  0.15)

    // ── LEGS ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(0.95, 2.8, 0.82), pant, -0.6, 1.4, 0)
    add(new THREE.BoxGeometry(0.95, 2.8, 0.82), pant,  0.6, 1.4, 0)

    // ── TRENCHCOAT LOWER FLAP (long for detective look) ────────────────────────
    add(new THREE.BoxGeometry(2.5, 1.8, 0.95), coat, 0, 1.9, 0)
    // coat split at bottom centre
    add(new THREE.BoxGeometry(0.9, 1.9, 1.0),  coatDk, -0.8, 1.8, 0)
    add(new THREE.BoxGeometry(0.9, 1.9, 1.0),  coatDk,  0.8, 1.8, 0)

    // ── BELT ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(2.5, 0.35, 1.05), mat(0x1a2a38, { metalness: 0.5 }), 0, 2.85, 0)
    // belt buckle
    add(new THREE.BoxGeometry(0.45, 0.45, 0.15), gold, 0, 2.85, 0.53)

    // ── TORSO (broad-shouldered trenchcoat) ───────────────────────────────────
    add(new THREE.BoxGeometry(2.5, 3.2, 1.05), coat, 0, 4.6, 0)

    // Shoulder width extenders (epaulettes)
    add(new THREE.BoxGeometry(0.7, 0.55, 1.1), mat(0x4a6a8a), -1.6, 6.0, 0)
    add(new THREE.BoxGeometry(0.7, 0.55, 1.1), mat(0x4a6a8a),  1.6, 6.0, 0)

    // Shirt / waistcoat visible in coat opening
    add(new THREE.BoxGeometry(0.9, 2.6, 0.14), shirt, 0, 4.6, 0.53)

    // Tie
    add(new THREE.BoxGeometry(0.28, 2.0, 0.15), tieMat, 0, 4.45, 0.56)

    // ── BADGE (gold star on left breast) ──────────────────────────────────────
    add(new THREE.BoxGeometry(0.5, 0.5, 0.14), badge, -0.7, 5.2, 0.55)

    // Lapels — wide, visible
    add(new THREE.BoxGeometry(0.55, 1.5, 0.18), coat, -0.75, 5.4, 0.52, 0, 0,  0.28)
    add(new THREE.BoxGeometry(0.55, 1.5, 0.18), coat,  0.75, 5.4, 0.52, 0, 0, -0.28)

    // ── ARMS ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(0.72, 3.0, 0.78), coat, -1.62, 4.4, 0)
    add(new THREE.BoxGeometry(0.72, 3.0, 0.78), coat,  1.62, 4.4, 0)

    // Cuffs
    add(new THREE.BoxGeometry(0.78, 0.38, 0.84), mat(0x4a6a8a), -1.62, 2.85, 0)
    add(new THREE.BoxGeometry(0.78, 0.38, 0.84), mat(0x4a6a8a),  1.62, 2.85, 0)

    // Hands
    add(new THREE.BoxGeometry(0.64, 0.68, 0.66), skin, -1.62, 2.5, 0)
    add(new THREE.BoxGeometry(0.64, 0.68, 0.66), skin,  1.62, 2.5, 0)

    // ── MAGNIFYING GLASS (right hand, held up) ────────────────────────────────
    add(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8), gold, 2.1, 2.5, 0.4, 0, 0, -0.6)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.09, 10, 20), gold)
    ring.position.set(2.65, 1.85, 0.4); group.add(ring)
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), glass_)
    lens.position.set(2.65, 1.85, 0.5); group.add(lens)
    // Lens glow
    const lensLight = new THREE.PointLight(c3, 2, 5)
    lensLight.position.set(2.65, 1.85, 0.8); group.add(lensLight)

    // ── NECK ──────────────────────────────────────────────────────────────────
    add(new THREE.CylinderGeometry(0.32, 0.38, 0.7, 8), skin, 0, 6.7, 0)

    // ── HEAD ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(1.4, 1.35, 1.2), skin, 0, 7.6, 0)

    // Stubble / jaw shading
    add(new THREE.BoxGeometry(1.35, 0.35, 1.15), mat(0xd4aa70), 0, 6.98, 0)

    // Eyes (bright white with pupils)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const lE = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.06), eyeMat); lE.position.set(-0.36, 7.72, 0.58); group.add(lE)
    const rE = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.06), eyeMat); rE.position.set( 0.36, 7.72, 0.58); group.add(rE)
    const pupMat = new THREE.MeshBasicMaterial({ color: 0x111122 })
    const lP = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.07), pupMat); lP.position.set(-0.36, 7.72, 0.63); group.add(lP)
    const rP = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.07), pupMat); rP.position.set( 0.36, 7.72, 0.63); group.add(rP)

    // Eyebrows (dark, furrowed detective look)
    const browMat = new THREE.MeshBasicMaterial({ color: 0x2a1a0a })
    const lB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), browMat); lB.position.set(-0.36, 7.92, 0.58); group.add(lB)
    const rB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), browMat); rB.position.set( 0.36, 7.92, 0.58); group.add(rB)

    // ── FEDORA (wide brim, tall crown — classic detective) ────────────────────
    // Wide brim
    add(new THREE.CylinderGeometry(1.55, 1.55, 0.14, 16), hat, 0, 8.38, 0)
    // Crown — tall, slightly tapered
    add(new THREE.CylinderGeometry(0.82, 0.98, 1.35, 14), hat, 0, 9.1, 0)
    // Crown dent (top indent — classic fedora shape)
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12), hat, 0, 9.72, 0)
    // Hatband in player colour — glows
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.99, 0.99, 0.26, 14), band)
    b.position.y = 8.55; group.add(b)

    // ── PLAYER GLOW DISC (ground shadow/highlight) ────────────────────────────
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.0, 28), glowMat)
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; group.add(disc)

    // Player body light (makes the character glow in their colour)
    const bodyLight = new THREE.PointLight(c3, 3, 10)
    bodyLight.position.set(0, 5, 1); group.add(bodyLight)

    // ── NAME LABEL ────────────────────────────────────────────────────────────
    const nc = document.createElement('canvas'); nc.width = 320; nc.height = 48
    const nctx = nc.getContext('2d')
    nctx.fillStyle = playerColor
    nctx.shadowColor = playerColor; nctx.shadowBlur = 8
    nctx.font = 'bold 24px "Share Tech Mono",monospace'
    nctx.textAlign = 'center'; nctx.textBaseline = 'middle'
    nctx.fillText(playerId === 'p1' ? '▶ DET. RYAN  [P1]' : '▶ DET. CHEN  [P2]', 160, 24)
    const nameLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 0.8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nc), transparent: true, depthWrite: false })
    )
    nameLabel.position.y = 11.0; group.add(nameLabel)

    // Scale up the whole character — tall, imposing detective
    group.scale.setScalar(1.45)

    return group
  }

  // ═══════════════════════════════════════════════════ PROMPT SPRITE ═════════

  _createPromptSprite(label, color) {
    const W = 280, H = 54
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(2,6,18,0.9)'
    ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 8); ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 2
    ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 8); ctx.stroke()
    ctx.font = 'bold 22px "Share Tech Mono",monospace'
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(label, W / 2, H / 2)
    return new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })
    )
  }

  // ═══════════════════════════════════════════════════ SYNC ════════════════

  syncParticles(particles, world) {
    const t = performance.now() * 0.001
    const alive = new Set()

    for (const [id, p] of particles) {
      if (p.state !== 'moving') {
        this._removeParticle(id); continue
      }
      alive.add(id)

      // Create mesh on first sight
      if (!this._particleMeshes.has(id)) {
        const mesh = this._createFileMesh(p)
        this._particleMeshes.set(id, { ...mesh, prompt: null })
        this.scene.add(mesh.group)
      }

      const md   = this._particleMeshes.get(id)
      const { group } = md
      const cx   = p.x + p.width  / 2
      const cy   = p.y + p.height / 2
      const fY   = FLOAT_Y + Math.sin(t * 1.6 + p.lane * 1.2) * 0.35

      group.position.set(gx(cx), fY, gz(cy))
      group.rotation.y = Math.sin(t * 0.4 + p.lane * 0.85) * 0.06
      group.rotation.z = -0.04

      // Inspection highlight
      if (p.inspectedBy) {
        const hc = p.inspectedBy === 'p1' ? 0x3b82f6 : 0xf59e0b
        group.scale.setScalar(1.09)
        md.edges?.material?.color.setHex(hc)
        if (md.edges?.material) md.edges.material.opacity = 1.0
      } else {
        group.scale.setScalar(1)
        md.edges?.material?.color.set(md.color)
        if (md.edges?.material) md.edges.material.opacity = 0.65
      }

      // Interact prompt
      const nearPl = world?.players?.find(pl => pl.nearParticleId === id)
      if (nearPl) {
        if (!md.prompt) {
          const kb    = world.keybindings?.[nearPl.id] ?? {}
          const label = `[${kLabel(kb.inspect ?? 'KeyE')}] INSPECT`
          const spr   = this._createPromptSprite(label, nearPl.color)
          spr.scale.set(6.0, 1.1, 1)
          this.scene.add(spr)
          md.prompt = spr
        }
        md.prompt.position.set(gx(cx), fY + 3.8, gz(cy))
      } else if (md.prompt) {
        this.scene.remove(md.prompt)
        md.prompt = null
      }
    }

    // Orphan cleanup
    for (const id of [...this._particleMeshes.keys()]) {
      if (!alive.has(id)) this._removeParticle(id)
    }
  }

  _removeParticle(id) {
    const md = this._particleMeshes.get(id)
    if (!md) return
    this.scene.remove(md.group)
    if (md.prompt) this.scene.remove(md.prompt)
    this._particleMeshes.delete(id)
  }

  syncPlayers(players) {
    const t = performance.now() * 0.001

    for (const player of players) {
      if (!this._playerMeshes.has(player.id)) {
        const m = this._createDetectiveMesh(player.color, player.id)
        this._playerMeshes.set(player.id, m)
        this.scene.add(m)
      }
      const mesh    = this._playerMeshes.get(player.id)
      const cx      = player.x + player.width  / 2
      const cy      = player.y + player.height / 2
      const moving  = Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 0.5
      const bobY    = moving ? Math.abs(Math.sin(t * 8)) * 0.09 : 0

      mesh.position.set(gx(cx), bobY, gz(cy))

      if (Math.abs(player.vx) > 0.5) {
        const target = player.vx > 0 ? 0 : Math.PI
        mesh.rotation.y += (target - mesh.rotation.y) * 0.2
      }
    }
  }

  // ═══════════════════════════════════════════════════ GATE UPDATE ═══════════

  updateGate(firewallHP) {
    const hex = firewallHP === 3 ? 0x22d3ee : firewallHP === 2 ? 0xf59e0b : 0xef4444
    if (this._gateFrameMat) {
      this._gateFrameMat.color.setHex(hex)
      this._gateFrameMat.emissive.setHex(hex)
    }
    if (this._gateGlowLight) this._gateGlowLight.color.setHex(hex)
  }

  // ═══════════════════════════════════════════════════ RENDER ════════════════

  renderFrame() {
    if (!this.renderer || !this.scene || !this.camera) return
    // Pulse gate
    const t = performance.now() * 0.001
    if (this._gateFrameMat)  this._gateFrameMat.emissiveIntensity = 2.0 + Math.sin(t * 2.5) * 0.65
    if (this._gateGlowLight) this._gateGlowLight.intensity        = 8   + Math.sin(t * 3.0) * 3
    this.renderer.render(this.scene, this.camera)
  }

  // ═══════════════════════════════════════════════════ SCREEN PROJECTION ═════

  // Returns CSS {x, y} for a 3D position derived from game coordinates
  project(gameX, gameY) {
    if (!this.camera) return null
    const v = new THREE.Vector3(gx(gameX), FLOAT_Y, gz(gameY))
    v.project(this.camera)
    return {
      x: (v.x + 1) / 2 * window.innerWidth,
      y: (-v.y + 1) / 2 * window.innerHeight,
    }
  }

  // ═══════════════════════════════════════════════════ CLEANUP ═══════════════

  disposeRound() {
    for (const id of [...this._particleMeshes.keys()]) this._removeParticle(id)
    for (const [, m] of this._playerMeshes) this.scene.remove(m)
    this._playerMeshes.clear()
  }

  dispose() {
    this.disposeRound()
    this._textureCache.forEach(t => t.dispose())
    this._textureCache.clear()
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler)
    this.renderer?.dispose()
    this.renderer = null
  }
}

export const renderer3D = new Renderer3D()

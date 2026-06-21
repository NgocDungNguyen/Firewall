import * as THREE from 'three'
import { CANVAS_W, CANVAS_H, HUD_H, GATE_X, GATE_Y, GATE_H, GATE_W, LANE_YS } from './constants.js'

// ── Coordinate mapping: game space (1920×1080) → 3D world space ──────────────
const S           = 0.05
const CENTER_X    = CANVAS_W / 2          // 960
const CENTER_Z    = (LANE_YS[0] + LANE_YS[LANE_YS.length - 1]) / 2  // 510
const FLOAT_Y     = 2.8                   // height files float at

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
    this.renderer.toneMappingExposure = 1.15

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020612)
    this.scene.fog = new THREE.FogExp2(0x020612, 0.007)

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
    this.scene.add(new THREE.AmbientLight(0x0d1b3a, 4.5))

    const dir = new THREE.DirectionalLight(0x6699ff, 2.8)
    dir.position.set(-20, 40, 30)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    Object.assign(dir.shadow.camera, { near: 0.1, far: 200, left: -65, right: 65, top: 45, bottom: -45 })
    this.scene.add(dir)

    this.scene.add(new THREE.HemisphereLight(0x1a3a6b, 0x0a1a2e, 2))

    this._gateGlowLight = new THREE.PointLight(0x22d3ee, 10, 38)
    this._gateGlowLight.position.set(gx(GATE_X) + 2, 8, gz(GATE_Y + GATE_H / 2))
    this.scene.add(this._gateGlowLight)

    const spawnFill = new THREE.PointLight(0x3322bb, 4, 55)
    spawnFill.position.set(gx(120), 18, gz(CENTER_Z))
    this.scene.add(spawnFill)
  }

  // ═══════════════════════════════════════════════════ ENVIRONMENT ══════════

  _buildEnvironment() {
    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(115, 62, 50, 34),
      new THREE.MeshStandardMaterial({ color: 0x040c1a, metalness: 0.05, roughness: 0.96 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, gz(CENTER_Z))
    floor.receiveShadow = true
    this.scene.add(floor)

    // Grid
    const grid = new THREE.GridHelper(115, 30, 0x0a2040, 0x051018)
    grid.position.set(0, 0.02, gz(CENTER_Z))
    this.scene.add(grid)

    // Lane highlight strips
    const laneMat = new THREE.MeshBasicMaterial({ color: 0x0a3060, transparent: true, opacity: 0.45 })
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

    // Dark background
    ctx.fillStyle = '#060d1b'
    ctx.fillRect(0, 0, W, H)

    // Colour accent header gradient
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, color + 'cc')
    grad.addColorStop(1, color + '22')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, 16)

    // Left accent bar
    ctx.fillStyle = color + '77'
    ctx.fillRect(0, 0, 8, H)

    // Fold-corner triangle
    ctx.fillStyle = color + '33'
    ctx.beginPath(); ctx.moveTo(W - 44, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 44); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = color + '99'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(W - 44, 16); ctx.lineTo(W - 44, 44); ctx.lineTo(W, 44); ctx.stroke()

    // Extension text
    ctx.font = 'bold 56px monospace'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('.' + ext.toUpperCase(), W / 2, H * 0.46)

    // Fake document lines
    ctx.fillStyle = '#0f2035'
    const lineLengths = [0.72, 0.9, 0.55, 0.82, 0.65]
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(14, H * 0.67 + i * 20, lineLengths[i] * (W - 28), 7)
    }

    // Border
    ctx.strokeStyle = color + '55'; ctx.lineWidth = 2
    ctx.strokeRect(1.5, 1.5, W - 3, H - 3)

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

    const W = 3.2, H = 3.2, D = 0.18

    // Card body (thin box)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      new THREE.MeshStandardMaterial({ color: 0x060e1c, metalness: 0.15, roughness: 0.85 })
    )
    body.castShadow = true
    group.add(body)

    // Front face with file-type texture
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshStandardMaterial({ map: tex, metalness: 0.05, roughness: 0.9 })
    )
    front.position.z = D / 2 + 0.01
    group.add(front)

    // Glowing edge outline
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.06, H + 0.06, D + 0.04)),
      new THREE.LineBasicMaterial({ color: c3, transparent: true, opacity: 0.65 })
    )
    group.add(edges)

    // Per-card colour glow (small point light)
    const pLight = new THREE.PointLight(c3, 1.3, 7)
    pLight.position.z = 1.2
    group.add(pLight)

    return { group, ext, color, edges }
  }

  // ═══════════════════════════════════════════════════ DETECTIVE MODEL ════════

  _createDetectiveMesh(playerColor, playerId) {
    const group = new THREE.Group()
    const c3    = new THREE.Color(playerColor)

    const mat = (hex, opts = {}) => new THREE.MeshStandardMaterial({ color: hex, metalness: 0.05, roughness: 0.9, ...opts })
    const coat   = mat(0x18283c)
    const skin   = mat(0xf0c88a, { metalness: 0, roughness: 1 })
    const hat    = mat(0x0c1820, { metalness: 0.15 })
    const pant   = mat(0x0d1823)
    const shoe   = mat(0x0a0d10, { metalness: 0.3, roughness: 0.6 })
    const shirt  = mat(0xd0d8e8, { metalness: 0, roughness: 1 })
    const gold   = mat(0xccaa33, { metalness: 0.9, roughness: 0.1 })
    const band   = new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 0.65 })
    const tie    = new THREE.MeshStandardMaterial({ color: c3, emissive: c3, emissiveIntensity: 0.35 })
    const glass_ = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.38, metalness: 0, roughness: 0, emissive: c3, emissiveIntensity: 0.18 })
    const glow   = new THREE.MeshBasicMaterial({ color: c3, transparent: true, opacity: 0.42, depthWrite: false })

    const add = (geo, material, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, material)
      m.position.set(px, py, pz)
      if (rx || ry || rz) m.rotation.set(rx, ry, rz)
      m.castShadow = true
      group.add(m)
      return m
    }

    // ── SHOES ─────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(0.82, 0.4, 1.05), shoe, -0.5, 0.0, 0.12)
    add(new THREE.BoxGeometry(0.82, 0.4, 1.05), shoe,  0.5, 0.0, 0.12)

    // ── LEGS ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(0.78, 2.2, 0.68), pant, -0.5, 1.1, 0)
    add(new THREE.BoxGeometry(0.78, 2.2, 0.68), pant,  0.5, 1.1, 0)

    // ── COAT FLAP / SKIRT ─────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(2.0, 1.25, 0.82), coat, 0, 1.62, 0)

    // ── BELT ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(1.92, 0.28, 0.96), mat(0x0a1018, { metalness: 0.3 }), 0, 2.22, 0)

    // ── TORSO ─────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(1.9, 2.8, 0.95), coat, 0, 3.6, 0)

    // Shirt + tie
    add(new THREE.BoxGeometry(0.75, 2.0, 0.12), shirt, 0, 3.65, 0.48)
    add(new THREE.BoxGeometry(0.22, 1.55, 0.14), tie,   0, 3.52, 0.50)

    // Lapels
    add(new THREE.BoxGeometry(0.38, 1.1, 0.14), coat, -0.52, 4.22, 0.46, 0, 0,  0.3)
    add(new THREE.BoxGeometry(0.38, 1.1, 0.14), coat,  0.52, 4.22, 0.46, 0, 0, -0.3)

    // ── ARMS ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(0.58, 2.42, 0.65), coat, -1.25, 3.5, 0)
    add(new THREE.BoxGeometry(0.58, 2.42, 0.65), coat,  1.25, 3.5, 0)

    // Hands
    add(new THREE.BoxGeometry(0.52, 0.56, 0.56), skin, -1.25, 2.2, 0)
    add(new THREE.BoxGeometry(0.52, 0.56, 0.56), skin,  1.25, 2.2, 0)

    // ── MAGNIFYING GLASS ──────────────────────────────────────────────────────
    add(new THREE.CylinderGeometry(0.06, 0.06, 1.42, 8), gold, 1.72, 2.1, 0.3, 0, 0, -0.55)

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.07, 8, 16), gold)
    ring.position.set(2.12, 1.55, 0.3); group.add(ring)

    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), glass_)
    lens.position.set(2.12, 1.55, 0.38); group.add(lens)

    // ── NECK ──────────────────────────────────────────────────────────────────
    add(new THREE.CylinderGeometry(0.28, 0.32, 0.6, 8), skin, 0, 5.3, 0)

    // ── HEAD ──────────────────────────────────────────────────────────────────
    add(new THREE.BoxGeometry(1.15, 1.1, 1.0), skin, 0, 6.1, 0)

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.22, 0.18, 0.05)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const lE = new THREE.Mesh(eyeGeo, eyeMat); lE.position.set(-0.3, 6.18, 0.49); group.add(lE)
    const rE = new THREE.Mesh(eyeGeo, eyeMat); rE.position.set( 0.3, 6.18, 0.49); group.add(rE)
    const pupGeo = new THREE.BoxGeometry(0.1, 0.1, 0.06)
    const pupMat = new THREE.MeshBasicMaterial({ color: 0x111111 })
    const lP = new THREE.Mesh(pupGeo, pupMat); lP.position.set(-0.3, 6.18, 0.53); group.add(lP)
    const rP = new THREE.Mesh(pupGeo, pupMat); rP.position.set( 0.3, 6.18, 0.53); group.add(rP)

    // ── FEDORA ────────────────────────────────────────────────────────────────
    add(new THREE.CylinderGeometry(1.2, 1.2, 0.12, 12), hat, 0, 6.74, 0)
    add(new THREE.CylinderGeometry(0.73, 0.86, 1.02, 12), hat, 0, 7.35, 0)
    // Hat band in player colour
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.87, 0.87, 0.22, 12), band)
    b.position.y = 6.87; group.add(b)

    // ── GLOW DISC ─────────────────────────────────────────────────────────────
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), glow)
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.02; group.add(disc)

    // ── NAME LABEL ────────────────────────────────────────────────────────────
    const nc = document.createElement('canvas'); nc.width = 280; nc.height = 40
    const nctx = nc.getContext('2d')
    nctx.fillStyle = playerColor; nctx.font = 'bold 20px "Share Tech Mono",monospace'
    nctx.textAlign = 'center'; nctx.textBaseline = 'middle'
    nctx.fillText(playerId === 'p1' ? 'DET. RYAN  P1' : 'DET. CHEN  P2', 140, 20)
    const nameLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.65),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nc), transparent: true, depthWrite: false })
    )
    nameLabel.position.y = 9.1; group.add(nameLabel)

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
          spr.scale.set(4.6, 0.92, 1)
          this.scene.add(spr)
          md.prompt = spr
        }
        md.prompt.position.set(gx(cx), fY + 2.9, gz(cy))
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

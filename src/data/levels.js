// spawnIntervalFrames: L1-2 = 1800 (30s @ 60fps), L3-4 = 900 (15s @ 60fps)

export const LEVELS = [
  {
    id: 1,
    name: 'CORRUPTED FILES',
    wavesPerRound: 4,
    particlesPerWave: 3,
    spawnIntervalFrames: 1800,   // 30 seconds
    baseSpeed: 1.8,
    virusRatio: 0.33,
    damage: 1,
    threatTypes: ['corrupted', 'clean'],
    threats: [
      {
        type: 'corrupted',
        icon: '💀',
        color: '#94a3b8',
        name: 'Corrupted File',
        damage: 1,
        clues: [
          'File size is 0 bytes OR gigantic (like 999 GB)',
          'Has two extensions: e.g. photo.jpg.exe',
          'Looks like a normal file but the size is clearly wrong',
        ],
        action: 'ELIMINATE',
        example: 'birthday_photo.jpg.exe  •  0 bytes',
      },
      {
        type: 'clean',
        icon: '📄',
        color: '#22c55e',
        name: 'Clean File',
        damage: 0,
        clues: [
          'Normal file size (KB range, not MB or GB)',
          'Single extension (.txt, .jpg, .pdf)',
          'IP from home/school network (192.168.x or 10.x.x.x)',
        ],
        action: 'PASS',
        example: 'homework_chapter3.docx  •  42 KB',
      },
    ],
  },
  {
    id: 2,
    name: 'ADWARE INVASION',
    wavesPerRound: 5,
    particlesPerWave: 3,
    spawnIntervalFrames: 1800,   // 30 seconds
    baseSpeed: 2.2,
    virusRatio: 0.40,
    damage: 1,
    threatTypes: ['adware', 'corrupted', 'clean'],
    threats: [
      {
        type: 'adware',
        icon: '📢',
        color: '#f59e0b',
        name: 'Adware / Spyware',
        damage: 1,
        clues: [
          'Origin IP starts with 185., 203., or 91. (foreign/unknown source)',
          'Suspicious names: free downloaders, ad blockers, speed boosters',
          'Uses .dll or .scr file extension',
        ],
        action: 'QUARANTINE (best) or ELIMINATE',
        example: 'free_movie_downloader.exe  •  IP: 185.44.212.7',
      },
    ],
  },
  {
    id: 3,
    name: 'TROJAN HORSES',
    wavesPerRound: 6,
    particlesPerWave: 3,
    spawnIntervalFrames: 900,    // 15 seconds
    baseSpeed: 2.8,
    virusRatio: 0.45,
    damage: 2,
    threatTypes: ['trojan', 'adware', 'clean'],
    threats: [
      {
        type: 'trojan',
        icon: '🐴',
        color: '#8b5cf6',
        name: 'Trojan Horse',
        damage: 2,
        clues: [
          'SIGNATURE has only 63 characters — valid files always have exactly 64!',
          'Disguises itself as Windows Update, Chrome, or Adobe patches',
          'Everything else looks normal — only the signature gives it away',
        ],
        action: 'ELIMINATE',
        example: 'windows_update_kb4578.exe  •  Hash: 63 chars ⚠',
      },
    ],
  },
  {
    id: 4,
    name: 'RANSOMWARE CRISIS',
    wavesPerRound: 7,
    particlesPerWave: 3,
    spawnIntervalFrames: 900,    // 15 seconds
    baseSpeed: 3.4,
    virusRatio: 0.50,
    damage: 3,
    threatTypes: ['ransomware', 'trojan', 'adware', 'clean'],
    threats: [
      {
        type: 'ransomware',
        icon: '🔒',
        color: '#ef4444',
        name: 'Ransomware',
        damage: 3,
        clues: [
          'Signature contains letters like G, H, X, Z — hex only uses 0-9 and a-f!',
          'Double extension on documents: INVOICE.pdf.exe',
          'File size is 15–25 MB for what claims to be a document',
        ],
        action: 'ELIMINATE IMMEDIATELY',
        example: 'FINAL_INVOICE_MARCH.pdf.exe  •  19.8 MB',
      },
    ],
  },
]

// Simulated IP intelligence database — maps IP prefixes to geolocation/trust data

const RANGES = [
  // ── TRUSTED ────────────────────────────────────────────────────────────────
  {
    test: ip => ip.startsWith('192.168.'),
    flag: '🏠', country: 'Local Network', org: 'Home / School Router',
    netType: 'Private LAN', trust: 'TRUSTED',
    note: 'Standard home or school local network address. Files from 192.168.x.x originate inside your own network.',
  },
  {
    test: ip => ip.startsWith('10.'),
    flag: '🏢', country: 'Private Network', org: 'School / Corporate Intranet',
    netType: 'Private LAN', trust: 'TRUSTED',
    note: 'Internal school or company intranet address. Traffic from 10.x.x.x stays inside your local network.',
  },
  {
    test: ip => { const n = parseInt(ip.split('.')[1]); return ip.startsWith('172.') && n >= 16 && n <= 31 },
    flag: '🏢', country: 'Private Network', org: 'Internal Server',
    netType: 'Private LAN', trust: 'TRUSTED',
    note: 'RFC 1918 private range (172.16–31.x.x). Used by internal servers and development environments.',
  },
  // ── CAUTION ────────────────────────────────────────────────────────────────
  {
    test: ip => ip.startsWith('203.198.'),
    flag: '🇭🇰', country: 'Hong Kong', org: 'Commercial ISP (Unverified)',
    netType: 'Commercial Broadband', trust: 'CAUTION',
    note: 'Commercial ISP in Hong Kong. Not inherently malicious but unexpected for school file transfers — inspect carefully.',
  },
  {
    test: ip => ip.startsWith('203.176.'),
    flag: '🇰🇷', country: 'South Korea', org: 'AS9318 SK Broadband Co.',
    netType: 'Commercial Broadband', trust: 'CAUTION',
    note: 'South Korean broadband provider. Could be a legitimate user overseas or a compromised endpoint — proceed with caution.',
  },
  {
    test: ip => ip.startsWith('91.108.'),
    flag: '🇷🇺', country: 'Russia', org: 'Telegram Messenger LLP',
    netType: 'CDN / Messaging Service', trust: 'CAUTION',
    note: 'Associated with Telegram CDN servers. Legitimate messaging use, but unusual origin for data files. Check other evidence.',
  },
  {
    test: ip => ip.startsWith('10.10.'),
    flag: '🏢', country: 'Private Network', org: 'Lab / Dev Subnet',
    netType: 'Private LAN', trust: 'TRUSTED',
    note: 'Subnet within a private 10.x.x.x network, commonly used for lab or dev machines.',
  },
  // ── BLOCKED ────────────────────────────────────────────────────────────────
  {
    test: ip => ip.startsWith('185.44.'),
    flag: '🇳🇱', country: 'Netherlands', org: 'Bulletproof Hosting AS49367',
    netType: 'Bulletproof Datacenter', trust: 'BLOCKED',
    note: '⚠ Operated by a bulletproof hosting provider known for hosting malware droppers and botnets. ELIMINATE all files from this range.',
  },
  {
    test: ip => ip.startsWith('185.130.'),
    flag: '🇷🇴', country: 'Romania', org: 'Datacenter Services SRL',
    netType: 'Suspicious Datacenter', trust: 'BLOCKED',
    note: '⚠ Romanian datacenter linked to adware distribution campaigns. Quarantine or eliminate any files originating here.',
  },
  {
    test: ip => ip.startsWith('185.220.'),
    flag: '🇩🇪', country: 'Germany', org: 'Tor Exit Node Operator',
    netType: 'Anonymizing Proxy (Tor)', trust: 'BLOCKED',
    note: '⚠ Known Tor exit node. The true origin is hidden behind an anonymizing network. All files through Tor are high risk.',
  },
  {
    test: ip => ip.startsWith('91.195.'),
    flag: '🇷🇺', country: 'Russia', org: 'Anonymous Proxy Network',
    netType: 'Anonymizing Proxy', trust: 'BLOCKED',
    note: '⚠ Russian anonymous proxy service, frequently used to mask the real source of malware. Treat all files as hostile.',
  },
  {
    test: ip => ip.startsWith('203.0.'),
    flag: '🚫', country: 'RESERVED / INVALID', org: 'IANA Documentation Range (TEST-NET)',
    netType: 'Spoofed / Invalid', trust: 'BLOCKED',
    note: '⚠ CRITICAL: 203.0.113.0/24 is IANA documentation-only range — it MUST NOT appear in real traffic. This IP is spoofed. ELIMINATE immediately.',
  },
]

const UNKNOWN_TEMPLATE = {
  flag: '🌐', country: 'Unknown Location', org: 'Unknown Organization',
  netType: 'Unknown', trust: 'CAUTION',
  note: 'IP not found in our intelligence database. Could be a newly registered address. Inspect other file properties carefully.',
}

export function lookupIP(ip) {
  if (!ip || typeof ip !== 'string') return UNKNOWN_TEMPLATE
  return RANGES.find(r => { try { return r.test(ip.trim()) } catch (_) { return false } }) || UNKNOWN_TEMPLATE
}

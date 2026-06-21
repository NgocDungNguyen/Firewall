// ── Daily-life friendly file names ──────────────────────────────

export const CLEAN_NAMES = [
  'homework_chapter3', 'birthday_photo', 'grocery_list', 'class_notes',
  'resume_2024', 'family_photo_vacation', 'music_playlist', 'recipe_pasta',
  'school_schedule', 'book_summary', 'project_outline', 'personal_diary',
]
export const CLEAN_EXTS = ['.txt', '.docx', '.jpg', '.pdf', '.json', '.xlsx', '.png']
export const CLEAN_SIZES = ['12 KB', '42 KB', '128 KB', '256 KB', '890 KB', '1.4 MB', '3.2 MB', '2.1 MB']
export const CLEAN_IPS  = [
  '192.168.1.10', '192.168.0.55', '10.0.0.4', '10.0.1.22',
  '192.168.2.100', '10.10.5.3', '192.168.3.77', '10.0.2.15',
]

export const CORRUPT_NAMES      = ['birthday_photo', 'homework_chapter3', 'receipt_march', 'class_schedule', 'family_photo']
export const CORRUPT_CLEAN_EXTS = ['.jpg', '.docx', '.pdf', '.xlsx', '.png']
export const CORRUPT_BAD_EXTS   = ['.exe', '.bat', '.cmd', '.vbs']
export const CORRUPT_SIZES      = ['0 bytes', '999 GB', '4,096 GB', '0.00 KB', '2,048 TB']

export const ADWARE_NAMES = [
  'free_movie_downloader', 'youtube_ad_blocker', 'coupon_finder_pro',
  'speed_booster_free', 'wifi_password_viewer', 'free_vpn_installer',
  'auto_clicker_free', 'screen_recorder_free',
]
export const ADWARE_EXTS  = ['.dll', '.scr', '.exe']
export const BAD_IPS = [
  '185.44.212.7', '203.0.113.99', '91.108.4.5', '185.220.101.4',
  '203.198.7.16', '91.195.240.6', '185.130.5.22', '203.176.14.9',
]

export const TROJAN_NAMES = [
  'windows_update_kb4578', 'chrome_updater_v118', 'adobe_reader_patch',
  'system_repair_tool', 'antivirus_update_free', 'driver_booster_patch',
]
export const TROJAN_EXTS  = ['.exe', '.bin', '.sys']
export const TROJAN_IPS   = [
  '172.16.33.4', '172.17.8.9', '172.18.0.5', '172.19.44.2',
  '172.16.254.1', '172.20.33.8',
]

export const RANSOM_NAMES     = [
  'FINAL_INVOICE_MARCH', 'YOUR_IMPORTANT_DOCUMENTS', 'PAYMENT_DETAILS_2024',
  'SCHOOL_ASSIGNMENT_DUE', 'FAMILY_PHOTOS_BACKUP', 'CONTRACT_SIGNED',
]
export const RANSOM_EXT_CLEAN = ['.pdf', '.docx', '.xlsx']
export const RANSOM_EXT_BAD   = ['.exe', '.dll', '.bat']
export const RANSOM_SIZES     = ['16.4 MB', '19.8 MB', '22.1 MB', '24.7 MB', '17.3 MB']

// ── Helpers ──────────────────────────────────────────────────────

export function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
export function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

export function makeValidHash() {
  const c = '0123456789abcdef'
  return Array.from({ length: 64 }, () => c[randInt(0, 15)]).join('')
}
export function makeShortHash() {
  const c = '0123456789abcdef'
  return Array.from({ length: 63 }, () => c[randInt(0, 15)]).join('')
}
export function makePoisonedHash() {
  const bad = ['G', 'H', 'X', 'Z', 'Q', 'W']
  const h   = makeValidHash().split('')
  for (let i = 56; i < 64; i++) if (Math.random() < 0.6) h[i] = randFrom(bad)
  return h.join('')
}
export function cleanFileSize() { return randFrom(CLEAN_SIZES) }
export function randIP(pool)    { return randFrom(pool) }

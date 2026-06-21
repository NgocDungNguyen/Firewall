export const CLEAN_NAMES = [
  'readme', 'config_backup', 'system_log', 'user_data', 'preferences',
  'app_settings', 'network_config', 'update_manifest', 'license', 'changelog',
  'boot_sector', 'session_token', 'auth_cache', 'db_snapshot', 'telemetry',
]
export const CLEAN_EXTS = ['.txt', '.json', '.log', '.cfg', '.xml', '.pkg', '.bak']
export const CLEAN_IPS  = [
  '10.0.0.4','10.0.1.22','192.168.1.10','192.168.0.55','172.31.4.8',
  '10.10.5.3','192.168.2.100','10.0.2.15','172.20.10.1','192.168.3.77',
]

export const CORRUPT_NAMES  = ['invoice','document','readme','system32','report','receipt']
export const CORRUPT_CLEAN_EXTS = ['.pdf','.docx','.txt','.xlsx']
export const CORRUPT_BAD_EXTS   = ['.exe','.bat','.cmd','.vbs']
export const CORRUPT_SIZES  = ['0 bytes', '999 GB', '4,096 GB', '0.00 KB', '2,048 TB']

export const ADWARE_NAMES = [
  'free_ram_booster','coupon_helper','analytics_sdk_v2','toolbar_install',
  'browser_plugin','ad_blocker_pro','speed_optimizer','media_player_codec',
]
export const ADWARE_EXTS  = ['.dll', '.scr', '.exe']
export const BAD_IPS = [
  '185.44.212.7','203.0.113.99','91.108.4.5','185.220.101.4',
  '203.198.7.16','91.195.240.6','185.130.5.22','203.176.14.9',
  '91.240.118.3','185.56.81.17',
]

export const TROJAN_NAMES = [
  'svchost_helper','kernel_patch','system_service','lsass_update',
  'winlogon_svc','csrss_patch','ntdll_update','winsock_helper',
]
export const TROJAN_EXTS  = ['.exe', '.bin', '.sys']
export const TROJAN_IPS   = [
  '172.16.33.4','172.17.8.9','172.18.0.5','172.19.44.2',
  '172.16.254.1','172.20.33.8',
]

export const RANSOM_NAMES = [
  'INVOICE_2024','CONTRACT_FINAL','PAYMENT_DETAILS','TAX_RETURN_2024',
  'COMPANY_DATA','ENCRYPTED_BACKUP','CRITICAL_FILES','YOUR_FILES',
]
export const RANSOM_EXT_CLEAN = ['.pdf', '.docx', '.xlsx']
export const RANSOM_EXT_BAD   = ['.exe', '.dll', '.bat']
export const RANSOM_SIZES = ['16.4 MB','19.8 MB','22.1 MB','24.7 MB','17.3 MB']

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

export function makeValidHash() {
  const chars = '0123456789abcdef'
  return Array.from({ length: 64 }, () => chars[randInt(0, 15)]).join('')
}

export function makeShortHash() {
  const chars = '0123456789abcdef'
  return Array.from({ length: 63 }, () => chars[randInt(0, 15)]).join('')
}

export function makePoisonedHash() {
  const badChars = ['G','H','X','Z','Q','W']
  let h = makeValidHash().split('')
  for (let i = 56; i < 64; i++) {
    if (Math.random() < 0.5) h[i] = randFrom(badChars)
  }
  return h.join('')
}

export function randIP(pool) { return randFrom(pool) }

export function cleanFileSize() {
  const sizes = ['4 KB','18 KB','42 KB','128 KB','256 KB','512 KB','1.2 MB','3.4 MB']
  return randFrom(sizes)
}

export { randFrom, randInt }

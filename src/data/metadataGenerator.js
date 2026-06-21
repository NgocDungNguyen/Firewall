import {
  CLEAN_NAMES, CLEAN_EXTS, CLEAN_IPS,
  CORRUPT_NAMES, CORRUPT_CLEAN_EXTS, CORRUPT_BAD_EXTS, CORRUPT_SIZES,
  ADWARE_NAMES, ADWARE_EXTS, BAD_IPS,
  TROJAN_NAMES, TROJAN_EXTS, TROJAN_IPS,
  RANSOM_NAMES, RANSOM_EXT_CLEAN, RANSOM_EXT_BAD, RANSOM_SIZES,
  makeValidHash, makeShortHash, makePoisonedHash,
  randFrom, randInt, cleanFileSize, randIP,
} from './threatProfiles.js'

let caseCounter = 1000

function caseNum() {
  caseCounter++
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 8))
  return `${prefix}${randInt(1,9)}-${caseCounter}`
}

export function generateMetadata(isVirus, threatType) {
  const caseId = caseNum()

  if (!isVirus) {
    const name = randFrom(CLEAN_NAMES)
    const ext  = randFrom(CLEAN_EXTS)
    return {
      caseId,
      fileName:     name + ext,
      fileSize:     cleanFileSize(),
      originIP:     randIP(CLEAN_IPS),
      extension:    ext,
      securityHash: makeValidHash(),
      threatType:   'clean',
      isVirus:      false,
    }
  }

  switch (threatType) {
    case 'corrupted': {
      const name     = randFrom(CORRUPT_NAMES)
      const cleanExt = randFrom(CORRUPT_CLEAN_EXTS)
      const badExt   = randFrom(CORRUPT_BAD_EXTS)
      return {
        caseId,
        fileName:     name + cleanExt + badExt,
        fileSize:     randFrom(CORRUPT_SIZES),
        originIP:     randIP(CLEAN_IPS),
        extension:    cleanExt + badExt,
        securityHash: makeValidHash(),
        threatType:   'corrupted',
        isVirus:      true,
      }
    }
    case 'adware': {
      const ext = randFrom(ADWARE_EXTS)
      return {
        caseId,
        fileName:     randFrom(ADWARE_NAMES) + ext,
        fileSize:     cleanFileSize(),
        originIP:     randIP(BAD_IPS),
        extension:    ext,
        securityHash: makeValidHash(),
        threatType:   'adware',
        isVirus:      true,
      }
    }
    case 'trojan': {
      const ext = randFrom(TROJAN_EXTS)
      return {
        caseId,
        fileName:     randFrom(TROJAN_NAMES) + ext,
        fileSize:     cleanFileSize(),
        originIP:     randIP(TROJAN_IPS),
        extension:    ext,
        securityHash: makeShortHash(),
        threatType:   'trojan',
        isVirus:      true,
      }
    }
    case 'ransomware': {
      const cleanExt = randFrom(RANSOM_EXT_CLEAN)
      const badExt   = randFrom(RANSOM_EXT_BAD)
      return {
        caseId,
        fileName:     randFrom(RANSOM_NAMES) + cleanExt + badExt,
        fileSize:     randFrom(RANSOM_SIZES),
        originIP:     randIP(BAD_IPS),
        extension:    cleanExt + badExt,
        securityHash: makePoisonedHash(),
        threatType:   'ransomware',
        isVirus:      true,
      }
    }
    default:
      return generateMetadata(false, 'clean')
  }
}

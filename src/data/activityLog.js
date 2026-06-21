// Round-scoped activity log — tracks every file decision for the Case Log tool

export const activityLog = {
  entries:  [],   // { fileName, extension, ip, action, isVirus, correct, pointsEarned, waveNum, ts }
  seenIPs:  new Map(),  // ip → [ fileName, ... ]

  record({ fileName, extension, ip, action, isVirus, correct, pointsEarned, waveNum }) {
    const entry = { fileName, extension, ip, action, isVirus, correct, pointsEarned, waveNum, ts: Date.now() }
    this.entries.push(entry)
    if (!this.seenIPs.has(ip)) this.seenIPs.set(ip, [])
    this.seenIPs.get(ip).push(fileName)
  },

  reset() {
    this.entries  = []
    this.seenIPs  = new Map()
  },
}

const WIN1252_REVERSE_MAP = new Map<string, number>([
  ['\u20ac', 0x80],
  ['\u201a', 0x82],
  ['\u0192', 0x83],
  ['\u201e', 0x84],
  ['\u2026', 0x85],
  ['\u2020', 0x86],
  ['\u2021', 0x87],
  ['\u02c6', 0x88],
  ['\u2030', 0x89],
  ['\u0160', 0x8a],
  ['\u2039', 0x8b],
  ['\u0152', 0x8c],
  ['\u017d', 0x8e],
  ['\u2018', 0x91],
  ['\u2019', 0x92],
  ['\u201c', 0x93],
  ['\u201d', 0x94],
  ['\u2022', 0x95],
  ['\u2013', 0x96],
  ['\u2014', 0x97],
  ['\u02dc', 0x98],
  ['\u2122', 0x99],
  ['\u0161', 0x9a],
  ['\u203a', 0x9b],
  ['\u0153', 0x9c],
  ['\u017e', 0x9e],
  ['\u0178', 0x9f],
])

const MOJIBAKE_PATTERN = /[\u00c2\u00c3\u00c5\u00c6\u00cb\u00d0\u00d8\u00e2\u00e3\u00e5\u00e6\u00e7]/u
const REPAIR_BONUS_PATTERN =
  /[\u00df\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2122\u2264\u23ce\u2605]|[\u3400-\u9fff]/gu

const decoder = new TextDecoder('utf-8', { fatal: true })

const countMatches = (value: string, pattern: RegExp) =>
  value.match(pattern)?.length ?? 0

const scoreRepairCandidate = (value: string) =>
  countMatches(value, /[\u3400-\u9fff]/gu) * 10 +
  countMatches(value, REPAIR_BONUS_PATTERN) * 3 -
  countMatches(value, /[\u00c2\u00c3\u00c5\u00c6\u00cb\u00d0\u00d8\u00e2\u00e3\u00e5\u00e6\u00e7]/gu) *
    2

const encodeWin1252 = (value: string) => {
  const bytes: number[] = []
  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (typeof codePoint !== 'number') {
      return null
    }
    if (codePoint <= 0xff) {
      bytes.push(codePoint)
      continue
    }
    const mapped = WIN1252_REVERSE_MAP.get(char)
    if (typeof mapped !== 'number') {
      return null
    }
    bytes.push(mapped)
  }
  return new Uint8Array(bytes)
}

export const repairMojibakeString = (value: string) => {
  if (!value || !MOJIBAKE_PATTERN.test(value)) {
    return value
  }

  let best = value
  let current = value
  let bestScore = scoreRepairCandidate(value)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const encoded = encodeWin1252(current)
    if (!encoded) {
      break
    }

    let repaired = ''
    try {
      repaired = decoder.decode(encoded)
    } catch {
      break
    }

    const repairedScore = scoreRepairCandidate(repaired)
    if (repairedScore <= bestScore) {
      break
    }

    best = repaired
    current = repaired
    bestScore = repairedScore
  }

  return best
}

export const repairMojibakeArray = (values: string[]) =>
  values.map((value) => repairMojibakeString(value))

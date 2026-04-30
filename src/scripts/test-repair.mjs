// Investigate the remaining mojibake patterns in GBA features.json
// These are CJK chars where UTF-8 bytes were interpreted as Latin-1
// but some bytes in the 0x80-0x9F range got mapped to Win-1252 special chars

import { readFileSync } from 'node:fs'

const f = readFileSync('src/app/(game)/asia/china/gba/data/features.json', 'utf-8')

// Find all unique mojibake sequences that should be CJK characters
// CJK chars in UTF-8 use 3 bytes: E0-EF, 80-BF, 80-BF
// When interpreted as Win-1252/Latin-1:
// - E0-EF → à-ï (valid Latin chars)
// - 80-9F → Win-1252 special chars (€, ‚, ƒ, „, …, †, ‡, ˆ, ‰, Š, ‹, Œ, Ž, ', ', ", ", •, –, —, ˜, ™, š, ›, œ, ž, Ÿ)
// - A0-BF → Latin-1 chars (NBSP, ¡, ¢, £, ¤, ¥, ¦, §, ¨, ©, ª, «, ¬, ­, ®, ¯, °, ±, ², ³, ´, µ, ¶, ·, ¸, ¹, º, », ¼, ½, ¾, ¿)

// Build reverse Win-1252 map
const WIN1252_REVERSE = new Map([
  ['\u20ac', 0x80], ['\u201a', 0x82], ['\u0192', 0x83], ['\u201e', 0x84],
  ['\u2026', 0x85], ['\u2020', 0x86], ['\u2021', 0x87], ['\u02c6', 0x88],
  ['\u2030', 0x89], ['\u0160', 0x8a], ['\u2039', 0x8b], ['\u0152', 0x8c],
  ['\u017d', 0x8e], ['\u2018', 0x91], ['\u2019', 0x92], ['\u201c', 0x93],
  ['\u201d', 0x94], ['\u2022', 0x95], ['\u2013', 0x96], ['\u2014', 0x97],
  ['\u02dc', 0x98], ['\u2122', 0x99], ['\u0161', 0x9a], ['\u203a', 0x9b],
  ['\u0153', 0x9c], ['\u017e', 0x9e], ['\u0178', 0x9f],
])

function charToByte(ch) {
  const cp = ch.codePointAt(0)
  if (cp <= 0xff) return cp
  const mapped = WIN1252_REVERSE.get(ch)
  if (mapped !== undefined) return mapped
  return null
}

// Find lines with remaining mojibake and show what they should be
const lines = f.split('\n')
const samples = new Map()

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  // Look for patterns: name field with suspected mojibake
  const nameMatch = line.match(/"(?:name|long_name|short_name)": "([^"]*)"/)
  if (!nameMatch) continue
  const value = nameMatch[1]
  
  // Check if it contains sequences that look like mojibake CJK
  // A mojibaked CJK char looks like: [à-ï][Latin-1 or Win1252 char][Latin-1 or Win1252 char]
  if (!/[\u00e0-\u00ef]/.test(value)) continue
  if (/[\u3400-\u9fff]/.test(value)) continue // Already has real CJK, skip
  
  // Try to decode by treating each char as its byte value
  const bytes = []
  let canDecode = true
  for (const ch of value) {
    const b = charToByte(ch)
    if (b === null) { canDecode = false; break }
    bytes.push(b)
  }
  
  if (canDecode) {
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
      if (decoded !== value && /[\u3400-\u9fff]/.test(decoded)) {
        const key = `${value} → ${decoded}`
        if (!samples.has(key)) {
          samples.set(key, i + 1)
          if (samples.size <= 20) {
            console.log(`Line ${i+1}: "${value}" → "${decoded}"`)
          }
        }
      }
    } catch (e) {
      // Can't decode - bytes may be missing
      if (samples.size < 5) {
        console.log(`Line ${i+1}: "${value}" — DECODE ERROR (bytes: ${bytes.map(b=>b.toString(16)).join(' ')})`)
      }
    }
  }
}

console.log(`\nTotal unique mojibake patterns: ${samples.size}`)

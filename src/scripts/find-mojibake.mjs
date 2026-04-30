import { readFileSync } from 'node:fs'

const files = [
  'src/app/(game)/asia/china/gba/data/features.json',
  'src/lib/cityNameDisplay.ts',
  'src/lib/i18n.tsx',
]

const MOJIBAKE_RE = /[\u00c0-\u00c3][\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/g

for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  let count = 0
  for (let i = 0; i < lines.length; i++) {
    if (MOJIBAKE_RE.test(lines[i])) {
      count++
      if (count <= 15) {
        console.log(`${file}:${i+1}: ${lines[i].trim().substring(0, 150)}`)
      }
    }
  }
  if (count > 15) console.log(`  ... and ${count - 15} more lines`)
  console.log(`  Total: ${count} lines with mojibake`)
  console.log()
}

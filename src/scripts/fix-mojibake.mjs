#!/usr/bin/env node
/**
 * fix-mojibake.mjs
 *
 * Scans all features.json files under src/app and repairs mojibake
 * (double-encoded UTF-8 interpreted as Windows-1252) in string values.
 *
 * The logic mirrors src/lib/repairMojibake.ts so we get the same results
 * the runtime repair would produce, but baked directly into the data files.
 *
 * Usage:  node src/scripts/fix-mojibake.mjs [--dry-run]
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

// ── Windows-1252 special-range reverse map (0x80–0x9F) ────────────────────
const WIN1252_REVERSE_MAP = new Map([
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

const MOJIBAKE_PATTERN =
  /[\u00c2\u00c3\u00c5\u00c6\u00cb\u00d0\u00d8\u00e2\u00e3\u00e5\u00e6\u00e7]/u
const REPAIR_BONUS_PATTERN =
  /[\u00df\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2122\u2264\u23ce\u2605]|[\u3400-\u9fff]/gu
const MOJIBAKE_CHARS_PATTERN =
  /[\u00c2\u00c3\u00c5\u00c6\u00cb\u00d0\u00d8\u00e2\u00e3\u00e5\u00e6\u00e7]/gu

const decoder = new TextDecoder('utf-8', { fatal: true })

const countMatches = (value, pattern) => {
  // Reset lastIndex for global patterns
  pattern.lastIndex = 0
  return value.match(pattern)?.length ?? 0
}

const scoreRepairCandidate = (value) =>
  countMatches(value, /[\u3400-\u9fff]/gu) * 10 +
  countMatches(value, REPAIR_BONUS_PATTERN) * 3 -
  countMatches(value, MOJIBAKE_CHARS_PATTERN) * 2

const encodeWin1252 = (value) => {
  const bytes = []
  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (codePoint === undefined) return null
    if (codePoint <= 0xff) {
      bytes.push(codePoint)
      continue
    }
    const mapped = WIN1252_REVERSE_MAP.get(char)
    if (mapped === undefined) return null
    bytes.push(mapped)
  }
  return new Uint8Array(bytes)
}

const repairMojibakeString = (value) => {
  if (!value || !MOJIBAKE_PATTERN.test(value)) return value

  let best = value
  let current = value
  let bestScore = scoreRepairCandidate(value)

  for (let attempt = 0; attempt < 3; attempt++) {
    const encoded = encodeWin1252(current)
    if (!encoded) break

    let repaired
    try {
      repaired = decoder.decode(encoded)
    } catch {
      break
    }

    const repairedScore = scoreRepairCandidate(repaired)
    if (repairedScore <= bestScore) break

    best = repaired
    current = repaired
    bestScore = repairedScore
  }

  return best
}

// ── Deep-walk a parsed JSON value and repair every string ─────────────────
const repairValue = (value) => {
  if (typeof value === 'string') return repairMojibakeString(value)
  if (Array.isArray(value)) return value.map(repairValue)
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[repairMojibakeString(k)] = repairValue(v)
    }
    return out
  }
  return value
}

// ── Find files using a simple recursive search ───────────────────────────
import { readdirSync, statSync } from 'node:fs'

function findFiles(dir, filename) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findFiles(full, filename))
    } else if (entry.name === filename) {
      results.push(full)
    }
  }
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes('--dry-run')
const root = resolve(process.cwd(), 'src', 'app')

console.log(`Scanning for features.json files under ${root} …`)
if (dryRun) console.log('  (dry-run mode — no files will be written)\n')

const files = findFiles(root, 'features.json')
let totalFixed = 0
let filesFixed = 0

for (const filePath of files) {
  const rel = relative(process.cwd(), filePath)
  const raw = await readFile(filePath, 'utf-8')

  // Quick check: does the file contain mojibake indicators?
  if (!MOJIBAKE_PATTERN.test(raw)) continue

  const parsed = JSON.parse(raw)
  const repaired = repairValue(parsed)
  const repairedJson = JSON.stringify(repaired, null, 2) + '\n'

  if (repairedJson === raw) {
    console.log(`  [skip] ${rel} — no changes after repair`)
    continue
  }

  // Count changed strings for reporting
  const originalStrings = JSON.stringify(parsed)
  const repairedStrings = JSON.stringify(repaired)
  let changedCount = 0
  const origLines = raw.split('\n')
  const newLines = repairedJson.split('\n')
  for (let i = 0; i < Math.max(origLines.length, newLines.length); i++) {
    if (origLines[i] !== newLines[i]) changedCount++
  }

  if (!dryRun) {
    await writeFile(filePath, repairedJson, 'utf-8')
  }

  console.log(
    `  [${dryRun ? 'would fix' : 'fixed'}] ${rel} — ${changedCount} lines changed`,
  )
  totalFixed += changedCount
  filesFixed++
}

console.log(
  `\nDone. ${filesFixed} file(s), ${totalFixed} lines ${dryRun ? 'would be ' : ''}repaired.`,
)

#!/usr/bin/env node
/**
 * fix-all-mojibake.mjs
 *
 * Repairs ALL mojibake (double/triple-encoded UTF-8 interpreted as Windows-1252)
 * in source files (.ts, .tsx, .json) under src/.
 *
 * Usage:  node src/scripts/fix-all-mojibake.mjs [--dry-run]
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative, extname } from 'node:path'
import { readdirSync } from 'node:fs'

// ── Windows-1252 special-range reverse map (0x80–0x9F) ────────────────────
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
  return null // can't encode
}

const utf8Decoder = new TextDecoder('utf-8', { fatal: true })

/**
 * Try to decode one layer of mojibake: interpret each char as its
 * Win-1252/Latin-1 byte value, then decode the resulting bytes as UTF-8.
 */
function tryDecodeOneLayer(str) {
  const bytes = []
  for (const ch of str) {
    const b = charToByte(ch)
    if (b === null) return null
    bytes.push(b)
  }
  try {
    const decoded = utf8Decoder.decode(new Uint8Array(bytes))
    return decoded !== str ? decoded : null
  } catch {
    return null
  }
}

/**
 * Iteratively decode up to 5 layers of mojibake.
 */
function repairFully(str) {
  if (!str) return str
  let current = str
  for (let i = 0; i < 5; i++) {
    const decoded = tryDecodeOneLayer(current)
    if (!decoded) break
    current = decoded
  }
  return current
}

// ── Broad mojibake detection ──────────────────────────────────────────────
// Matches any sequence where a Latin char in C0-EF range (UTF-8 lead bytes)
// is followed by chars whose byte values would be in the 80-BF range
// (UTF-8 continuation bytes). This catches ALL double-encoded UTF-8.

// Win-1252 chars that map to bytes 0x80-0x9F:
const WIN1252_CONT_CHARS = '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178'
// Latin-1 chars at 0xA0-0xBF: \u00A0-\u00BF (non-breaking space through ¿)
// Combined: any char whose Win-1252/Latin-1 byte would be in 0x80-0xBF
const CONT_BYTE_CHARS = `[\\u0080-\\u00BF${WIN1252_CONT_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`
// Lead bytes for 2-byte UTF-8: 0xC0-0xDF → Latin chars À-ß
// Lead bytes for 3-byte UTF-8: 0xE0-0xEF → Latin chars à-ï
const MOJIBAKE_RE = new RegExp(
  `[\\u00C0-\\u00DF]${CONT_BYTE_CHARS}|[\\u00E0-\\u00EF]${CONT_BYTE_CHARS}{2}`,
  'u'
)

function hasMojibake(str) {
  return MOJIBAKE_RE.test(str)
}

// ── Deep-walk a parsed JSON value and repair every string ─────────────────
function repairJsonValue(value) {
  if (typeof value === 'string') return repairFully(value)
  if (Array.isArray(value)) return value.map(repairJsonValue)
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[repairFully(k)] = repairJsonValue(v)
    }
    return out
  }
  return value
}

// ── For TS/TSX: repair string literals within quotes ──────────────────────
function repairSourceLine(line) {
  return line.replace(
    /(['"`])((?:[^'"`\\]|\\.)*)(['"`])/g,
    (match, openQuote, content, closeQuote) => {
      if (openQuote !== closeQuote) return match
      if (!hasMojibake(content)) return match
      const repaired = repairFully(content)
      if (repaired === content) return match
      return `${openQuote}${repaired}${closeQuote}`
    }
  )
}

// ── Find files recursively ───────────────────────────────────────────────
function findFiles(dir, extensions) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      results.push(...findFiles(full, extensions))
    } else if (extensions.includes(extname(entry.name))) {
      results.push(full)
    }
  }
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes('--dry-run')
const root = resolve(process.cwd(), 'src')

console.log(`Scanning for mojibake in ${root} …`)
if (dryRun) console.log('  (dry-run mode — no files will be written)\n')

const files = findFiles(root, ['.ts', '.tsx', '.json'])
let totalFixed = 0
let filesFixed = 0

for (const filePath of files) {
  const rel = relative(process.cwd(), filePath)
  const raw = await readFile(filePath, 'utf-8')

  if (!hasMojibake(raw)) continue

  const ext = extname(filePath)
  let repairedContent

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(raw)
      const repaired = repairJsonValue(parsed)
      // Detect original formatting (compact vs pretty)
      const isCompact = !raw.startsWith('{\n') && !raw.startsWith('[\n')
      if (isCompact) {
        repairedContent = JSON.stringify(repaired)
      } else {
        const indentMatch = raw.match(/^(\s+)"/m)
        const indent = indentMatch ? indentMatch[1].length : 2
        repairedContent = JSON.stringify(repaired, null, indent) + '\n'
      }
    } catch (e) {
      console.log(`  [error] ${rel} — failed to parse JSON: ${e.message}`)
      continue
    }
  } else {
    const lines = raw.split('\n')
    const repairedLines = lines.map(repairSourceLine)
    repairedContent = repairedLines.join('\n')
  }

  if (repairedContent === raw) continue

  const origLines = raw.split('\n')
  const newLines = repairedContent.split('\n')
  let changedCount = 0
  for (let i = 0; i < Math.max(origLines.length, newLines.length); i++) {
    if (origLines[i] !== newLines[i]) changedCount++
  }

  if (changedCount === 0) continue

  if (!dryRun) {
    await writeFile(filePath, repairedContent, 'utf-8')
  }

  console.log(`  [${dryRun ? 'would fix' : 'fixed'}] ${rel} — ${changedCount} lines changed`)
  totalFixed += changedCount
  filesFixed++
}

console.log(`\nDone. ${filesFixed} file(s), ${totalFixed} lines ${dryRun ? 'would be ' : ''}repaired.`)

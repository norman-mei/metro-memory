#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

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

const MOJIBAKE_PATTERN = /[\u00c2\u00c3\u00c5\u00c6\u00cb\u00d0\u00d8\u00e2\u00e3\u00e5\u00e6\u00e7]/u
const REPAIR_BONUS_PATTERN =
  /[\u00df\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2122\u2264\u23ce\u2605]|[\u3400-\u9fff]/gu

const decoder = new TextDecoder('utf-8', { fatal: true })

const ROOT = process.cwd()
const TARGETS = [
  'src/components',
  'src/hooks',
  'src/lib',
  'city-registry',
  'scripts',
  'package.json',
  'src/app/(game)/_placeholder',
  'src/app/(game)/asia/japan/osaka-kobe/page.tsx',
  'src/app/(game)/north-america/usa/nyc/regional-rail/config.ts',
]
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md'])

const countMatches = (value, pattern) => value.match(pattern)?.length ?? 0

const scoreRepairCandidate = (value) =>
  countMatches(value, /[\u3400-\u9fff]/gu) * 10 +
  countMatches(value, REPAIR_BONUS_PATTERN) * 3 -
  countMatches(value, /[\u00c2\u00c3\u00c5\u00c6\u00cb\u00d0\u00d8\u00e2\u00e3\u00e5\u00e6\u00e7]/gu) *
    2

const encodeWin1252 = (value) => {
  const bytes = []
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
  return Buffer.from(bytes)
}

const repairMojibakeString = (value) => {
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

const repairMojibakeContent = (content) => {
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  const repaired = content
    .split(/\r?\n/)
    .map((line) => repairMojibakeString(line))
    .join(newline)
  if (/\r?\n$/.test(content)) {
    return repaired.endsWith(newline) ? repaired : `${repaired}${newline}`
  }
  return repaired
}

const collectFiles = (targetPath) => {
  const absolutePath = path.join(ROOT, targetPath)
  if (!fs.existsSync(absolutePath)) {
    return []
  }

  const stats = fs.statSync(absolutePath)
  if (stats.isFile()) {
    return [absolutePath]
  }

  const results = []
  const walk = (currentPath) => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        walk(entryPath)
        continue
      }
      if (EXTENSIONS.has(path.extname(entry.name))) {
        results.push(entryPath)
      }
    }
  }

  walk(absolutePath)
  return results
}

const scanFiles = ({ write = false } = {}) => {
  const issues = []
  const updatedFiles = []

  for (const target of TARGETS) {
    for (const filePath of collectFiles(target)) {
      const relativePath = path.relative(ROOT, filePath)
      const originalContent = fs.readFileSync(filePath, 'utf8')
      const repairedContent = repairMojibakeContent(originalContent)

      if (write && repairedContent !== originalContent) {
        fs.writeFileSync(filePath, repairedContent, 'utf8')
        updatedFiles.push(relativePath)
      }

      const originalLines = originalContent.split(/\r?\n/)
      const repairedLines = repairedContent.split(/\r?\n/)
      repairedLines.forEach((line, index) => {
        const originalLine = originalLines[index] ?? ''
        if (line !== originalLine) {
          issues.push({
            filePath: relativePath,
            lineNumber: index + 1,
            original: originalLine.trim(),
            repaired: line.trim(),
          })
        }
      })
    }
  }

  return { issues, updatedFiles }
}

const main = () => {
  const write = process.argv.includes('--write')
  const { issues, updatedFiles } = scanFiles({ write })

  if (write && updatedFiles.length > 0) {
    console.log(`Applied mojibake repairs to ${updatedFiles.length} file(s).`)
    updatedFiles.forEach((filePath) => {
      console.log(`- ${filePath}`)
    })
    return
  }

  if (issues.length > 0) {
    console.error('Repairable mojibake detected in source files:')
    issues.forEach(({ filePath, lineNumber, original, repaired }) => {
      console.error(`- ${filePath}:${lineNumber}`)
      console.error(`  current: ${original}`)
      console.error(`  repair : ${repaired}`)
    })
    process.exit(1)
  }

  console.log('No repairable mojibake detected in guarded source files.')
}

if (require.main === module) {
  main()
}

module.exports = {
  repairMojibakeString,
  repairMojibakeContent,
  scanFiles,
}

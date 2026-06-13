import fs from 'fs'
import path from 'path'

import {
  extractChineseStationNameContext,
  normalizeChineseStationDisplayName,
} from '../src/lib/chineseStationNameNormalization.ts'

const ROOT = process.cwd()
const CHINA_GAME_DIR = path.join(ROOT, 'src', 'app', '(game)', 'asia', 'china')
const DRY_RUN = process.argv.includes('--dry-run')

const STRING_KEYS = ['name', 'display_name', 'long_name', 'short_name'] as const

type FeatureCollection = {
  features?: Array<{
    properties?: Record<string, unknown>
  }>
}

type Change = {
  file: string
  before: string
  after: string
}

const normalizeStringValue = (value: string, chineseContext?: string) =>
  normalizeChineseStationDisplayName(value, chineseContext)

const normalizeFeatureCollection = (filePath: string) => {
  const raw = fs.readFileSync(filePath, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const isMinified = !raw.includes('\n')
  const data = JSON.parse(raw) as FeatureCollection
  const changes: Change[] = []

  ;(data.features ?? []).forEach((feature) => {
    const properties = feature.properties
    if (!properties) {
      return
    }

    const contextCandidates = STRING_KEYS.map((key) =>
      typeof properties[key] === 'string'
        ? extractChineseStationNameContext(properties[key])
        : '',
    ).filter(Boolean)
    const chineseContext = contextCandidates.sort((a, b) => b.length - a.length)[0] ?? ''

    STRING_KEYS.forEach((key) => {
      const value = properties[key]
      if (typeof value !== 'string') {
        return
      }
      const normalized = normalizeStringValue(value, chineseContext)
      if (normalized !== value) {
        changes.push({
          file: filePath,
          before: value,
          after: normalized,
        })
        properties[key] = normalized
      }
    })

  })

  if (changes.length > 0 && !DRY_RUN) {
    const serialized = isMinified ? JSON.stringify(data) : JSON.stringify(data, null, 2)
    fs.writeFileSync(filePath, `${serialized.replace(/\n/g, eol)}${isMinified ? '' : eol}`, 'utf8')
  }

  return changes
}

const collectFeatureFiles = () => {
  if (!fs.existsSync(CHINA_GAME_DIR)) {
    return []
  }

  return fs
    .readdirSync(CHINA_GAME_DIR)
    .map((city) => path.join(CHINA_GAME_DIR, city, 'data', 'features.json'))
    .filter((filePath) => fs.existsSync(filePath))
}

const allChanges = collectFeatureFiles().flatMap((filePath) =>
  normalizeFeatureCollection(filePath),
)

const grouped = new Map<string, Change[]>()
allChanges.forEach((change) => {
  const relative = path.relative(ROOT, change.file)
  const entries = grouped.get(relative) ?? []
  entries.push(change)
  grouped.set(relative, entries)
})

console.log(
  `${DRY_RUN ? 'Would update' : 'Updated'} ${grouped.size} files and ${allChanges.length} strings.`,
)

Array.from(grouped.entries())
  .sort(([left], [right]) => left.localeCompare(right))
  .forEach(([file, changes]) => {
    console.log(`\n${file}`)
    changes.slice(0, 25).forEach((change) => {
      console.log(`  ${change.before} -> ${change.after}`)
    })
    if (changes.length > 25) {
      console.log(`  ... ${changes.length - 25} more`)
    }
  })

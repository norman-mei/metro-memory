import fs from 'fs'
import path from 'path'

import type { LineSpec, Registry } from './types.ts'

const ROOT = process.cwd()
const GAME_ROOT = path.join(ROOT, 'src', 'app', '(game)')
const CITY_PATH_MAP_PATH = path.join(ROOT, 'src', 'lib', 'cityPathMap.ts')

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const splitCamelCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')

const normalizeKeyword = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

const toDisplayValue = (value: string) =>
  normalizeWhitespace(
    splitCamelCase(value)
      .replace(/_/g, ' ')
      .replace(/\s*\(([^)]+)\)\s*/g, ' $1 ')
      .replace(/\s+/g, ' '),
  )

const removeParenthetical = (value: string) =>
  normalizeWhitespace(value.replace(/\s*\([^)]*\)\s*/g, ' '))

const dedupeKeywords = (values: string[]) => {
  const seen = new Set<string>()
  const output: string[] = []
  values.forEach((value) => {
    const trimmed = normalizeWhitespace(value)
    const key = normalizeKeyword(trimmed)
    if (!trimmed || !key || seen.has(key)) return
    seen.add(key)
    output.push(trimmed)
  })
  return output
}

const addNumericVariants = (values: Set<string>, value: string) => {
  const normalized = toDisplayValue(value)
  const numberMatches = Array.from(
    normalized.matchAll(
      /\b(?:line|route|tram|trolley|metro|subway|u|s)?\s*([A-Z]?\d+[A-Z]?|[A-Z])\b/gi,
    ),
  )

  numberMatches.forEach((match) => {
    const token = String(match[1] || '').toUpperCase()
    if (!token) return

    if (/^\d+[A-Z]?$/.test(token)) {
      values.add(`Line ${token}`)
      values.add(`${token} Line`)
      values.add(`Line${token}`)
      values.add(`L${token}`)
      values.add(`${token}号线`)
      values.add(`地铁${token}号线`)
      values.add(`${token}号線`)
      values.add(`${token}호선`)
      values.add(`Route ${token}`)
      values.add(`Tram Route ${token}`)
      return
    }

    if (/^[A-Z]$/.test(token)) {
      values.add(`Line ${token}`)
      values.add(`${token} Line`)
      values.add(`Route ${token}`)
    }
  })
}

const addNameVariants = (values: Set<string>, name: string) => {
  const normalized = toDisplayValue(name)
  if (!normalized) return

  values.add(normalized)

  const noParen = removeParenthetical(normalized)
  if (noParen && noParen !== normalized) {
    values.add(noParen)
  }

  const bare = normalized.replace(/\b(line|route|tram|trolley|metro|subway|railway)\b/gi, '').trim()
  if (bare && bare !== normalized && bare.length > 1) {
    values.add(normalizeWhitespace(bare))
  }

  if (/^[A-Za-z]+$/.test(normalized) && normalized.length >= 3) {
    values.add(`${normalized} Line`)
  }

  if (/^[A-Za-z]+\s+[A-Z]$/.test(normalized)) {
    values.add(`${normalized} Line`)
    values.add(normalized.replace(/\s+/g, '-'))
  }

  addNumericVariants(values, normalized)
}

export const generateLineKeywords = (line: Pick<LineSpec, 'id' | 'name' | 'keywords'>) => {
  const values = new Set<string>()

  ;(line.keywords || []).forEach((keyword) => addNameVariants(values, keyword))
  addNameVariants(values, line.name)
  addNameVariants(values, line.id)

  return dedupeKeywords(Array.from(values))
}

export const hydrateLineKeywordCoverage = (line: LineSpec): LineSpec => ({
  ...line,
  keywords: generateLineKeywords(line),
})

export const mergeRegistryLines = (registryLines: LineSpec[], gameLines: LineSpec[]) => {
  const merged = new Map<string, LineSpec>()

  gameLines.forEach((line) => {
    merged.set(line.id, hydrateLineKeywordCoverage(line))
  })

  registryLines.forEach((line) => {
    const existing = merged.get(line.id)
    if (!existing) {
      merged.set(line.id, hydrateLineKeywordCoverage(line))
      return
    }

    merged.set(line.id, {
      ...existing,
      ...line,
      name: line.name || existing.name,
      keywords: dedupeKeywords([
        ...(line.keywords || []),
        ...(existing.keywords || []),
      ]),
    })
  })

  return Array.from(merged.values()).sort((left, right) => {
    const leftOrder = typeof left.order === 'number' ? left.order : Number.MAX_SAFE_INTEGER
    const rightOrder = typeof right.order === 'number' ? right.order : Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return left.name.localeCompare(right.name)
  })
}

const parseExportedObject = (filePath: string, exportName: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const pattern = new RegExp(
    `export const ${exportName}(?::[^=]+)? = (\\{[\\s\\S]*?\\n\\})`,
  )
  const match = source.match(pattern)
  if (!match) {
    throw new Error(`Failed to parse ${exportName} from ${filePath}`)
  }
  return new Function(`return ${match[1]}`)() as Record<string, string>
}

let cityPathMapCache: Record<string, string> | null = null

const getCityPathMap = () => {
  if (!cityPathMapCache) {
    cityPathMapCache = parseExportedObject(CITY_PATH_MAP_PATH, 'CITY_PATH_MAP')
  }
  return cityPathMapCache
}

const loadGameDataLines = (slug: string): LineSpec[] => {
  const cityPath = getCityPathMap()[slug]
  if (!cityPath) return []

  const linesPath = path.join(GAME_ROOT, cityPath, 'data', 'lines.json')
  if (!fs.existsSync(linesPath)) return []

  const raw = JSON.parse(fs.readFileSync(linesPath, 'utf8'))
  return Object.entries(raw).map(([id, info]: [string, any]) => ({
    id,
    name: info.name || id,
    keywords: generateLineKeywords({
      id,
      name: info.name || id,
      keywords: [],
    }),
    ...(typeof info.order === 'number' ? { order: info.order } : {}),
    ...(typeof info.icon === 'string' ? { icon: info.icon } : {}),
  }))
}

export const hydrateRegistryCoverage = (registry: Registry): Registry => ({
  ...registry,
  lines: mergeRegistryLines(registry.lines || [], loadGameDataLines(registry.city)),
})

import fs from 'fs'
import path from 'path'
import axios from 'axios'
import * as turf from '@turf/turf'
import sharp from 'sharp'
import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { autoApplyGreenLaneCandidatesForRun } from '../../src/lib/automationAutopilot.ts'
import {
  loadAutomationAdaptiveResearchContext,
  loadAutomationPolicyMetricContext,
} from '../../src/lib/automationAudit.ts'
import { persistSourceCitations } from '../../src/lib/automationProvenance.ts'
import { rememberArtifactSourceForCity } from '../../src/lib/automationResearchMemory.ts'
import {
  finalizeAutomationRuntime,
  getAutomationRuntimeSnapshot,
  getAutomationRuntimeCaps,
  recordArtifactsPersisted,
  recordAutomationObservation,
  resetAutomationRuntime,
} from '../../src/lib/automationRuntime.ts'

import {
  classifyImageSourcePolicy,
  normalizeHexColor,
  resolvePreferredLineColor,
  type ImageSourcePolicy,
} from './reviewHelpers'
import { buildBootstrapLineProposals, discoverBootstrapLineSeeds } from './bootstrap.ts'
import { clusterReviewCandidates } from './candidateClustering.ts'
import { extractOfficialArtifactFacts } from './officialFacts.ts'
import { buildGtfsDiffCandidates } from './gtfsDiff.ts'
import { generateLineKeywords } from './registryCoverage.ts'
import {
  persistClaimEvidenceGraph,
  scheduleFollowUpResearchRunsForRun,
} from './research.ts'
import {
  collectCityInputs,
  ensureDir,
  filterRegistriesByScope,
  isOpenFeature,
  loadRegistries,
} from './collect'
import { buildReviewCandidates } from './claim'
import { buildClaimPolicy } from './policy'
import { resolveRegistryResearchPlan } from './schedule'
import { suggestSourceEnrichment } from './sourceEnrichment.ts'
import { buildVerificationScoresWithGrounding, runBasicCityVerification } from './verify'
import type {
  CollectedArtifact,
  ConfigMetadata,
  ExtractedArtifactFact,
  Registry,
  Report,
  ReportCity,
  ReviewCandidate,
  ReviewSource,
  RichLineProposal,
  StationFeature,
} from './types'

const ROOT = process.cwd()
const REPORTS_DIR = path.join(ROOT, 'reports')
const REVIEW_ASSETS_DIR = path.join(ROOT, 'public', 'automation-review')

const DIST_THRESHOLD_METERS = 150

export type MetroSyncJobOptions = {
  scope?: string | null
  explicitCities?: string[]
  claimTypes?: string[]
  deepResearchMode?: 'off' | 'batch' | 'all'
  autoApplyGreen?: boolean
}

let activeRunOptions: MetroSyncJobOptions | null = null

const resolveConfiguredScope = () => activeRunOptions?.scope || process.env.METRO_SYNC_SCOPE || 'all'

const resolveConfiguredExplicitCities = () =>
  activeRunOptions?.explicitCities?.length
    ? activeRunOptions.explicitCities
    : String(process.env.METRO_SYNC_CITY_SLUGS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

const resolveConfiguredClaimTypes = () =>
  activeRunOptions?.claimTypes?.length
    ? activeRunOptions.claimTypes
    : String(process.env.METRO_SYNC_CLAIM_TYPES || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

const resolveConfiguredDeepResearchMode = () =>
  activeRunOptions?.deepResearchMode || process.env.METRO_SYNC_DEEP_RESEARCH_MODE || 'batch'

const resolveConfiguredAutoApplyGreen = () =>
  typeof activeRunOptions?.autoApplyGreen === 'boolean'
    ? activeRunOptions.autoApplyGreen
    : process.env.METRO_SYNC_AUTO_APPLY_GREEN === '1'

const parseClaimTypeFilter = () =>
  new Set(
    resolveConfiguredClaimTypes()
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
  )

const normalize = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

const collectNameCandidates = (props: Record<string, any>, localLanguages: string[]) => {
  const values = new Set<string>()
  const add = (val?: string) => {
    if (val && val.trim()) values.add(val.trim())
  }
  add(props.name)
  add(props['name:en'])
  if (props.ref) add(props.ref)

  Object.keys(props).forEach((key) => {
    if (key.startsWith('name:')) add(props[key])
  })

  localLanguages.forEach((lang) => {
    add(props[`name:${lang}`])
    add(props[`name:${lang}-Latn`])
    add(props[`name:${lang}-Hani`])
  })

  return Array.from(values)
}

const matchesKeywords = (props: Record<string, any>, keywords: string[], localLanguages: string[]) => {
  const candidates = collectNameCandidates(props, localLanguages).map(normalize)
  const keywordNorm = keywords.map(normalize)
  return candidates.some((candidate) =>
    keywordNorm.some(
      (keyword) =>
        candidate === keyword ||
        (keyword.length >= 4 && candidate.includes(keyword)) ||
        (candidate.length >= 4 && keyword.includes(candidate)),
    ),
  )
}

const selectMostCommon = (values: string[]) => {
  const counts = new Map<string, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1))
  let best = ''
  let bestCount = 0
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  })
  return best || null
}

const inferTextColor = (hex: string) => {
  const color = hex.replace('#', '')
  if (color.length !== 6) return '#000000'
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const brightness = r * 0.299 + g * 0.587 + b * 0.114
  return brightness >= 150 ? '#000000' : '#FFFFFF'
}

const darkenHexColor = (hex: string, factor = 0.52) => {
  const color = hex.replace('#', '')
  if (color.length !== 6) return hex
  const channels = [0, 2, 4].map((index) =>
    Math.max(0, Math.min(255, Math.round(parseInt(color.slice(index, index + 2), 16) * factor))),
  )
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

const toPascalCase = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const buildLineId = (city: string, lineName: string) => {
  const cityId = toPascalCase(city)
  const lineId = toPascalCase(lineName)
  return `${cityId}${lineId}`.slice(0, 80)
}

const rgbToHex = (rgb: [number, number, number]) =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase()

const extractDominantTransitColor = async (buffer: Buffer) => {
  const image = sharp(buffer)
  const { data, info } = await image
    .rotate()
    .resize(96, 96, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const buckets = new Map<string, { rgb: [number, number, number]; weight: number }>()

  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const alpha = data[index + 3] / 255
    if (alpha < 0.5) continue

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    const saturation = max === 0 ? 0 : delta / max
    const brightness = (r + g + b) / 3

    if (brightness > 245 || brightness < 18) continue
    if (saturation < 0.2) continue

    const quantized: [number, number, number] = [
      Math.round(r / 16) * 16,
      Math.round(g / 16) * 16,
      Math.round(b / 16) * 16,
    ]
    const key = quantized.join(',')
    const weight = (0.5 + saturation) * alpha
    const existing = buckets.get(key)
    if (existing) {
      existing.weight += weight
    } else {
      buckets.set(key, { rgb: quantized, weight })
    }
  }

  const ranked = Array.from(buckets.values()).sort((left, right) => right.weight - left.weight)
  if (ranked.length > 0) {
    return rgbToHex(ranked[0].rgb)
  }

  const stats = await sharp(buffer).stats()
  const dominant: [number, number, number] = [
    stats.dominant.r,
    stats.dominant.g,
    stats.dominant.b,
  ]
  return rgbToHex(dominant)
}

const sampleIconColor = async (iconPath: string) => {
  const full = path.join(ROOT, 'public', 'images', iconPath)
  if (!fs.existsSync(full)) return null
  const img = sharp(full)
  const stats = await img.stats()
  const { r, g, b } = stats.dominant
  const hex = `#${[r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`
  return hex.toUpperCase()
}

const buildLinesJson = async (
  registry: Registry,
  lineFeatures: any[],
  existingLines: Record<string, any>,
  reportCity: ReportCity,
) => {
  const localLanguages = registry.localLanguages || []
  const output: Record<string, any> = {}

  for (const line of registry.lines) {
    if (!line.keywords || line.keywords.length === 0) {
      reportCity.lineErrors.push(`Line ${line.id} has no keywords; skipping`)
      continue
    }
    const matching = lineFeatures.filter((f) => {
      const props = f.properties || {}
      return matchesKeywords(props, line.keywords, localLanguages)
    })

    if (matching.length < 2) {
      reportCity.lineErrors.push(
        `Line ${line.id} expected multiple line strings; found ${matching.length}`,
      )
      continue
    }

    const colorCandidates: string[] = []
    matching.forEach((f) => {
      const props = f.properties || {}
      ;['colour', 'color', 'line_colour'].forEach((key) => {
        const val = props[key]
        if (val && /^#?[0-9a-fA-F]{6}$/.test(val)) {
          colorCandidates.push(val.startsWith('#') ? val : `#${val}`)
        }
      })
    })

    let color = selectMostCommon(colorCandidates)

    if (!color && existingLines?.[line.id]?.color) {
      color = existingLines[line.id].color
    }

    if (!color && existingLines?.[line.id]?.icon) {
      color = await sampleIconColor(existingLines[line.id].icon)
    }

    if (!color) {
      reportCity.colorWarnings.push(
        `Missing color for ${line.id}; needs manual update`,
      )
      color = '#888888'
    }

    const icon = existingLines?.[line.id]?.icon || line.icon || undefined
    const order =
      typeof line.order === 'number'
        ? line.order
        : registry.lines.findIndex((item) => item.id === line.id)

    output[line.id] = {
      name: line.name,
      color,
      backgroundColor: color,
      textColor: inferTextColor(color),
      order: order >= 0 ? order : 0,
      ...(icon ? { icon } : {}),
    }
  }

  return output
}

const buildLineGeometries = (lineFeatures: any[], registry: Registry) => {
  const localLanguages = registry.localLanguages || []
  const geometries: Record<string, any[]> = {}

  for (const line of registry.lines) {
    if (!line.keywords || line.keywords.length === 0) {
      geometries[line.id] = []
      continue
    }
    const matched = lineFeatures.filter((f) => {
      const props = f.properties || {}
      return matchesKeywords(props, line.keywords, localLanguages)
    })

    geometries[line.id] = matched
  }
  return geometries
}

const buildRoutesJson = (lineGeoms: Record<string, any[]>, linesJson: Record<string, any>) => {
  const features: any[] = []
  Object.entries(lineGeoms).forEach(([lineId, geoms]) => {
    geoms.forEach((f) => {
      features.push({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
          line: lineId,
          color: linesJson[lineId]?.color,
          order: linesJson[lineId]?.order ?? 0,
        },
      })
    })
  })
  return { type: 'FeatureCollection', features }
}

const extractStations = (
  registry: Registry,
  lineGeoms: Record<string, any[]>,
  stationFeatures: any[],
  existingFeatures: any[],
  reportCity: ReportCity,
) => {
  const localLanguages = registry.localLanguages || []
  const aliases = registry.stationAliases || {}
  const stationLocalNames = registry.stationLocalNames || {}
  const manualCoords = registry.manualCoords || {}

  const existingByLineName = new Map<string, any>()
  const existingIds = new Map<string, number>()
  let maxId = -1
  existingFeatures.forEach((feature) => {
    const props = feature.properties || {}
    const key = `${props.line}|${props.name}`
    existingByLineName.set(key, feature)
    if (typeof props.id === 'number') maxId = Math.max(maxId, props.id)
  })

  const output: any[] = []

  const stationCandidates = stationFeatures.filter((f) => {
    const props = f.properties || {}
    if (!isOpenFeature(props)) return false
    return f.geometry?.type === 'Point'
  })

  Object.entries(lineGeoms).forEach(([lineId, geoms]) => {
    if (!geoms || geoms.length === 0) return

    const multiLine = {
      type: 'MultiLineString',
      coordinates: geoms
        .map((g) => {
          if (g.geometry?.type === 'LineString') return [g.geometry.coordinates]
          if (g.geometry?.type === 'MultiLineString') return g.geometry.coordinates
          return []
        })
        .flat(),
    }

    const lineStations: any[] = []

    stationCandidates.forEach((station) => {
      const props = station.properties || {}
      const name = props['name:en'] || props.name
      if (!name) return

      const point = turf.point(station.geometry.coordinates)
      const distance = turf.pointToLineDistance(point, multiLine as any, {
        units: 'meters',
      })

      if (distance <= DIST_THRESHOLD_METERS) {
        lineStations.push({ station, distance })
      }
    })

    const byName = new Map<string, any[]>()
    lineStations.forEach(({ station }) => {
      const props = station.properties || {}
      const rawName = props['name:en'] || props.name
      if (!rawName) return
      const canonical = aliases[rawName] || rawName
      const key = normalize(canonical)
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(station)
    })

    const collapsed: any[] = []
    byName.forEach((stations, key) => {
      // prefer station node if available
      const preferred = stations.find((s) => {
        const props = s.properties || {}
        return props.public_transport === 'station' || props.railway === 'station'
      })
      collapsed.push(preferred || stations[0])
    })

    // order by distance along line
    const ordered = collapsed
      .map((station) => {
        const point = turf.point(station.geometry.coordinates)
        const snap = turf.nearestPointOnLine(multiLine as any, point, {
          units: 'meters',
        })
        return { station, location: snap.properties?.location ?? 0 }
      })
      .sort((a, b) => a.location - b.location)

    ordered.forEach((entry, index) => {
      const station = entry.station
      const props = station.properties || {}
      const rawName = props['name:en'] || props.name
      if (!rawName) return
      const canonical = aliases[rawName] || rawName
      const canonicalKey = `${lineId}|${canonical}`

      const manualKey = `${lineId}|${canonical}`
      const manualOverride = manualCoords[manualKey]

      const baseFeature: StationFeature = {
        type: 'Feature',
        geometry: manualOverride
          ? { type: 'Point', coordinates: manualOverride[0] }
          : station.geometry,
        properties: {
          name: canonical,
          line: lineId,
          order: index,
        },
      }

      const alternates = new Set<string>()
      alternates.add(canonical)
      if (props.name) alternates.add(props.name)
      if (props['name:en']) alternates.add(props['name:en'])
      const localOverrides = stationLocalNames[canonical]
      if (localOverrides && localOverrides.length) {
        localOverrides.forEach((name) => alternates.add(name))
      }
      localLanguages.forEach((lang) => {
        if (props[`name:${lang}`]) alternates.add(props[`name:${lang}`])
        if (props[`name:${lang}-Latn`]) alternates.add(props[`name:${lang}-Latn`])
      })

      const altNames = Array.from(alternates).filter(Boolean)

      const existing = existingByLineName.get(canonicalKey)
      if (existing) {
        baseFeature.properties.id = existing.properties?.id
        baseFeature.id = existing.properties?.id
        baseFeature.geometry = manualOverride
          ? { type: 'Point', coordinates: manualOverride[0] }
          : station.geometry

        const oldCoords = JSON.stringify(existing.geometry?.coordinates)
        const newCoords = JSON.stringify(baseFeature.geometry?.coordinates)
        if (oldCoords !== newCoords) {
          reportCity.updatedStations.push(canonicalKey)
        }
      } else {
        maxId += 1
        baseFeature.properties.id = maxId
        baseFeature.id = maxId
        reportCity.newStations.push(canonicalKey)
      }

      baseFeature.properties.alternate_names = altNames

      output.push(baseFeature)
    })

    // ensure manual coordinates are included even if station missing from OSM
    Object.keys(manualCoords)
      .filter((key) => key.startsWith(`${lineId}|`))
      .forEach((key) => {
        const stationName = key.split('|')[1]
        const already = output.some((f) => {
          const p = f.properties || {}
          return p.line === lineId && p.name === stationName
        })
        if (already) return
        const coords = manualCoords[key]?.[0]
        if (!coords) return
        maxId += 1
        output.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            id: maxId,
            name: stationName,
            line: lineId,
            order: output.length,
            alternate_names: [
              stationName,
              ...(stationLocalNames[stationName] || []),
            ],
          },
          id: maxId,
        })
        reportCity.newStations.push(`${lineId}|${stationName}`)
      })
  })

  // keep removed stations for review
  existingFeatures.forEach((feature) => {
    const props = feature.properties || {}
    const key = `${props.line}|${props.name}`
    const stillExists = output.some((f) => {
      const p = f.properties || {}
      return `${p.line}|${p.name}` === key
    })
    if (!stillExists) {
      reportCity.removedStations.push(key)
      output.push(feature)
    }
  })

  return { type: 'FeatureCollection', features: output }
}

const suggestOperator = async (city: string, lineFeatures: any[]) => {
  const candidates: string[] = []
  lineFeatures.forEach((f) => {
    const props = f.properties || {}
    if (props.operator) candidates.push(props.operator)
    if (props.network) candidates.push(props.network)
  })
  const candidate = selectMostCommon(candidates)
  if (!candidate) return null

  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    return {
      value: candidate,
      verified: false,
      source: 'osm',
      sources: [createOsmSource(city, { candidate })],
    }
  }

  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google',
        q: `${candidate} ${city} metro operator`,
        api_key: apiKey,
      },
    })
    const results = res.data?.organic_results || []
    const verified = results.some((r: any) => {
      const text = `${r.title || ''} ${r.snippet || ''}`.toLowerCase()
      return text.includes(candidate.toLowerCase())
    })

    return {
      value: candidate,
      verified,
      source: 'osm+serpapi',
      sources: [
        createOsmSource(city, { candidate }),
        ...extractSerpSources(res.data),
      ],
    }
  } catch {
    return {
      value: candidate,
      verified: false,
      source: 'osm',
      sources: [createOsmSource(city, { candidate })],
    }
  }
}

const suggestHeaderSubheader = async (city: string, lineFeatures: any[]) => {
  const operators: string[] = []
  const networks: string[] = []
  lineFeatures.forEach((f) => {
    const props = f.properties || {}
    if (props.operator) operators.push(props.operator)
    if (props.network) networks.push(props.network)
  })

  const operator = selectMostCommon(operators)
  const network = selectMostCommon(networks)

  if (!operator && !network) return null

  let verified = false
  let source = 'osm'
  let sources = [createOsmSource(city)]

  if (operator && process.env.SERPAPI_API_KEY) {
    try {
      const data = await searchSerpApi(`${operator} ${city} metro operator`)
      const results = data?.organic_results || []
      verified = results.some((r: any) => {
        const text = `${r.title || ''} ${r.snippet || ''}`.toLowerCase()
        return text.includes(operator.toLowerCase())
      })
      source = 'osm+serpapi'
      sources = [createOsmSource(city), ...extractSerpSources(data)]
    } catch {
      source = 'osm'
    }
  }

  return {
    header: operator || network || 'Unknown Operator',
    subheader: operator && network ? network : undefined,
    verified,
    source,
    sources,
  }
}

const writeCityData = (
  city: string,
  linesJson: any,
  featuresJson: any,
  routesJson: any,
) => {
  if (process.env.METRO_SYNC_DRY_RUN === '1') return
  if (process.env.METRO_SYNC_APPLY !== '1') return
  const cityPath = path.join(ROOT, 'src', 'app', '(game)')
  const cityDir = findCityDir(cityPath, city)
  if (!cityDir) return

  const dataDir = path.join(cityDir, 'data')
  ensureDir(dataDir)

  fs.writeFileSync(path.join(dataDir, 'lines.json'), JSON.stringify(linesJson, null, 2))
  fs.writeFileSync(
    path.join(dataDir, 'features.json'),
    JSON.stringify(featuresJson, null, 2),
  )
  fs.writeFileSync(
    path.join(dataDir, 'routes.json'),
    JSON.stringify(routesJson, null, 2),
  )

  const publicDataPath = path.join(ROOT, 'public', 'city-data', `${city}.json`)
  ensureDir(path.dirname(publicDataPath))
  const publicJson = {
    features: featuresJson,
    routes: routesJson,
  }
  fs.writeFileSync(publicDataPath, JSON.stringify(publicJson, null, 0))
}

const findCityDir = (rootDir: string, city: string): string | null => {
  const segments = fs.readdirSync(rootDir)
  for (const segment of segments) {
    const base = path.join(rootDir, segment)
    if (!fs.statSync(base).isDirectory()) continue
    const nested = findCityDir(base, city)
    if (nested) return nested
  }
  const name = path.basename(rootDir)
  if (name === city) return rootDir
  return null
}

const loadExisting = (city: string) => {
  const cityDir = findCityDir(path.join(ROOT, 'src', 'app', '(game)'), city)
  if (!cityDir) return { lines: {}, features: [] as any[] }
  const dataDir = path.join(cityDir, 'data')
  const linesPath = path.join(dataDir, 'lines.json')
  const featuresPath = path.join(dataDir, 'features.json')

  const lines = fs.existsSync(linesPath)
    ? JSON.parse(fs.readFileSync(linesPath, 'utf8'))
    : {}
  const features = fs.existsSync(featuresPath)
    ? JSON.parse(fs.readFileSync(featuresPath, 'utf8')).features || []
    : []

  return { lines, features }
}

const loadCityConfigSource = (city: string) => {
  const cityDir = findCityDir(path.join(ROOT, 'src', 'app', '(game)'), city)
  if (!cityDir) return null
  const configPath = path.join(cityDir, 'config.ts')
  if (!fs.existsSync(configPath)) return null
  return fs.readFileSync(configPath, 'utf8')
}

const extractMetadataDescriptions = (configSource: string | null) => {
  if (!configSource) return null

  const metadataStart = configSource.indexOf('export const METADATA')
  if (metadataStart === -1) return null

  const metadataEndCandidates = [
    configSource.indexOf('export const MAP_CONFIG', metadataStart),
    configSource.indexOf('export const CITY_NAME', metadataStart),
  ].filter((value) => value !== -1)
  const metadataEnd =
    metadataEndCandidates.length > 0 ? Math.min(...metadataEndCandidates) : configSource.length
  const metadataBlock = configSource.slice(metadataStart, metadataEnd)
  const openGraphIndex = metadataBlock.indexOf('openGraph:')
  const topLevelBlock =
    openGraphIndex === -1 ? metadataBlock : metadataBlock.slice(0, openGraphIndex)
  const openGraphBlock =
    openGraphIndex === -1 ? '' : metadataBlock.slice(openGraphIndex)

  const topLevelDescriptionMatch = topLevelBlock.match(/description:\s*'([^']*)'/s)
  const openGraphDescriptionMatch = openGraphBlock.match(/description:\s*'([^']*)'/s)
  const topLevelTitleMatch = topLevelBlock.match(/title:\s*'([^']*)'/s)
  const openGraphTitleMatch = openGraphBlock.match(/title:\s*'([^']*)'/s)

  return {
    title: topLevelTitleMatch?.[1] || null,
    description: topLevelDescriptionMatch?.[1] || null,
    openGraphTitle: openGraphTitleMatch?.[1] || null,
    openGraphDescription: openGraphDescriptionMatch?.[1] || null,
  }
}

const createOsmSource = (
  city: string,
  metadata: Record<string, any> = {},
): ReviewSource => ({
  sourceType: 'osm',
  label: 'OpenStreetMap / Overpass',
  metadata: { city, ...metadata },
})

const getCityDir = (city: string) => findCityDir(path.join(ROOT, 'src', 'app', '(game)'), city)

const hasCityCardImage = (city: string) => {
  const cityDir = getCityDir(city)
  if (!cityDir) return false
  return fs.existsSync(path.join(cityDir, 'opengraph-image.jpg'))
}

const searchSerpApiImages = async (query: string) => {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) return null
  const res = await axios.get('https://serpapi.com/search.json', {
    params: {
      engine: 'google_images',
      q: query,
      api_key: apiKey,
    },
  })
  return res.data
}

const getExtensionFromUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const ext = path.extname(pathname).replace('.', '')
    if (['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) return ext
  } catch {
    // ignore
  }
  return 'png'
}

const stageReviewImage = async ({
  city,
  key,
  imageUrl,
  preferredExt,
}: {
  city: string
  key: string
  imageUrl: string
  preferredExt?: string
}) => {
  ensureDir(REVIEW_ASSETS_DIR)
  const cityDir = path.join(REVIEW_ASSETS_DIR, city)
  ensureDir(cityDir)

  const ext = preferredExt || getExtensionFromUrl(imageUrl)
  const hash = createHash('sha1').update(`${city}|${key}|${imageUrl}`).digest('hex').slice(0, 16)
  for (const existingExt of ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    const existingRepoPath = path.join('public', 'automation-review', city, `${hash}.${existingExt}`)
    const existingAbsolutePath = path.join(ROOT, existingRepoPath)
    if (fs.existsSync(existingAbsolutePath)) {
      const metadata = await sharp(existingAbsolutePath).metadata().catch(() => null)
      return {
        repoPath: existingRepoPath,
        publicPath: `/${existingRepoPath.replace(/^public\//, '')}`.replace(/\\/g, '/'),
        width: metadata?.width || null,
        height: metadata?.height || null,
        format: metadata?.format || existingExt,
      }
    }
  }

  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: 8 * 1024 * 1024,
    headers: {
      'User-Agent': 'MetroMemoryAutomation/1.0',
    },
  })

  const buffer = Buffer.from(response.data)
  let outputBuffer = buffer
  let outputExt = ext

  if (ext !== 'svg') {
    outputBuffer = await sharp(buffer)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
    outputExt = 'png'
  }

  const finalFilename = `${hash}.${outputExt}`
  const finalRepoPath = path.join('public', 'automation-review', city, finalFilename)
  const finalAbsolutePath = path.join(ROOT, finalRepoPath)
  ensureDir(path.dirname(finalAbsolutePath))
  fs.writeFileSync(finalAbsolutePath, outputBuffer)
  const metadata = await sharp(outputBuffer).metadata().catch(() => null)

  return {
    repoPath: finalRepoPath,
    publicPath: `/${finalRepoPath.replace(/^public\//, '')}`.replace(/\\/g, '/'),
    width: metadata?.width || null,
    height: metadata?.height || null,
    format: metadata?.format || outputExt,
  }
}

const pickBestImageResult = (results: any[], pattern?: RegExp) => {
  for (const result of results) {
    const candidateUrl = result.original || result.link || result.thumbnail
    if (!candidateUrl) continue
    const title = `${result.title || ''} ${result.source || ''}`
    if (!pattern || pattern.test(title)) return result
  }
  return results.find((result) => result.original || result.link || result.thumbnail) || null
}

const extractSerpSources = (data: any): ReviewSource[] => {
  const results = Array.isArray(data?.organic_results) ? data.organic_results : []
  return results.slice(0, 3).map((result: any) => ({
    sourceType: 'search',
    label: result.title || 'Search result',
    url: result.link,
    snippet: result.snippet,
  }))
}

const extractImageSources = (result: any, query: string): ReviewSource[] => {
  const sources: ReviewSource[] = [
    {
      sourceType: 'image-search',
      label: result.title || result.source || 'Image search result',
      url: result.link || result.original || result.thumbnail,
      snippet: result.source || query,
      metadata: {
        query,
        original: result.original,
        thumbnail: result.thumbnail,
      },
    },
  ]

  if (result.original && result.original !== result.link) {
    sources.push({
      sourceType: 'image-original',
      label: 'Original image',
      url: result.original,
      snippet: result.source,
    })
  }

  return sources
}

const buildCityCardImageCandidate = async (city: string, reportCity: ReportCity) => {
  if (!process.env.SERPAPI_API_KEY) return null
  if (hasCityCardImage(city) && reportCity.newStations.length === 0 && reportCity.newLines.length === 0) {
    return null
  }

  const query = `${city} metro map official`
  try {
    const data = await searchSerpApiImages(query)
    const results = Array.isArray(data?.images_results) ? data.images_results : []
    const result = pickBestImageResult(results, /map|metro|transit|rail/i)
    if (!result) return null

    const imageUrl = result.original || result.link || result.thumbnail
    if (!imageUrl) return null
    const sourcePolicy = classifyImageSourcePolicy(imageUrl, result)

    const staged = await stageReviewImage({
      city,
      key: `city-card-${query}`,
      imageUrl,
    })

    return {
      citySlug: city,
      type: 'IMAGE_CANDIDATE' as const,
      entityKey: `${city}|city-card`,
      title: `Review city card image for ${city}`,
      summary: 'Downloaded from image search and staged for human approval before replacing opengraph-image.jpg.',
      confidence: 0.52,
      afterValue: {
        targetKind: 'city_card',
        stagedRepoPath: staged.repoPath,
        stagedPublicPath: staged.publicPath,
        width: staged.width,
        height: staged.height,
        format: staged.format,
        sourceUrl: imageUrl,
        query,
      },
      metadata: {
        sourcePolicy,
      },
      diff: {
        change: 'replace-city-card',
      },
      sources: extractImageSources(result, query),
    } satisfies ReviewCandidate
  } catch (error: any) {
    reportCity.verificationNotes.push(
      `City card image search failed for ${city}: ${error?.message || error}`,
    )
    return null
  }
}

const buildLineKeywords = (props: Record<string, any>, lineName: string) => {
  return generateLineKeywords({
    id: buildLineId('candidate', lineName),
    name: lineName,
    keywords: [
      props.name,
      props['name:en'],
      props.ref,
      props.network,
      props.operator,
    ].filter((value): value is string => Boolean(value && String(value).trim())),
  })
}

const appendUniqueSources = (sources: ReviewSource[], nextSources: ReviewSource[]) => {
  const seen = new Set(
    sources.map((source) => [source.sourceType, source.url || '', source.label || ''].join('|')),
  )
  nextSources.forEach((source) => {
    const key = [source.sourceType, source.url || '', source.label || ''].join('|')
    if (seen.has(key)) return
    seen.add(key)
    sources.push(source)
  })
  return sources
}

const buildOfficialFactSources = (
  facts: ExtractedArtifactFact[],
  predicate: (fact: ExtractedArtifactFact) => boolean,
) =>
  facts
    .filter(predicate)
    .slice(0, 4)
    .map(
      (fact) =>
        ({
          sourceType: `official-${String(fact.kind).toLowerCase()}`,
          label: fact.label,
          url: fact.sourceUrl,
          snippet: fact.snippet,
          metadata: {
            extractedFactKind: fact.kind,
            artifactType: fact.artifactType,
            extractedFactConfidence: fact.confidence,
            sourcePolicyStatus: 'PREFERRED',
          },
        }) satisfies ReviewSource,
    )

const enrichCandidatesWithOfficialFacts = (
  candidates: ReviewCandidate[],
  facts: ExtractedArtifactFact[],
) =>
  candidates.map((candidate) => {
    const nextCandidate = {
      ...candidate,
      sources: [...candidate.sources],
      metadata: candidate.metadata && typeof candidate.metadata === 'object' ? { ...candidate.metadata } : {},
    }

    if (
      candidate.type === 'NEW_LINE' ||
      candidate.type === 'LINE_RENAME_CANDIDATE' ||
      candidate.type === 'LINE_COLOR_CANDIDATE'
    ) {
      const lineName =
        typeof candidate.afterValue?.name === 'string'
          ? candidate.afterValue.name
          : typeof candidate.beforeValue?.name === 'string'
            ? candidate.beforeValue.name
          : typeof candidate.diff?.lineName === 'string'
            ? candidate.diff.lineName
            : null
      if (lineName) {
        const matchedFacts = buildOfficialFactSources(
          facts,
          (fact) =>
            fact.lineName === lineName ||
            fact.kind === 'MAP_REFERENCE' ||
            (candidate.type === 'LINE_RENAME_CANDIDATE' && fact.kind === 'LINE_RENAME_REFERENCE') ||
            (candidate.type === 'LINE_COLOR_CANDIDATE' && fact.kind === 'LINE_COLOR_REFERENCE'),
        )
        appendUniqueSources(nextCandidate.sources, matchedFacts)
        if (matchedFacts.length > 0) {
          nextCandidate.metadata.officialFactCount = matchedFacts.length
          nextCandidate.metadata.likelyRealTransitLine = true
        }
      }
    } else if (
      candidate.type === 'NEW_STATION' ||
      candidate.type === 'UPDATED_STATION' ||
      candidate.type === 'REMOVED_STATION'
    ) {
      const stationName =
        candidate.afterValue?.properties?.name ||
        candidate.beforeValue?.properties?.name ||
        String(candidate.entityKey || '').split('|')[1] ||
        null
      const lineName =
        candidate.afterValue?.properties?.line ||
        candidate.beforeValue?.properties?.line ||
        String(candidate.entityKey || '').split('|')[0] ||
        null
      const matchedFacts = buildOfficialFactSources(
        facts,
        (fact) =>
          fact.kind === 'STATION_REFERENCE' &&
          String(fact.metadata?.stopName || '').trim() === String(stationName || '').trim() &&
          (!lineName || !fact.metadata?.lineName || String(fact.metadata.lineName).trim() === String(lineName).trim()),
      )
      appendUniqueSources(nextCandidate.sources, matchedFacts)
      if (matchedFacts.length > 0) {
        nextCandidate.metadata.officialFactCount = matchedFacts.length
      }
    } else if (
      candidate.type === 'OPERATOR_SUGGESTION' ||
      candidate.type === 'HEADER_SUGGESTION' ||
      candidate.type === 'METADATA_CANDIDATE' ||
      candidate.type === 'OPERATOR_METADATA_CANDIDATE'
    ) {
      const matchedFacts = buildOfficialFactSources(
        facts,
        (fact) =>
          fact.kind === 'OPERATOR_REFERENCE' ||
          fact.kind === 'OPERATOR_METADATA_REFERENCE' ||
          fact.kind === 'MAP_REFERENCE' ||
          fact.kind === 'OPENING_REFERENCE',
      )
      appendUniqueSources(nextCandidate.sources, matchedFacts)
      if (matchedFacts.length > 0) {
        nextCandidate.metadata.officialFactCount = matchedFacts.length
      }
    }

    return nextCandidate
  })

const buildRichLineProposal = async ({
  city,
  lineName,
  feature,
  order,
  reportCity,
}: {
  city: string
  lineName: string
  feature: any
  order: number
  reportCity: ReportCity
}): Promise<{ proposal: RichLineProposal; imageCandidate: ReviewCandidate | null }> => {
  const props = feature?.properties || {}
  const osmColor = normalizeHexColor(props.colour || props.color || props.line_colour)
  const lineId = buildLineId(city, lineName)
  let extractedColor: string | null = null
  let iconCandidate: ReviewCandidate | null = null

  if (process.env.SERPAPI_API_KEY) {
    try {
      const queries = [
        `${city} ${lineName} metro line icon`,
        `${city} ${lineName} metro map legend`,
      ]
      let result: any = null
      let query = queries[0]

      for (const candidateQuery of queries) {
        const data = await searchSerpApiImages(candidateQuery)
        const results = Array.isArray(data?.images_results) ? data.images_results : []
        result = pickBestImageResult(results, /icon|logo|bullet|line|metro|transit|map|legend/i)
        if (result) {
          query = candidateQuery
          break
        }
      }

      const imageUrl = result?.original || result?.link || result?.thumbnail
      if (result && imageUrl) {
        const sourcePolicy = classifyImageSourcePolicy(imageUrl, result)
        const staged = await stageReviewImage({
          city,
          key: `line-icon-${lineId}`,
          imageUrl,
        })
        const absolutePath = path.join(ROOT, staged.repoPath)
        const buffer = fs.readFileSync(absolutePath)
        extractedColor = await extractDominantTransitColor(buffer)
        const cityDir = getCityDir(city)
        const cityRelativePath = cityDir
          ? path.relative(path.join(ROOT, 'src', 'app', '(game)'), cityDir)
          : city
        const suggestedIconPath = path
          .join(cityRelativePath, `${lineId}.png`)
          .replace(/\\/g, '/')

        iconCandidate = {
          citySlug: city,
          type: 'IMAGE_CANDIDATE',
          entityKey: `${lineId}|line-icon`,
          title: `Review line icon for ${lineName}`,
          summary:
            'Downloaded line icon or legend candidate from image search. Extracted color is included for review.',
          confidence: 0.6,
          afterValue: {
            targetKind: 'line_icon',
            lineId,
            lineName,
            stagedRepoPath: staged.repoPath,
            stagedPublicPath: staged.publicPath,
            suggestedIconPath: suggestedIconPath.startsWith('public/')
              ? suggestedIconPath.replace(/^public\//, '')
              : suggestedIconPath,
            extractedColor,
            width: staged.width,
            height: staged.height,
            format: staged.format,
            sourceUrl: imageUrl,
            query,
          },
          metadata: {
            sourcePolicy,
          },
          diff: {
            change: 'add-line-icon',
            lineId,
          },
          sources: extractImageSources(result, query),
        }
      }
    } catch (error: any) {
      reportCity.verificationNotes.push(
        `Line image search failed for ${city}/${lineName}: ${error?.message || error}`,
      )
    }
  }

  const color = resolvePreferredLineColor(extractedColor, osmColor)
  const proposal: RichLineProposal = {
    id: lineId,
    name: lineName,
    keywords: buildLineKeywords(props, lineName),
    color,
    backgroundColor: darkenHexColor(color),
    textColor: inferTextColor(color),
    progressOutlineColor: color,
    order,
    sourceName: props.name || props['name:en'] || lineName,
    operator: props.operator,
    network: props.network,
    extractedColor: extractedColor || undefined,
    routeSample: {
      ref: props.ref,
      colour: props.colour || props.color || props.line_colour || null,
      operator: props.operator || null,
      network: props.network || null,
      route: props.route || null,
    },
    ...(iconCandidate?.afterValue?.suggestedIconPath
      ? { icon: iconCandidate.afterValue.suggestedIconPath }
      : {}),
    ...(iconCandidate?.afterValue?.stagedPublicPath
      ? {
          iconCandidatePublicPath: iconCandidate.afterValue.stagedPublicPath,
          iconCandidateRepoPath: iconCandidate.afterValue.stagedRepoPath,
          iconCandidateSourceUrl: iconCandidate.afterValue.sourceUrl,
        }
      : {}),
  }

  return { proposal, imageCandidate: iconCandidate }
}

const inferSourceDomain = (url?: string | null) => {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const inferSourceTier = (domain: string | null) => {
  if (!domain) return 'UNKNOWN' as const
  if (domain === 'overpass-api.de' || domain === 'openstreetmap.org') return 'OFFICIAL' as const
  if (domain.includes('google.') || domain === 'serpapi.com' || domain.includes('wikimedia.org')) {
    return 'ESTABLISHED' as const
  }
  return 'UNKNOWN' as const
}

const extractCandidateArtifacts = (candidate: ReviewCandidate): CollectedArtifact[] => {
  const artifacts: CollectedArtifact[] = []
  const afterValue = candidate.afterValue && typeof candidate.afterValue === 'object' ? candidate.afterValue : null
  const stagedRepoPath = afterValue?.stagedRepoPath
  const sourceUrl = afterValue?.sourceUrl

  if (typeof stagedRepoPath === 'string') {
    artifacts.push({
      citySlug: candidate.citySlug,
      artifactType: 'IMAGE_PREVIEW',
      sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined,
      sourceDomain: inferSourceDomain(typeof sourceUrl === 'string' ? sourceUrl : undefined) || undefined,
      mimeType: 'image/*',
      localPath: stagedRepoPath.replace(/\\/g, '/'),
      contentHash: createHash('sha256')
        .update(`${candidate.citySlug}|${candidate.entityKey || candidate.title}|${stagedRepoPath}`)
        .digest('hex'),
      fetchedAt: new Date().toISOString(),
      metadataJson: {
        candidateType: candidate.type,
        entityKey: candidate.entityKey || null,
      },
    })
  }

  candidate.sources.forEach((source) => {
    if (!source.url) return
    const sourceDomain = inferSourceDomain(source.url)
    artifacts.push({
      citySlug: candidate.citySlug,
      artifactType:
        candidate.type === 'IMAGE_CANDIDATE' || source.sourceType.includes('image')
          ? 'IMAGE_PREVIEW'
          : 'SEARCH_RESULT',
      sourceUrl: source.url,
      sourceDomain: sourceDomain || undefined,
      mimeType: candidate.type === 'IMAGE_CANDIDATE' ? 'image/*' : 'text/html',
      contentHash: createHash('sha256')
        .update(`${candidate.citySlug}|${source.url}|${source.sourceType}`)
        .digest('hex'),
      fetchedAt: new Date().toISOString(),
      metadataJson: {
        label: source.label || null,
        sourceType: source.sourceType,
      },
    })
  })

  return artifacts
}

const persistAutomationRun = async (
  report: Report,
  reportMarkdown: string,
  collectedArtifacts: CollectedArtifact[],
  reportPath: string,
  runtimeMetrics?: Record<string, any> | null,
) => {
  if (!process.env.DATABASE_URL) return null

  const prisma = new PrismaClient()
  const allCandidates = report.cities.flatMap((city) => city.candidates)

  try {
    let persistedCitationCount = 0
    const run = await prisma.automationRun.create({
      data: {
        source: 'metro-sync',
        scope: resolveConfiguredScope(),
        status: 'PENDING_REVIEW',
        startedAt: new Date(report.startedAt),
        finishedAt: report.finishedAt ? new Date(report.finishedAt) : null,
        reportMarkdown,
        summary: {
          citiesProcessed: report.cities.length,
          candidateCount: allCandidates.length,
          pendingCount: allCandidates.length,
          errorCount: report.errors.length,
          artifactCount: collectedArtifacts.length,
          runtimeMetrics: runtimeMetrics || null,
        },
        errorLog: report.errors,
      },
    })

    const reportArtifacts: CollectedArtifact[] = [
      {
        artifactType: 'REPORT_MARKDOWN',
        mimeType: 'text/markdown',
        localPath: path.relative(ROOT, reportPath).replace(/\\/g, '/'),
        contentHash: createHash('sha256').update(reportMarkdown).digest('hex'),
        fetchedAt: report.finishedAt || report.startedAt,
        metadataJson: {
          citiesProcessed: report.cities.length,
        },
      },
      ...collectedArtifacts,
      ...allCandidates.flatMap((candidate) => extractCandidateArtifacts(candidate)),
    ]

    const artifactIdsByKey = new Map<string, string>()
    const seenArtifactKeys = new Set<string>()
    for (const artifact of reportArtifacts) {
      const artifactKey = [
        artifact.citySlug || '',
        artifact.artifactType,
        artifact.localPath || '',
        artifact.sourceUrl || '',
        artifact.contentHash || '',
      ].join('|')
      if (seenArtifactKeys.has(artifactKey)) continue
      seenArtifactKeys.add(artifactKey)
      const createdArtifact = await prisma.automationArtifact.create({
        data: {
          runId: run.id,
          citySlug: artifact.citySlug,
          artifactType: artifact.artifactType,
          sourceUrl: artifact.sourceUrl,
          sourceDomain: artifact.sourceDomain,
          mimeType: artifact.mimeType,
          localPath: artifact.localPath,
          contentHash: artifact.contentHash,
          fetchedAt: artifact.fetchedAt ? new Date(artifact.fetchedAt) : null,
          metadataJson: artifact.metadataJson,
        },
      })
      recordArtifactsPersisted(1)
      artifactIdsByKey.set(artifactKey, createdArtifact.id)

      if (artifact.sourceUrl || artifact.sourceDomain) {
        await rememberArtifactSourceForCity(
          {
            citySlug: artifact.citySlug || 'global',
            domain: artifact.sourceDomain || null,
            sourceUrl: artifact.sourceUrl || null,
            artifactType: artifact.artifactType,
            title:
              artifact.metadataJson &&
              typeof artifact.metadataJson === 'object' &&
              'title' in artifact.metadataJson
                ? String((artifact.metadataJson as Record<string, unknown>).title || '')
                : null,
          },
          prisma,
        ).catch(() => null)
      }

      if (artifact.sourceDomain) {
        await prisma.automationSourceDomain.upsert({
          where: { domain: artifact.sourceDomain },
          update: {
            lastSeenAt: artifact.fetchedAt ? new Date(artifact.fetchedAt) : new Date(),
          },
          create: {
            domain: artifact.sourceDomain,
            tier: inferSourceTier(artifact.sourceDomain),
            lastSeenAt: artifact.fetchedAt ? new Date(artifact.fetchedAt) : new Date(),
          },
        })
      }
    }

    const policyMetricContext = await loadAutomationPolicyMetricContext(prisma, {
      domains: allCandidates.flatMap((candidate) =>
        candidate.sources
          .map((source) => inferSourceDomain(source.url))
          .filter((value): value is string => Boolean(value)),
      ),
      cities: allCandidates.map((candidate) => candidate.citySlug),
      claimTypes: allCandidates.map((candidate) => candidate.type),
    })
    const adaptiveResearchContext = await loadAutomationAdaptiveResearchContext(prisma, {
      domains: allCandidates.flatMap((candidate) =>
        candidate.sources
          .map((source) => inferSourceDomain(source.url))
          .filter((value): value is string => Boolean(value)),
      ),
      cities: allCandidates.map((candidate) => candidate.citySlug),
      claimTypes: allCandidates.map((candidate) => candidate.type),
    })

    for (const candidate of allCandidates) {
      const candidateRecord = await prisma.automationCandidate.create({
        data: {
          runId: run.id,
          citySlug: candidate.citySlug,
          type: candidate.type,
          entityKey: candidate.entityKey,
          title: candidate.title,
          summary: candidate.summary,
          confidence: candidate.confidence,
          beforeValue: candidate.beforeValue,
          afterValue: candidate.afterValue,
          diff: candidate.diff,
          metadata: candidate.metadata,
          sources: {
            create: candidate.sources.map((source) => ({
              sourceType: source.sourceType,
              label: source.label,
              url: source.url,
              snippet: source.snippet,
              metadata: source.metadata,
            })),
          },
        },
      })

      const verification = await buildVerificationScoresWithGrounding(candidate)
      const candidateDomains = candidate.sources
        .map((source) => inferSourceDomain(source.url))
        .filter((value): value is string => Boolean(value))
      const domainTrustScores = candidateDomains
        .map((domain) => policyMetricContext.domainMetrics.get(domain))
        .filter((value): value is { trustScore: number; blocked: boolean } => Boolean(value))
      const policy = buildClaimPolicy(candidate, verification, {
        domainTrustScore:
          domainTrustScores.length > 0
            ? Math.min(...domainTrustScores.map((metric) => metric.trustScore))
            : undefined,
        domainBlocked: domainTrustScores.some((metric) => metric.blocked),
        cityTrustScore: policyMetricContext.cityMetrics.get(candidate.citySlug)?.trustScore,
        claimTypeTrustScore: policyMetricContext.claimTypeMetrics.get(candidate.type)?.trustScore,
        cityCoolingPenalty: adaptiveResearchContext.cityCoolingPenalties.get(candidate.citySlug),
        claimTypeScoreAdjustment:
          adaptiveResearchContext.claimTypeScoreAdjustments.get(candidate.type),
        forcedLane:
          (policyMetricContext.claimTypeMetrics.get(candidate.type)?.forcedLane as
            | 'GREEN'
            | 'YELLOW'
            | 'RED'
            | null
            | undefined) || null,
      })
      const claimArtifactIds = reportArtifacts
        .filter((artifact) => artifact.citySlug === candidate.citySlug)
        .filter((artifact) => {
          if (artifact.artifactType === 'OSM_OVERPASS' && candidate.sources.some((source) => source.sourceType === 'osm')) {
            return true
          }
          if (
            ['GTFS_FEED', 'OFFICIAL_PAGE', 'PRESS_RELEASE', 'MAP_PDF'].includes(
              artifact.artifactType,
            ) &&
            [
              'NEW_LINE',
              'LINE_RENAME_CANDIDATE',
              'LINE_COLOR_CANDIDATE',
              'OPERATOR_SUGGESTION',
              'HEADER_SUGGESTION',
              'METADATA_CANDIDATE',
              'OPERATOR_METADATA_CANDIDATE',
            ].includes(candidate.type)
          ) {
            return true
          }
          if (artifact.sourceUrl && candidate.sources.some((source) => source.url === artifact.sourceUrl)) {
            return true
          }
          const stagedRepoPath = candidate.afterValue?.stagedRepoPath
          return typeof stagedRepoPath === 'string' && artifact.localPath === stagedRepoPath
        })
        .map((artifact) =>
          artifactIdsByKey.get(
            [
              artifact.citySlug || '',
              artifact.artifactType,
              artifact.localPath || '',
              artifact.sourceUrl || '',
              artifact.contentHash || '',
            ].join('|'),
          ),
        )
        .filter((value): value is string => !!value)

      const createdClaim = await prisma.automationClaim.create({
        data: {
          runId: run.id,
          candidateId: candidateRecord.id,
          citySlug: candidate.citySlug,
          claimType: candidate.type,
          title: candidate.title,
          summary: candidate.summary,
          beforeValueJson: candidate.beforeValue,
          afterValueJson: candidate.afterValue,
          reason: candidate.summary || candidate.title,
          confidence: candidate.confidence,
          lane: policy.lane,
          status: 'PENDING_REVIEW',
          autoApplyEligible: policy.autoApplyAllowed,
          verificationNotes: {
            reportNotes: report.cities.find((city) => city.city === candidate.citySlug)?.verificationNotes || [],
          },
          metadataJson: {
            entityKey: candidate.entityKey || null,
            diff: candidate.diff || null,
            metadata: candidate.metadata || null,
            candidateId: candidateRecord.id,
          },
          artifactLinks: {
            create: claimArtifactIds.map((artifactId) => ({
              artifactId,
            })),
          },
          verifications: {
            create: verification,
          },
          policyDecisions: {
            create: policy,
          },
        },
      })

      await persistClaimEvidenceGraph(prisma, {
        claimId: createdClaim.id,
        claimTitle: candidate.title,
        claimType: candidate.type,
        candidate,
        artifactIds: claimArtifactIds,
        verificationJson:
          verification.verificationJson && typeof verification.verificationJson === 'object'
            ? (verification.verificationJson as Record<string, any>)
            : null,
      })

      const artifactIdBySourceUrl = new Map(
        reportArtifacts
          .map((artifact) => {
            if (!artifact.sourceUrl) return null
            const artifactId = artifactIdsByKey.get(
              [
                artifact.citySlug || '',
                artifact.artifactType,
                artifact.localPath || '',
                artifact.sourceUrl || '',
                artifact.contentHash || '',
              ].join('|'),
            )
            return artifactId ? ([artifact.sourceUrl, artifactId] as const) : null
          })
          .filter((value): value is readonly [string, string] => Boolean(value)),
      )
      persistedCitationCount += await persistSourceCitations({
        db: prisma,
        claimId: createdClaim.id,
        sources: candidate.sources,
        artifactIdBySourceUrl,
      })
    }

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        summary: {
          ...(typeof run.summary === 'object' && run.summary ? (run.summary as object) : {}),
          citationCount: persistedCitationCount,
          runtimeMetrics: runtimeMetrics || null,
        },
      },
    })

    return run.id
  } finally {
    await prisma.$disconnect()
  }
}

const updateAutomationRunRuntimeMetrics = async (
  runId: string,
  runtimeMetrics: Record<string, any> | null,
) => {
  if (!process.env.DATABASE_URL || !runId || !runtimeMetrics) return
  const prisma = new PrismaClient()
  try {
    const run = await prisma.automationRun.findUnique({
      where: { id: runId },
      select: { summary: true },
    })
    if (!run) return

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        summary: {
          ...(typeof run.summary === 'object' && run.summary ? (run.summary as object) : {}),
          runtimeMetrics,
        },
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

const buildReportMarkdown = (report: Report) => {
  const lines = [] as string[]
  lines.push(`# Metro Sync Report`)
  lines.push(`Started: ${report.startedAt}`)
  if (report.finishedAt) lines.push(`Finished: ${report.finishedAt}`)
  lines.push('')

  report.cities.forEach((city) => {
    lines.push(`## ${city.city}`)
    lines.push(`- Lines processed: ${city.linesProcessed}`)
    if (city.newLines.length) lines.push(`- New line candidates: ${city.newLines.join(', ')}`)
    if (city.richLineProposals.length) {
      lines.push(
        `- Rich line proposals: ${city.richLineProposals
          .map((proposal) => `${proposal.id}:${proposal.color}`)
          .join(', ')}`,
      )
    }
    if (city.newStations.length)
      lines.push(`- New stations: ${city.newStations.join(', ')}`)
    if (city.updatedStations.length)
      lines.push(`- Updated stations: ${city.updatedStations.join(', ')}`)
    if (city.removedStations.length)
      lines.push(`- Removed stations (review only): ${city.removedStations.join(', ')}`)
    if (city.lineErrors.length)
      lines.push(`- Line errors: ${city.lineErrors.join(' | ')}`)
    if (city.colorWarnings.length)
      lines.push(`- Color warnings: ${city.colorWarnings.join(' | ')}`)
    if (city.operatorSuggestion) {
      lines.push(
        `- Operator suggestion: ${city.operatorSuggestion.value} (verified: ${city.operatorSuggestion.verified})`,
      )
    }
    if (city.headerSuggestion) {
      const sub = city.headerSuggestion.subheader
        ? ` / ${city.headerSuggestion.subheader}`
        : ''
      lines.push(
        `- Header suggestion: ${city.headerSuggestion.header}${sub} (verified: ${city.headerSuggestion.verified})`,
      )
    }
    if (city.verificationNotes.length) {
      lines.push(`- Verification: ${city.verificationNotes.join(' | ')}`)
    }
    if ((city.clusteredDuplicateCount || 0) > 0) {
      lines.push(`- Clustered duplicates removed: ${city.clusteredDuplicateCount}`)
    }
    if (city.sourceEnrichmentSuggestions?.length) {
      lines.push(
        `- Source enrichment: ${city.sourceEnrichmentSuggestions
          .slice(0, 6)
          .map((suggestion) => `${suggestion.sourceKey} -> ${suggestion.url}`)
          .join(' | ')}`,
      )
    }
    lines.push('')
  })

  if (report.errors.length) {
    lines.push('## Errors')
    report.errors.forEach((err) => lines.push(`- ${err}`))
  }

  return lines.join('\n')
}

const sendEmail = async (subject: string, body: string) => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const to = process.env.SMTP_TO
  const from = process.env.SMTP_FROM || user

  if (!user || !pass || !to) return

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({ from, to, subject, text: body })
}

const searchSerpApi = async (query: string) => {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) return null
  const res = await axios.get('https://serpapi.com/search.json', {
    params: {
      engine: 'google',
      q: query,
      api_key: apiKey,
    },
  })
  return res.data
}

const getBlockedDomainsSnapshot = async () => {
  if (!process.env.DATABASE_URL) return new Set<string>()
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.automationSourceDomain.findMany({
      where: { blocked: true },
      select: { domain: true },
    })
    return new Set(rows.map((row) => row.domain))
  } finally {
    await prisma.$disconnect()
  }
}

const buildAutomationRunNotification = async ({
  runId,
  report,
  autoApplyResult,
  followUpSchedulingResult,
  blockedDomainsBefore,
  reportMarkdown,
}: {
  runId: string
  report: Report
  autoApplyResult: Awaited<ReturnType<typeof autoApplyGreenLaneCandidatesForRun>> | null
  followUpSchedulingResult: Awaited<ReturnType<typeof scheduleFollowUpResearchRunsForRun>> | null
  blockedDomainsBefore: Set<string>
  reportMarkdown: string
}) => {
  if (!process.env.DATABASE_URL) {
    return {
      subject: report.errors.length ? 'Metro Sync finished with issues' : 'Metro Sync Report',
      body: reportMarkdown,
    }
  }

  const prisma = new PrismaClient()
  try {
    const run = await prisma.automationRun.findUnique({
      where: { id: runId },
      include: {
        candidates: {
          include: {
            claim: true,
            sources: {
              select: {
                url: true,
              },
            },
          },
        },
      },
    })

    if (!run) {
      return {
        subject: 'Metro Sync Report',
        body: reportMarkdown,
      }
    }

    const blockedDomainsAfter = await prisma.automationSourceDomain.findMany({
      where: { blocked: true },
      select: { domain: true, notes: true, overrideReason: true },
    })
    const newlyBlockedDomains = blockedDomainsAfter.filter(
      (domain) => !blockedDomainsBefore.has(domain.domain),
    )

    const pendingYellow = run.candidates.filter(
      (candidate) => candidate.status === 'PENDING' && candidate.claim?.lane === 'YELLOW',
    ).length
    const totalPending = run.candidates.filter((candidate) => candidate.status === 'PENDING').length
    const changedCityCount = new Set(run.candidates.map((candidate) => candidate.citySlug)).size
    const autoAppliedCount = run.candidates.filter(
      (candidate) => candidate.appliedAt && candidate.claim?.lane === 'GREEN' && candidate.claim?.autoApplyEligible,
    ).length
    const reviewRequiredCount = run.candidates.filter(
      (candidate) => !(candidate.claim?.lane === 'GREEN' && candidate.claim?.autoApplyEligible),
    ).length
    const worseningDomains = Array.from(
      run.candidates
        .filter((candidate) => candidate.status === 'REJECTED' || Boolean(candidate.applyNote?.includes('failed')))
        .flatMap((candidate) => candidate.sources.map((source) => source.url))
        .filter((value): value is string => Boolean(value))
        .reduce((map, url) => {
          try {
            const domain = new URL(url).hostname.replace(/^www\./, '')
            map.set(domain, (map.get(domain) || 0) + 1)
          } catch {
            // ignore
          }
          return map
        }, new Map<string, number>())
        .entries(),
    )
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([domain]) => domain)
    const noisyCities = Array.from(
      run.candidates.reduce((map, candidate) => {
        if (candidate.status !== 'REJECTED' && !(candidate.appliedAt && candidate.run?.revertedAt)) {
          return map
        }
        map.set(candidate.citySlug, (map.get(candidate.citySlug) || 0) + 1)
        return map
      }, new Map<string, number>()).entries(),
    )
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([city]) => city)
    const subjectPrefix = report.errors.length > 0 ? 'Metro Sync finished with issues' : 'Metro Sync complete'
    const lines = [
      subjectPrefix,
      '',
      `Run: ${run.id}`,
      `Scope: ${run.scope || 'all'}`,
      `Cities processed: ${report.cities.length}`,
      `Cities changed: ${changedCityCount}`,
      `Candidates: ${run.candidates.length}`,
      `Auto-applied: ${autoAppliedCount}`,
      `Needed review: ${reviewRequiredCount}`,
      `Pending review: ${totalPending}`,
      `Yellow review queue ready: ${pendingYellow}`,
    ]

    if (autoApplyResult?.git?.pullRequestUrl) {
      lines.push(`Green-lane PR opened: ${autoApplyResult.git.pullRequestUrl}`)
    } else if (autoApplyResult?.autoApprovedCount) {
      lines.push(
        `Green-lane auto-apply attempted: ${autoApplyResult.autoApprovedCount} candidates`,
      )
    }

    if ((followUpSchedulingResult?.scheduledCount || 0) > 0) {
      lines.push(`Follow-up research queued: ${followUpSchedulingResult?.scheduledCount || 0}`)
    }

    if (newlyBlockedDomains.length > 0) {
      lines.push('')
      lines.push('Domains blocked by audit metrics:')
      newlyBlockedDomains.forEach((domain) => {
        lines.push(
          `- ${domain.domain}${domain.overrideReason ? ` (${domain.overrideReason})` : domain.notes ? ` (${domain.notes})` : ''}`,
        )
      })
    }

    if (worseningDomains.length > 0) {
      lines.push('')
      lines.push(`Sources getting worse: ${worseningDomains.join(', ')}`)
    }

    if (noisyCities.length > 0) {
      lines.push('')
      lines.push(`Noisy cities to review: ${noisyCities.join(', ')}`)
    }

    if (newlyBlockedDomains.length >= 3) {
      lines.push('')
      lines.push(`Trust-block spike detected: ${newlyBlockedDomains.length} domains were newly blocked in this run.`)
    }

    if (report.errors.length > 0) {
      lines.push('')
      lines.push('Run errors:')
      report.errors.forEach((error) => lines.push(`- ${error}`))
    }

    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(reportMarkdown)

    const notificationSummary = {
      greenLanePrUrl: autoApplyResult?.git?.pullRequestUrl || null,
      yellowQueueCount: pendingYellow,
      pendingCount: totalPending,
      changedCityCount,
      autoAppliedCount,
      reviewRequiredCount,
      worseningDomains,
      noisyCities,
      blockedDomains: newlyBlockedDomains.map((domain) => domain.domain),
      followUpQueuedCount: followUpSchedulingResult?.scheduledCount || 0,
      errorCount: report.errors.length,
    }

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        summary: {
          ...(typeof run.summary === 'object' && run.summary ? (run.summary as object) : {}),
          notificationSummary,
        },
      },
    })

    return {
      subject: subjectPrefix,
      body: lines.join('\n'),
    }
  } finally {
    await prisma.$disconnect()
  }
}

export const runMetroSyncJob = async (options: MetroSyncJobOptions = {}) => {
  const previousRunOptions = activeRunOptions
  activeRunOptions = options
  try {
    resetAutomationRuntime('metro-sync-job', {
      scope: resolveConfiguredScope(),
      explicitCities: resolveConfiguredExplicitCities().join(','),
    })
    ensureDir(REPORTS_DIR)
    const startedAt = new Date().toISOString()
    const report: Report = { startedAt, cities: [], errors: [] }
    const collectedArtifacts: CollectedArtifact[] = []
    const blockedDomainsBefore = await getBlockedDomainsSnapshot()

  const registries = filterRegistriesByScope(
    loadRegistries(),
    resolveConfiguredScope(),
  )
  const explicitCityFilter = new Set(resolveConfiguredExplicitCities())
  let filteredRegistries =
    explicitCityFilter.size > 0
      ? registries.filter((registry) => explicitCityFilter.has(registry.city))
      : registries

  filteredRegistries =
    process.env.METRO_SYNC_ONLY_LINELESS === '1'
      ? filteredRegistries.filter(
          (registry) => !Array.isArray(registry.lines) || registry.lines.length === 0,
        )
      : filteredRegistries

  const { maxCitiesPerRun } = getAutomationRuntimeCaps()
  if (maxCitiesPerRun && filteredRegistries.length > maxCitiesPerRun) {
    recordAutomationObservation(
      'warn',
      'city_cap_reached',
      'City list was truncated by the per-run city cap.',
      {
        requested: filteredRegistries.length,
        allowed: maxCitiesPerRun,
      },
    )
    report.errors.push(
      `Run was limited to ${maxCitiesPerRun} cities by METRO_SYNC_MAX_CITIES_PER_RUN.`,
    )
    filteredRegistries = filteredRegistries.slice(0, maxCitiesPerRun)
  }

  for (const registry of filteredRegistries) {
    const reportCity: ReportCity = {
      city: registry.city,
      linesProcessed: 0,
      lineErrors: [],
      newStations: [],
      removedStations: [],
      updatedStations: [],
      newLines: [],
      colorWarnings: [],
      verificationNotes: [],
      candidates: [],
      richLineProposals: [],
      sourceEnrichmentSuggestions: [],
      clusteredDuplicateCount: 0,
    }

    try {
      const researchPlan = resolveRegistryResearchPlan(
        registry,
        new Date(),
        resolveConfiguredDeepResearchMode(),
      )
      reportCity.verificationNotes.push(
        `Research tier ${researchPlan.tier.toUpperCase()} (${researchPlan.reason})`,
      )

      const collected = await collectCityInputs(registry, {
        includeExternalArtifacts: researchPlan.deepResearchDue,
        bootstrapOnly: !Array.isArray(registry.lines) || registry.lines.length === 0,
      })
      collectedArtifacts.push(...collected.artifacts)
      const lineFeatures = collected.lineFeatures
      const stationFeatures = collected.stationFeatures
      const activeLines = registry.lines.filter(
        (line) => line.keywords && line.keywords.length > 0,
      )

      // Detect new line candidates not in registry
      const keywordNorms = registry.lines.flatMap((l) => l.keywords.map(normalize))
      const newLineCandidates = new Map<string, any>()
      lineFeatures.forEach((f: any) => {
        const props = f.properties || {}
        const candidates = collectNameCandidates(props, registry.localLanguages || [])
        const candidateNorms = candidates.map(normalize)
        const matchesKnown = candidateNorms.some((c) => keywordNorms.includes(c))
        if (!matchesKnown) {
          const name = props['name:en'] || props.name
          if (name && !newLineCandidates.has(name)) newLineCandidates.set(name, f)
        }
      })
      reportCity.newLines.push(...Array.from(newLineCandidates.keys()))

      const bootstrapSeeds = activeLines.length === 0
        ? discoverBootstrapLineSeeds(registry, lineFeatures)
        : []
      if (bootstrapSeeds.length > 0) {
        reportCity.verificationNotes.push(
          `Bootstrapped ${bootstrapSeeds.length} line candidates from OSM route relations because the registry has no configured lines yet.`,
        )
      }

      const officialFacts = await extractOfficialArtifactFacts({
        city: registry.city,
        artifacts: collected.artifacts,
        lineNames: Array.from(
          new Set([
            ...registry.lines.map((line) => line.name).filter(Boolean),
            ...Array.from(newLineCandidates.keys()),
            ...bootstrapSeeds.map((seed) => seed.name),
          ]),
        ),
      })
      collected.extractedFacts.push(...officialFacts)
      if (officialFacts.length > 0) {
        reportCity.verificationNotes.push(
          `Extracted ${officialFacts.length} structured facts from official artifacts.`,
        )
      }

      const existing = loadExisting(registry.city)
      const gtfsDiffCandidates = await buildGtfsDiffCandidates({
        city: registry.city,
        artifacts: collected.artifacts,
        existingFeatures: existing.features,
        existingLines: existing.lines,
        stationAliases: registry.stationAliases || {},
        stationLocalNames: registry.stationLocalNames || {},
      })
      if (gtfsDiffCandidates.length > 0) {
        reportCity.verificationNotes.push(
          `Derived ${gtfsDiffCandidates.length} GTFS diff candidates from the latest feed.`,
        )
      }

      reportCity.sourceEnrichmentSuggestions = suggestSourceEnrichment({
        registry,
        artifacts: collected.artifacts,
      })
      if (reportCity.sourceEnrichmentSuggestions.length > 0) {
        reportCity.verificationNotes.push(
          `Suggested ${reportCity.sourceEnrichmentSuggestions.length} source-enrichment candidates for missing registry source hints.`,
        )
      }

      if (activeLines.length === 0) {
        reportCity.linesProcessed = 0
        reportCity.richLineProposals = buildBootstrapLineProposals({
          registry,
          lineFeatures,
          startOrder: 0,
        }).map((proposal) => ({
          ...proposal,
          routeSample: {
            ...(proposal.routeSample || {}),
            bootstrapKind: 'initial-registry-bootstrap',
          },
        }))

        const clusteredBootstrapCandidates = clusterReviewCandidates(
          enrichCandidatesWithOfficialFacts(
            buildReviewCandidates({
              city: registry.city,
              existingFeatures: [],
              nextFeatures: [],
              existingLines: existing.lines,
              reportCity,
              configMetadata: null,
              extractedFacts: officialFacts,
              stationAliases: registry.stationAliases || {},
              stationLocalNames: registry.stationLocalNames || {},
            })
              .concat(gtfsDiffCandidates)
              .map((candidate) =>
                candidate.type === 'NEW_LINE'
                  ? {
                      ...candidate,
                      summary:
                        'Initial registry bootstrap candidate inferred from OSM route relations for a city with no configured lines yet.',
                      metadata: {
                        ...(candidate.metadata && typeof candidate.metadata === 'object'
                          ? candidate.metadata
                          : {}),
                        bootstrapKind: 'initial-registry-bootstrap',
                        bootstrapSourceCount: bootstrapSeeds.length,
                      },
                    }
                  : candidate,
              ),
            officialFacts,
          ),
        )
        reportCity.clusteredDuplicateCount = clusteredBootstrapCandidates.clusteredDuplicateCount
        reportCity.candidates = clusteredBootstrapCandidates.candidates
        const bootstrapClaimTypeFilter = parseClaimTypeFilter()
        if (bootstrapClaimTypeFilter.size > 0) {
          reportCity.candidates = reportCity.candidates.filter((candidate) =>
            bootstrapClaimTypeFilter.has(String(candidate.type).toUpperCase()),
          )
        }
        report.cities.push(reportCity)
        continue
      }

      const linesJson = await buildLinesJson(
        registry,
        lineFeatures,
        existing.lines,
        reportCity,
      )

      const lineGeoms = buildLineGeometries(lineFeatures, registry)

      reportCity.linesProcessed = Object.keys(lineGeoms).length

      const routesJson = buildRoutesJson(lineGeoms, linesJson)

      const featuresJson = extractStations(
        registry,
        lineGeoms,
        stationFeatures,
        existing.features,
        reportCity,
      )

      writeCityData(registry.city, linesJson, featuresJson, routesJson)

      const operatorSuggestion = researchPlan.deepResearchDue
        ? await suggestOperator(registry.city, lineFeatures)
        : null
      if (operatorSuggestion) reportCity.operatorSuggestion = operatorSuggestion

      const headerSuggestion = researchPlan.deepResearchDue
        ? await suggestHeaderSubheader(registry.city, lineFeatures)
        : null
      if (headerSuggestion) reportCity.headerSuggestion = headerSuggestion

      reportCity.richLineProposals = []
      let lineOrderSeed = Object.keys(existing.lines || {}).length
      if (researchPlan.deepResearchDue) {
        for (const [lineName, feature] of newLineCandidates.entries()) {
          const { proposal, imageCandidate } = await buildRichLineProposal({
            city: registry.city,
            lineName,
            feature,
            order: lineOrderSeed,
            reportCity,
          })
          lineOrderSeed += 1
          reportCity.richLineProposals.push(proposal)
          if (imageCandidate) {
            reportCity.candidates.push(imageCandidate)
          }
        }
      }

      const configMetadata: ConfigMetadata | null = extractMetadataDescriptions(
        loadCityConfigSource(registry.city),
      )

      const clusteredCandidates = clusterReviewCandidates(
        enrichCandidatesWithOfficialFacts(
          buildReviewCandidates({
            city: registry.city,
            existingFeatures: existing.features,
            nextFeatures: featuresJson.features || [],
            existingLines: existing.lines,
            reportCity,
            configMetadata,
            extractedFacts: officialFacts,
            stationAliases: registry.stationAliases || {},
            stationLocalNames: registry.stationLocalNames || {},
          })
            .concat(reportCity.candidates)
            .concat(gtfsDiffCandidates),
          officialFacts,
        ),
      )
      reportCity.clusteredDuplicateCount = clusteredCandidates.clusteredDuplicateCount
      reportCity.candidates = clusteredCandidates.candidates

      const claimTypeFilter = parseClaimTypeFilter()
      if (claimTypeFilter.size > 0) {
        reportCity.candidates = reportCity.candidates.filter((candidate) =>
          claimTypeFilter.has(String(candidate.type).toUpperCase()),
        )
      }

      const cityCardImageCandidate = researchPlan.deepResearchDue
        ? await buildCityCardImageCandidate(registry.city, reportCity)
        : null
      if (cityCardImageCandidate) {
        reportCity.candidates.push(cityCardImageCandidate)
      }

      // Basic verification for new items (limited to 5 checks)
      if (process.env.SERPAPI_API_KEY && researchPlan.deepResearchDue) {
        const verification = await runBasicCityVerification({
          city: registry.city,
          newLines: reportCity.newLines,
          newStations: reportCity.newStations,
          searchFn: searchSerpApi,
        })
        reportCity.verificationNotes.push(...verification.notes)
        collectedArtifacts.push(...verification.artifacts)
      }

      report.cities.push(reportCity)
    } catch (err: any) {
      report.errors.push(`${registry.city}: ${err?.message || err}`)
      report.cities.push(reportCity)
    }
  }

  report.finishedAt = new Date().toISOString()

  const reportMd = buildReportMarkdown(report)
  const reportPath = path.join(
    REPORTS_DIR,
    `metro-sync-${new Date().toISOString().slice(0, 10)}.md`,
  )
  fs.writeFileSync(reportPath, reportMd)

  const runtimeMetrics = getAutomationRuntimeSnapshot()
  const runId = await persistAutomationRun(
    report,
    reportMd,
    collectedArtifacts,
    reportPath,
    runtimeMetrics,
  )
  let followUpSchedulingResult: Awaited<ReturnType<typeof scheduleFollowUpResearchRunsForRun>> | null = null
  if (runId) {
    followUpSchedulingResult = await scheduleFollowUpResearchRunsForRun(runId)
  }
  let autoApplyResult: Awaited<ReturnType<typeof autoApplyGreenLaneCandidatesForRun>> | null = null
  if (runId && resolveConfiguredAutoApplyGreen()) {
    autoApplyResult = await autoApplyGreenLaneCandidatesForRun(
      runId,
      process.env.AUTOMATION_AUTO_APPLY_LABEL || 'automation-policy',
    )
  }
  if (runId) {
    const notification = await buildAutomationRunNotification({
      runId,
      report,
      autoApplyResult,
      followUpSchedulingResult,
      blockedDomainsBefore,
      reportMarkdown: reportMd,
    })
    await sendEmail(notification.subject, notification.body)
  } else {
    await sendEmail(report.errors.length ? 'Metro Sync finished with issues' : 'Metro Sync Report', reportMd)
  }

  const finalRuntimeMetrics = finalizeAutomationRuntime({
    cityCount: report.cities.length,
    collectedArtifactCount: collectedArtifacts.length,
  })
  if (runId) {
    await updateAutomationRunRuntimeMetrics(runId, finalRuntimeMetrics)
  }

    return {
      runId,
      reportPath,
      report,
      autoApplyResult,
      followUpSchedulingResult,
      telemetry: finalRuntimeMetrics,
    }
  } finally {
    activeRunOptions = previousRunOptions
  }
}

const main = async () => {
  const result = await runMetroSyncJob()
  if (process.env.METRO_SYNC_OUTPUT_JSON === '1') {
    console.log(
      JSON.stringify(
        {
          runId: result.runId,
          reportPath: result.reportPath,
          cityCount: result.report.cities.length,
          errorCount: result.report.errors.length,
          telemetry: result.telemetry,
        },
        null,
        2,
      ),
    )
  }
}

main().catch(async (err) => {
  console.error(err)
  await sendEmail(
    'Metro Sync failed',
    err instanceof Error ? `${err.message}\n\n${err.stack || ''}` : String(err),
  ).catch(() => {})
  process.exit(1)
})

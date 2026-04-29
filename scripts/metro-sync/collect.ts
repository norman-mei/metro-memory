import fs from 'fs'
import path from 'path'
import axios from 'axios'
import osmtogeojson from 'osmtogeojson'
import { createHash } from 'node:crypto'
import * as cheerio from 'cheerio'
import {
  getResearchMemoryHints,
  getResearchMemoryPlannerContext,
} from '../../src/lib/automationResearchMemory.ts'
import {
  applyAutomationTimeoutCeiling,
  getAutomationRuntimeCaps,
  recordAutomationFetchResult,
  recordAutomationObservation,
  tryConsumeDomainFetchBudget,
  tryConsumeResearchTaskBudget,
} from '../../src/lib/automationRuntime.ts'

import { collectBrowserRenderedArtifact } from './browserCollector.ts'
import { hydrateRegistryCoverage } from './registryCoverage.ts'
import type {
  CollectedArtifactType,
  CollectedCityInputs,
  Registry,
  ResearchDiscoveryMode,
  ResearchTaskCollectionResult,
  ResearchTaskRequest,
  ResearchTaskType,
} from './types'

const ROOT = process.cwd()
const REGISTRY_DIR = path.join(ROOT, 'city-registry')
const CACHE_DIR = path.join(ROOT, 'tmp', 'metro-sync')
const EXTERNAL_CACHE_DIR = path.join(CACHE_DIR, 'external')
const CITY_COORDINATES_PATH = path.join(ROOT, 'src', 'lib', 'cityCoordinates.ts')

const DEFAULT_MODES = [
  'subway',
  'light_rail',
  'tram',
  'rail',
  'funicular',
  'monorail',
  'cable_car',
  'gondola',
  'chair_lift',
]

const OFFICIALISH_DOMAIN_PATTERN =
  /\.gov\b|\.go\.[a-z]{2}\b|\.gouv\b|metro|transit|rail|tram|subway|mrt|lrt|operator/i

const RESEARCH_TASK_ARTIFACT_MAP: Record<ResearchTaskType, CollectedArtifactType[]> = {
  FIND_OFFICIAL_OPERATOR_PAGE: ['OFFICIAL_PAGE'],
  FIND_MAP_PDF: ['MAP_PDF'],
  FIND_GTFS_FEED: ['GTFS_FEED'],
  FIND_PRESS_PAGE: ['PRESS_RELEASE', 'OFFICIAL_PAGE'],
  VERIFY_STATION_RENAME: ['PRESS_RELEASE', 'OFFICIAL_PAGE', 'GTFS_FEED'],
  VERIFY_LINE_RENAME: ['PRESS_RELEASE', 'OFFICIAL_PAGE', 'MAP_PDF'],
  VERIFY_LINE_COLOR: ['MAP_PDF', 'OFFICIAL_PAGE'],
  VERIFY_OPERATOR: ['OFFICIAL_PAGE', 'PRESS_RELEASE'],
  VERIFY_METADATA: ['OFFICIAL_PAGE', 'MAP_PDF', 'PRESS_RELEASE'],
}

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const parseExportedObject = (filePath: string, exportName: string) => {
  if (!fs.existsSync(filePath)) return {}
  const source = fs.readFileSync(filePath, 'utf8')
  const pattern = new RegExp(
    `export const ${exportName}(?::[^=]+)? = (\\{[\\s\\S]*?\\n\\})`,
  )
  const match = source.match(pattern)
  if (!match) return {}
  return new Function(`return ${match[1]}`)() as Record<string, any>
}

const CITY_COORDINATES = parseExportedObject(
  CITY_COORDINATES_PATH,
  'CITY_COORDINATES',
) as Record<string, [number, number]>

const CITY_COORDINATE_OVERRIDES: Record<string, [number, number]> = {
  toronto: [-79.3832, 43.6532],
}

const getCityDir = (rootDir: string, city: string): string | null => {
  if (!fs.existsSync(rootDir)) return null
  const segments = fs.readdirSync(rootDir)
  for (const segment of segments) {
    const base = path.join(rootDir, segment)
    if (!fs.statSync(base).isDirectory()) continue
    const nested = getCityDir(base, city)
    if (nested) return nested
  }
  return path.basename(rootDir) === city ? rootDir : null
}

const isLargeRegion = (slug: string) =>
  slug === 'california-state' || slug === 'florida-state' || slug === 'amtrak'

const getRegistryBbox = (registry: Registry) => {
  const bbox = registry.bbox
  const isValid =
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((value) => Number.isFinite(value)) &&
    !(bbox[0] === 0 && bbox[1] === 0 && bbox[2] === 0 && bbox[3] === 0)

  if (isValid) return bbox

  const center = CITY_COORDINATES[registry.city] || CITY_COORDINATE_OVERRIDES[registry.city]
  if (!center) return bbox

  const [lon, lat] = center
  const delta = isLargeRegion(registry.city) ? 3 : 0.5
  return [lat - delta, lon - delta, lat + delta, lon + delta] as [number, number, number, number]
}

const bboxNeedsTiling = (bbox: [number, number, number, number]) => {
  const latSpan = Math.abs(bbox[2] - bbox[0])
  const lonSpan = Math.abs(bbox[3] - bbox[1])
  return latSpan >= 0.8 || lonSpan >= 0.8
}

const splitBbox = (bbox: [number, number, number, number], divisions = 2) => {
  const [minLat, minLon, maxLat, maxLon] = bbox
  const latStep = (maxLat - minLat) / divisions
  const lonStep = (maxLon - minLon) / divisions
  const tiles: [number, number, number, number][] = []

  for (let latIndex = 0; latIndex < divisions; latIndex += 1) {
    for (let lonIndex = 0; lonIndex < divisions; lonIndex += 1) {
      const tileMinLat = minLat + latStep * latIndex
      const tileMinLon = minLon + lonStep * lonIndex
      const tileMaxLat = latIndex === divisions - 1 ? maxLat : tileMinLat + latStep
      const tileMaxLon = lonIndex === divisions - 1 ? maxLon : tileMinLon + lonStep
      tiles.push([tileMinLat, tileMinLon, tileMaxLat, tileMaxLon])
    }
  }

  return tiles
}

const mergeOverpassResponses = (responses: any[]) => {
  const elements = new Map<string, any>()
  responses.forEach((response) => {
    const list = Array.isArray(response?.elements) ? response.elements : []
    list.forEach((element: any) => {
      const key = `${element.type || 'unknown'}:${element.id || JSON.stringify(element)}`
      if (!elements.has(key)) {
        elements.set(key, element)
      }
    })
  })

  return {
    version: 0.6,
    generator: 'MetroMemory merged overpass',
    osm3s: responses.find((response) => response?.osm3s)?.osm3s || {},
    elements: Array.from(elements.values()),
  }
}

const getCitySourceJsonPath = (city: string) => {
  const cityDir = getCityDir(path.join(ROOT, 'src', 'app', '(game)'), city)
  if (!cityDir) return null
  const sourcePath = path.join(cityDir, 'data', 'source.json')
  return fs.existsSync(sourcePath) ? sourcePath : null
}

const readJsonFile = (filePath: string | null) => {
  if (!filePath || !fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

const collectUrlsFromValue = (value: unknown, urls = new Set<string>()) => {
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>]+/g)
    matches?.forEach((match) => urls.add(match))
    return urls
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectUrlsFromValue(entry, urls))
    return urls
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectUrlsFromValue(entry, urls))
  }
  return urls
}

const inferExternalArtifactType = (
  url: string,
  registry: Registry,
): Exclude<CollectedCityInputs['artifacts'][number]['artifactType'], 'OSM_OVERPASS' | 'SEARCH_RESULT' | 'IMAGE_PREVIEW' | 'REPORT_MARKDOWN'> => {
  const lowerUrl = url.toLowerCase()
  if (
    registry.sources?.gtfsFeeds?.includes(url) ||
    /gtfs|feed|tripupdates|vehiclepositions|servicealerts/.test(lowerUrl)
  ) {
    return 'GTFS_FEED'
  }
  if (registry.sources?.mapPdfs?.includes(url) || lowerUrl.endsWith('.pdf')) {
    return 'MAP_PDF'
  }
  if (
    registry.sources?.pressPages?.includes(url) ||
    /press|news|alert|service-update|service-update|updates|media/.test(lowerUrl)
  ) {
    return 'PRESS_RELEASE'
  }
  return 'OFFICIAL_PAGE'
}

const isOfficialishDomain = (url: string) => {
  try {
    return OFFICIALISH_DOMAIN_PATTERN.test(new URL(url).hostname.replace(/^www\./, ''))
  } catch {
    return false
  }
}

const isRetryableNetworkError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: string }).code || '') : ''
  const message =
    'message' in error ? String((error as { message?: string }).message || '').toLowerCase() : ''
  return (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('socket')
  )
}

const searchSerpApi = async (query: string) => {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) return null
  const timeoutMs = applyAutomationTimeoutCeiling(getAutomationRuntimeCaps().httpTimeoutMs, 20000)
  const startedAt = Date.now()
  try {
    const res = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google',
        q: query,
        api_key: apiKey,
      },
      timeout: timeoutMs,
    })
    recordAutomationFetchResult({
      domain: 'serpapi.com',
      success: true,
      kind: 'search-discovery',
      durationMs: Date.now() - startedAt,
      metadata: { query },
    })
    return res.data
  } catch (error) {
    recordAutomationFetchResult({
      domain: 'serpapi.com',
      success: false,
      kind: 'search-discovery',
      durationMs: Date.now() - startedAt,
      metadata: {
        query,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

const buildResearchQueries = (
  task: ResearchTaskRequest,
  memoryContext?: {
    aliases: string[]
    historicalKeywords: string[]
    candidateHints: string[]
    preferredDomains: string[]
    preferredQueryFragments: string[]
  } | null,
) => {
  const base = task.queryHint || task.candidateTitle || task.entityKey || task.title
  const quoted = base && base.trim() ? `"${base.trim()}" ` : ''
  const aliasFragments = (memoryContext?.aliases || []).slice(0, 3)
  const candidateFragments = (memoryContext?.candidateHints || []).slice(0, 2)
  const historyFragments = (memoryContext?.historicalKeywords || []).slice(0, 2)
  const recipeFragments = (memoryContext?.preferredQueryFragments || []).slice(0, 2)
  const cityTerms = Array.from(new Set([task.citySlug, ...aliasFragments].filter(Boolean))).join(' ')

  const dedupeQueries = (...values: string[]) =>
    Array.from(
      new Set(
        values
          .map((value) => value.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      ),
    ).slice(0, 6)

  switch (task.taskType) {
    case 'FIND_OFFICIAL_OPERATOR_PAGE':
    case 'VERIFY_OPERATOR':
      return dedupeQueries(
        `${cityTerms} metro operator official site`,
        `${quoted}${cityTerms} transit official operator`,
        `${quoted}${aliasFragments[0] || task.citySlug} rail agency official`,
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
    case 'FIND_MAP_PDF':
    case 'VERIFY_LINE_COLOR':
      return dedupeQueries(
        `${quoted}${cityTerms} metro map pdf official`,
        `${quoted}${cityTerms} rail map pdf official`,
        `${quoted}${candidateFragments[0] || ''} ${cityTerms} map pdf`.trim(),
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
    case 'FIND_GTFS_FEED':
      return dedupeQueries(
        `${cityTerms} transit gtfs official`,
        `${quoted}${cityTerms} gtfs feed`,
        `${quoted}${recipeFragments[0] || ''} gtfs`.trim(),
      )
    case 'FIND_PRESS_PAGE':
      return dedupeQueries(
        `${quoted}${cityTerms} metro press release official`,
        `${quoted}${cityTerms} service update official`,
        `${quoted}${candidateFragments[0] || ''} ${cityTerms} press release`.trim(),
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
    case 'VERIFY_STATION_RENAME':
      return dedupeQueries(
        `${quoted}${cityTerms} station rename official`,
        `${quoted}${cityTerms} metro press release`,
        `${quoted}${candidateFragments[0] || historyFragments[0] || ''} ${cityTerms} station rename`.trim(),
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
    case 'VERIFY_LINE_RENAME':
      return dedupeQueries(
        `${quoted}${cityTerms} line rename official`,
        `${quoted}${cityTerms} metro map official`,
        `${quoted}${candidateFragments[0] || historyFragments[0] || ''} ${cityTerms} line rename`.trim(),
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
    case 'VERIFY_METADATA':
      return dedupeQueries(
        `${quoted}${cityTerms} official metro page`,
        `${quoted}${cityTerms} transit official`,
        `${quoted}${candidateFragments[0] || ''} ${cityTerms} operator info`.trim(),
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
    default:
      return dedupeQueries(
        `${quoted}${cityTerms} metro official`,
        `${quoted}${recipeFragments[0] || ''}`.trim(),
      )
  }
}

const scoreDiscoveredResearchUrl = ({
  url,
  artifactType,
  query,
  preferredDomains,
}: {
  url: string
  artifactType: CollectedArtifactType
  query: string
  preferredDomains?: string[]
}) => {
  const lowerUrl = url.toLowerCase()
  let score = isOfficialishDomain(url) ? 10 : 0
  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return ''
    }
  })()
  if (artifactType === 'MAP_PDF') score += 6
  if (artifactType === 'GTFS_FEED') score += 6
  if (artifactType === 'PRESS_RELEASE') score += 4
  if (lowerUrl.endsWith('.pdf')) score += 3
  if (/gtfs|feed|tripupdates|servicealerts|vehiclepositions/.test(lowerUrl)) score += 3
  if (/official|agency|operator/.test(query.toLowerCase())) score += 1
  if ((preferredDomains || []).some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
    score += 8
  }
  return score
}

const discoverResearchTaskSources = async ({
  registry,
  task,
  mode,
}: {
  registry: Registry
  task: ResearchTaskRequest
  mode: ResearchDiscoveryMode
}) => {
  const discovered = new Map<
    string,
    {
      artifactType: CollectedArtifactType
      query: string
      score: number
    }
  >()
  const expectedArtifactTypes =
    task.expectedArtifactTypes && task.expectedArtifactTypes.length > 0
      ? task.expectedArtifactTypes
      : RESEARCH_TASK_ARTIFACT_MAP[task.taskType]
  let memoryContext:
    | Awaited<ReturnType<typeof getResearchMemoryPlannerContext>>
    | null = null

  const add = (url: string, query: string) => {
    try {
      const normalized = new URL(url).toString()
      const artifactType = inferExternalArtifactType(normalized, registry)
      if (!expectedArtifactTypes.includes(artifactType)) return
      const score = scoreDiscoveredResearchUrl({
        url: normalized,
        artifactType,
        query,
        preferredDomains: memoryContext?.preferredDomains,
      })
      const existing = discovered.get(normalized)
      if (!existing || score > existing.score) {
        discovered.set(normalized, {
          artifactType,
          query,
          score,
        })
      }
    } catch {
      // ignore malformed urls
    }
  }

  discoverRegistrySources(registry).forEach(([url, artifactType]) => {
    if (expectedArtifactTypes.includes(artifactType)) {
      add(url, 'registry-source')
    }
  })

  if (process.env.DATABASE_URL && String(process.env.METRO_SYNC_ENABLE_MEMORY || '1') === '1') {
    try {
      memoryContext = await getResearchMemoryPlannerContext({
        citySlug: registry.city,
        candidateTitle: task.candidateTitle || task.title,
        entityKey: task.entityKey,
      })
      const memoryHints = await getResearchMemoryHints({ citySlug: registry.city })
      memoryHints.operatorSources.forEach((row) => {
        const sourceUrl =
          row.valueJson && typeof row.valueJson === 'object' && 'sourceUrl' in row.valueJson
            ? String((row.valueJson as Record<string, unknown>).sourceUrl || '')
            : ''
        if (sourceUrl) {
          add(sourceUrl, 'research-memory')
        }
      })
    } catch {
      // ignore memory lookup failures and continue with registry/search inputs
    }
  }

  if (mode === 'registry-only') {
    return Array.from(discovered.entries())
      .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0]))
      .slice(0, 6)
  }

  for (const query of buildResearchQueries(task, memoryContext)) {
    try {
      const data = await searchSerpApi(query)
      const results = Array.isArray(data?.organic_results) ? data.organic_results : []
      results.slice(0, 6).forEach((result: any) => {
        if (typeof result?.link === 'string') {
          add(result.link, query)
        }
      })
    } catch {
      // ignore search/discovery failures and fall back to registry hints only
    }
  }

  return Array.from(discovered.entries())
    .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0]))
    .slice(0, 6)
}

const discoverRegistrySources = (registry: Registry) => {
  const discovered = new Map<string, ReturnType<typeof inferExternalArtifactType>>()
  const add = (url: string | undefined | null) => {
    if (!url) return
    try {
      const normalized = new URL(url).toString()
      discovered.set(normalized, inferExternalArtifactType(normalized, registry))
    } catch {
      // ignore malformed URLs
    }
  }

  registry.sources?.gtfsFeeds?.forEach(add)
  registry.sources?.officialPages?.forEach(add)
  registry.sources?.pressPages?.forEach(add)
  registry.sources?.mapPdfs?.forEach(add)

  const sourceJson = readJsonFile(getCitySourceJsonPath(registry.city))
  Array.from(collectUrlsFromValue(sourceJson)).forEach(add)

  return Array.from(discovered.entries()).slice(0, 24)
}

const buildExternalCachePath = (city: string, url: string, suffix: string) => {
  const hash = createHash('sha1').update(`${city}|${url}`).digest('hex')
  return path.join(EXTERNAL_CACHE_DIR, city, `${hash}.${suffix}`)
}

const classifyMimeExtension = (mimeType: string | undefined, fallback: string) => {
  if (!mimeType) return fallback
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('zip')) return 'zip'
  if (mimeType.includes('json')) return 'json'
  if (mimeType.includes('html')) return 'html'
  if (mimeType.includes('xml')) return 'xml'
  return fallback
}

const fetchExternalArtifact = async (
  city: string,
  url: string,
  artifactType: CollectedCityInputs['artifacts'][number]['artifactType'],
) => {
  const domain = new URL(url).hostname.replace(/^www\./, '')
  if (
    !tryConsumeDomainFetchBudget({
      domain,
      url,
      reason: `${city}:${artifactType}`,
    })
  ) {
    throw new Error(`Per-domain fetch cap reached for ${domain}.`)
  }

  if (artifactType === 'OFFICIAL_PAGE' || artifactType === 'PRESS_RELEASE') {
    const browserRendered = await collectBrowserRenderedArtifact({
      city,
      url,
      artifactType,
    }).catch(() => null)
    if (browserRendered) {
      return browserRendered
    }
  }

  const timeoutMs = applyAutomationTimeoutCeiling(getAutomationRuntimeCaps().httpTimeoutMs, 20000)
  const startedAt = Date.now()
  const response = await axios
    .get(url, {
      responseType:
        artifactType === 'MAP_PDF' || artifactType === 'GTFS_FEED' ? 'arraybuffer' : 'text',
      timeout: timeoutMs,
      maxContentLength: 4 * 1024 * 1024,
      headers: {
        'User-Agent': 'MetroMemoryAutomation/1.0',
      },
    })
    .then((value) => {
      recordAutomationFetchResult({
        domain,
        success: true,
        kind: 'external-artifact',
        durationMs: Date.now() - startedAt,
        metadata: {
          city,
          artifactType,
        },
      })
      return value
    })
    .catch((error) => {
      recordAutomationFetchResult({
        domain,
        success: false,
        kind: 'external-artifact',
        durationMs: Date.now() - startedAt,
        metadata: {
          city,
          artifactType,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    })

  const mimeType = String(response.headers['content-type'] || '').toLowerCase() || undefined
  const extension = classifyMimeExtension(
    mimeType,
    artifactType === 'MAP_PDF' ? 'pdf' : artifactType === 'GTFS_FEED' ? 'zip' : 'html',
  )
  const cachePath = buildExternalCachePath(city, url, extension)
  ensureDir(path.dirname(cachePath))

  const rawBody =
    typeof response.data === 'string'
      ? response.data
      : Buffer.isBuffer(response.data)
        ? response.data
        : Buffer.from(response.data)

  fs.writeFileSync(cachePath, rawBody)

  let metadataJson: Record<string, any> = {}
  if (typeof rawBody === 'string' && mimeType?.includes('html')) {
    const $ = cheerio.load(rawBody)
    const title = $('title').first().text().trim()
    const headline = $('h1').first().text().trim()
    const linkedPressUrls = $('a[href]')
      .map((_index, element) => String($(element).attr('href') || '').trim())
      .get()
      .filter((href) => /press|news|alert|service-update|update/i.test(href))
      .slice(0, 5)
    metadataJson = {
      title: title || null,
      headline: headline || null,
      linkedPressUrls,
    }
  }

  return {
    artifact: {
      citySlug: city,
      artifactType,
      sourceUrl: url,
      sourceDomain: new URL(url).hostname.replace(/^www\./, ''),
      mimeType,
      localPath: path.relative(ROOT, cachePath).replace(/\\/g, '/'),
      contentHash: createHash('sha256')
        .update(typeof rawBody === 'string' ? rawBody : rawBody)
        .digest('hex'),
      fetchedAt: new Date().toISOString(),
      metadataJson,
    },
    linkedPressUrls:
      Array.isArray(metadataJson.linkedPressUrls) ?
        metadataJson.linkedPressUrls
          .map((href) => {
            try {
              return new URL(href, url).toString()
            } catch {
              return null
            }
          })
          .filter((value): value is string => Boolean(value))
      : [],
  }
}

export const loadRegistries = (): Registry[] => {
  if (!fs.existsSync(REGISTRY_DIR)) return []
  const entries = fs.readdirSync(REGISTRY_DIR).filter((file) => file.endsWith('.json'))
  return entries.map((file) => {
    const raw = fs.readFileSync(path.join(REGISTRY_DIR, file), 'utf8')
    return hydrateRegistryCoverage(JSON.parse(raw) as Registry)
  })
}

export const filterRegistriesByScope = (registries: Registry[], scope: string | undefined) => {
  if (!scope || scope === 'all') return registries
  const normalized = scope.toLowerCase()
  const asiaEurope = new Set(['asia', 'europe'])
  const americasOceania = new Set([
    'north america',
    'south america',
    'oceania',
    'north_america',
    'south_america',
  ])

  return registries.filter((registry) => {
    const continent = registry.continent?.toLowerCase()
    if (!continent) return false
    if (normalized === 'asia-europe') return asiaEurope.has(continent)
    if (normalized === 'americas-oceania') return americasOceania.has(continent)
    return true
  })
}

const buildOverpassQuery = (
  registry: Registry,
  options: {
    bboxOverride?: [number, number, number, number]
    includeStations?: boolean
  } = {},
) => {
  const [minLat, minLon, maxLat, maxLon] = options.bboxOverride || getRegistryBbox(registry)
  const bbox = `${minLat},${minLon},${maxLat},${maxLon}`
  const modes = registry.modes?.length ? registry.modes : DEFAULT_MODES
  const railwayModes = modes.filter((m) => !['cable_car', 'gondola', 'chair_lift'].includes(m))
  const aerialModes = modes.filter((m) => ['cable_car', 'gondola', 'chair_lift'].includes(m))

  const railwayRegex = railwayModes.length
    ? railwayModes.map((m) => m.replace(/[^a-z_]/g, '')).join('|')
    : ''
  const routeRegex = railwayRegex
  const aerialRegex = aerialModes.length
    ? aerialModes.map((m) => m.replace(/[^a-z_]/g, '')).join('|')
    : ''

  const parts = [] as string[]
  if (railwayRegex) {
    parts.push(`way["railway"~"^(${railwayRegex})$"](${bbox});`)
    parts.push(`relation["route"~"^(${routeRegex})$"](${bbox});`)
  }
  if (aerialRegex) {
    parts.push(`way["aerialway"~"^(${aerialRegex})$"](${bbox});`)
    parts.push(`relation["route"~"^(${aerialRegex})$"](${bbox});`)
  }
  if (options.includeStations !== false) {
    parts.push(`node["public_transport"="station"](${bbox});`)
    parts.push(`node["railway"="station"](${bbox});`)
    parts.push(`node["public_transport"="stop_position"](${bbox});`)
    parts.push(`node["aerialway"="station"](${bbox});`)
    parts.push(`relation["public_transport"="stop_area"](${bbox});`)
  }

  return `[
    out:json
  ][timeout:120];
  (
    ${parts.join('\n    ')}
  );
  out body;
  >;
  out skel qt;`
}

const getOverpassCachePath = (city: string) => path.join(CACHE_DIR, `${city}-overpass.json`)

const fetchOverpass = async (
  registry: Registry,
  options: {
    bootstrapOnly?: boolean
  } = {},
) => {
  ensureDir(CACHE_DIR)
  const cachePath = getOverpassCachePath(registry.city)
  if (process.env.METRO_SYNC_USE_CACHE === '1' && fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  }
  const url = 'https://overpass-api.de/api/interpreter'
  const timeoutMs = Number(process.env.METRO_SYNC_OVERPASS_HTTP_TIMEOUT_MS || 30000)
  const boundedTimeoutMs = applyAutomationTimeoutCeiling(timeoutMs, 30000)
  const includeStations = !options.bootstrapOnly
  const bbox = getRegistryBbox(registry)

  const runQuery = async (bboxOverride?: [number, number, number, number]) => {
    const query = buildOverpassQuery(registry, { bboxOverride, includeStations })
    const res = await axios.post(url, query, {
      headers: { 'Content-Type': 'text/plain' },
      maxBodyLength: Infinity,
      timeout: Number.isFinite(boundedTimeoutMs) && boundedTimeoutMs > 0 ? boundedTimeoutMs : 30000,
    })
    return res.data
  }

  try {
    const data = await runQuery()
    const elementCount = Array.isArray(data?.elements) ? data.elements.length : 0
    if (options.bootstrapOnly && elementCount === 0 && bboxNeedsTiling(bbox)) {
      const tiledResponses = []
      for (const tile of splitBbox(bbox, 2)) {
        tiledResponses.push(await runQuery(tile))
      }
      const merged = mergeOverpassResponses(tiledResponses)
      fs.writeFileSync(cachePath, JSON.stringify(merged))
      return merged
    }
    fs.writeFileSync(cachePath, JSON.stringify(data))
    return data
  } catch (error) {
    if (!options.bootstrapOnly || !bboxNeedsTiling(bbox)) {
      throw error
    }

    const tiledResponses = []
    for (const tile of splitBbox(bbox, 2)) {
      try {
        tiledResponses.push(await runQuery(tile))
      } catch {
        // ignore failing tile so partial bootstrap can still succeed
      }
    }
    const merged = mergeOverpassResponses(tiledResponses)
    fs.writeFileSync(cachePath, JSON.stringify(merged))
    return merged
  }
}

export const isOpenFeature = (props: Record<string, any>) => {
  if (!props) return true
  const lifecycleKeys = ['construction', 'proposed', 'disused', 'abandoned', 'planned']
  if (!lifecycleKeys.every((key) => !props[key])) return false
  if (props.access === 'private') return false
  if (props['construction:railway']) return false
  if (props['proposed:railway']) return false
  if (props.opening_date) {
    const date = new Date(props.opening_date)
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      return false
    }
  }
  return true
}

export const collectCityInputs = async (
  registry: Registry,
  options: {
    includeExternalArtifacts?: boolean
    bootstrapOnly?: boolean
    researchTasks?: ResearchTaskRequest[]
    sourceDiscoveryMode?: ResearchDiscoveryMode
  } = {},
): Promise<CollectedCityInputs> => {
  const overpassData = await fetchOverpass(registry, {
    bootstrapOnly: options.bootstrapOnly,
  })
  const geojson = osmtogeojson(overpassData)

  const lineFeatures = (geojson.features || []).filter((feature: any) => {
    if (feature.geometry?.type !== 'LineString' && feature.geometry?.type !== 'MultiLineString') {
      return false
    }
    return isOpenFeature(feature.properties || {})
  })

  const stationFeatures = (geojson.features || []).filter((feature: any) => {
    return feature.geometry?.type === 'Point'
  })

  const cachePath = getOverpassCachePath(registry.city)
  const serialized = JSON.stringify(overpassData)
  const externalArtifacts = [] as CollectedCityInputs['artifacts']
  const researchTaskResults: ResearchTaskCollectionResult[] = []
  const fetchedUrls = new Set<string>()
  if (options.includeExternalArtifacts) {
    const discoveredSources = discoverRegistrySources(registry)
    const queuedPressUrls = new Set<string>()

    for (const [url, artifactType] of discoveredSources) {
      fetchedUrls.add(url)
      try {
        const fetched = await fetchExternalArtifact(registry.city, url, artifactType)
        externalArtifacts.push(fetched.artifact)
        if (artifactType === 'OFFICIAL_PAGE') {
          fetched.linkedPressUrls.slice(0, 2).forEach((pressUrl) => queuedPressUrls.add(pressUrl))
        }
      } catch {
        // ignore collector fetch failures for non-OSM sources
      }
    }

    for (const pressUrl of Array.from(queuedPressUrls).slice(0, 4)) {
      if (discoveredSources.some(([url]) => url === pressUrl)) continue
      fetchedUrls.add(pressUrl)
      try {
        const fetched = await fetchExternalArtifact(registry.city, pressUrl, 'PRESS_RELEASE')
        externalArtifacts.push(fetched.artifact)
      } catch {
        // ignore press-release collector failures
      }
    }
  }

  if (Array.isArray(options.researchTasks) && options.researchTasks.length > 0) {
    const taskBudget = getAutomationRuntimeCaps().maxResearchTasksPerRun
    const researchTasks =
      taskBudget && options.researchTasks.length > taskBudget
        ? options.researchTasks.slice(0, taskBudget)
        : options.researchTasks

    if (taskBudget && options.researchTasks.length > researchTasks.length) {
      recordAutomationObservation(
        'warn',
        'research_task_list_truncated',
        'Research task list was truncated by the per-run task cap before collection started.',
        {
          requested: options.researchTasks.length,
          allowed: researchTasks.length,
          city: registry.city,
        },
      )
    }

    for (const task of researchTasks) {
      if (!tryConsumeResearchTaskBudget(1, { city: registry.city, taskType: task.taskType })) {
        continue
      }
      const memoryContext =
        process.env.DATABASE_URL && String(process.env.METRO_SYNC_ENABLE_MEMORY || '1') === '1'
          ? await getResearchMemoryPlannerContext({
              citySlug: registry.city,
              candidateTitle: task.candidateTitle || task.title,
              entityKey: task.entityKey,
            }).catch(() => null)
          : null
      let fetchErrorCount = 0
      let retryableFailure = false
      const taskFetchedUrls: string[] = []
      const failedUrls: string[] = []
      const discoveredSources = await discoverResearchTaskSources({
        registry,
        task,
        mode: options.sourceDiscoveryMode || 'official-first',
      })
      const queuedPressUrls = new Set<string>()

      for (const [url, discovery] of discoveredSources) {
        if (fetchedUrls.has(url)) continue
        fetchedUrls.add(url)
        try {
          const fetched = await fetchExternalArtifact(registry.city, url, discovery.artifactType)
          taskFetchedUrls.push(url)
          externalArtifacts.push({
            ...fetched.artifact,
            metadataJson: {
              ...(fetched.artifact.metadataJson || {}),
              researchTaskType: task.taskType,
              researchTaskTitle: task.title,
              researchCandidateTitle: task.candidateTitle || null,
              researchEntityKey: task.entityKey || null,
              discoveryQuery: discovery.query,
              discoveryMode: options.sourceDiscoveryMode || 'official-first',
            },
          })
          if (
            discovery.artifactType === 'OFFICIAL_PAGE' &&
            task.taskType !== 'FIND_GTFS_FEED' &&
            task.taskType !== 'FIND_MAP_PDF'
          ) {
            fetched.linkedPressUrls.slice(0, 2).forEach((pressUrl) => queuedPressUrls.add(pressUrl))
          }
        } catch (error) {
          fetchErrorCount += 1
          failedUrls.push(url)
          retryableFailure = retryableFailure || isRetryableNetworkError(error)
          // ignore task-level fetch failures and continue with the remaining discoveries
        }
      }

      for (const pressUrl of queuedPressUrls) {
        if (fetchedUrls.has(pressUrl)) continue
        fetchedUrls.add(pressUrl)
        try {
          const fetched = await fetchExternalArtifact(registry.city, pressUrl, 'PRESS_RELEASE')
          taskFetchedUrls.push(pressUrl)
          externalArtifacts.push({
            ...fetched.artifact,
            metadataJson: {
              ...(fetched.artifact.metadataJson || {}),
              researchTaskType: task.taskType,
              researchTaskTitle: task.title,
              researchCandidateTitle: task.candidateTitle || null,
              researchEntityKey: task.entityKey || null,
              discoveryQuery: 'linked-press-url',
              discoveryMode: options.sourceDiscoveryMode || 'official-first',
            },
          })
        } catch (error) {
          fetchErrorCount += 1
          failedUrls.push(pressUrl)
          retryableFailure = retryableFailure || isRetryableNetworkError(error)
          // ignore linked press failures
        }
      }

      researchTaskResults.push({
        taskType: task.taskType,
        title: task.title,
        artifactCount: externalArtifacts.filter((artifact) => {
          const metadata =
            artifact.metadataJson && typeof artifact.metadataJson === 'object'
              ? artifact.metadataJson
              : {}
          return String(metadata.researchTaskType || '') === task.taskType
        }).length,
        discoveredCount: discoveredSources.length,
        fetchErrorCount,
        retryableFailure,
        exhaustedByPolicy: discoveredSources.length === 0 && fetchErrorCount === 0,
        fetchedUrls: taskFetchedUrls,
        failedUrls,
        preferredDomains: memoryContext?.preferredDomains || [],
        memoryInfluenced: Boolean(
          memoryContext &&
            (
              memoryContext.aliases.length > 0 ||
              memoryContext.historicalKeywords.length > 0 ||
              memoryContext.candidateHints.length > 0 ||
              memoryContext.preferredDomains.length > 0 ||
              memoryContext.preferredQueryFragments.length > 0
            ),
        ),
      })
    }
  }

  return {
    overpassData,
    lineFeatures,
    stationFeatures,
    extractedFacts: [],
    researchTaskResults,
    artifacts: [
      {
        citySlug: registry.city,
        artifactType: 'OSM_OVERPASS',
        sourceUrl: 'https://overpass-api.de/api/interpreter',
        sourceDomain: 'overpass-api.de',
        mimeType: 'application/json',
        localPath: path.relative(ROOT, cachePath).replace(/\\/g, '/'),
        contentHash: createHash('sha256').update(serialized).digest('hex'),
        fetchedAt: new Date().toISOString(),
        metadataJson: {
          bbox: registry.bbox,
          modeCount: registry.modes?.length || DEFAULT_MODES.length,
        },
      },
      ...externalArtifacts,
    ],
  }
}

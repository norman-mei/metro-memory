import fs from 'fs'
import path from 'path'

import { buildBootstrapLineProposals } from './bootstrap.ts'
import { collectCityInputs } from './collect.ts'
import { resolveRegistryResearchPlan } from './schedule.ts'
import type { Registry } from './types.ts'

const ROOT = process.cwd()
const REGISTRY_DIR = path.join(ROOT, 'city-registry')
const GAME_ROOT = path.join(ROOT, 'src', 'app', '(game)')
const CITY_COORDINATES_PATH = path.join(ROOT, 'src', 'lib', 'cityCoordinates.ts')
const CITY_PATH_MAP_PATH = path.join(ROOT, 'src', 'lib', 'cityPathMap.ts')

const COUNTRY_LANGUAGE_MAP: Record<string, string[]> = {
  usa: ['en'],
  canada: ['en', 'fr'],
  mexico: ['es'],
  venezuela: ['es'],
  uk: ['en'],
  france: ['fr'],
  germany: ['de'],
  austria: ['de'],
  sweden: ['sv'],
  hungary: ['hu'],
  spain: ['es'],
  turkey: ['tr'],
  china: ['zh'],
  japan: ['ja'],
  'south-korea': ['ko'],
  'north-korea': ['ko'],
  taiwan: ['zh'],
  vietnam: ['vi'],
  thailand: ['th'],
  indonesia: ['id'],
  malaysia: ['ms'],
  singapore: ['en'],
  philippines: ['tl'],
  'new-zealand': ['en'],
  australia: ['en'],
  algeria: ['ar', 'fr'],
}

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

const DEFAULT_DELTA = 0.5
const LARGE_DELTA = 3

const parseExportedObject = (filePath: string, exportName: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const pattern = new RegExp(
    `export const ${exportName}(?::[^=]+)? = (\\{[\\s\\S]*?\\n\\})`,
  )
  const match = source.match(pattern)
  if (!match) {
    throw new Error(`Failed to parse ${exportName} from ${filePath}`)
  }
  return new Function(`return ${match[1]}`)() as Record<string, any>
}

const CITY_PATH_MAP = parseExportedObject(CITY_PATH_MAP_PATH, 'CITY_PATH_MAP') as Record<
  string,
  string
>
const CITY_COORDINATES = parseExportedObject(CITY_COORDINATES_PATH, 'CITY_COORDINATES') as Record<
  string,
  [number, number]
>

const args = process.argv.slice(2)
const parsedArgs = new Map<string, string>()
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (!arg.startsWith('--')) continue
  const [key, inlineValue] = arg.slice(2).split('=')
  const nextValue = inlineValue ?? args[index + 1]
  parsedArgs.set(key, nextValue)
  if (inlineValue === undefined) index += 1
}

const getArg = (key: string) => parsedArgs.get(key)

const parseBbox = (value: string | undefined) => {
  if (!value) return null
  const parts = value.split(',').map((part) => Number(part.trim()))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  return parts as [number, number, number, number]
}

const isLargeRegion = (slug: string) =>
  slug === 'california-state' || slug === 'florida-state' || slug === 'amtrak'

const computeBboxFromGeojson = (geojsonPath: string) => {
  if (!fs.existsSync(geojsonPath)) return null
  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'))
  const coords: [number, number][] = []

  const addCoords = (arr: any[]) => {
    arr.forEach((entry) => {
      if (!Array.isArray(entry)) return
      if (typeof entry[0] === 'number' && typeof entry[1] === 'number') {
        coords.push([entry[0], entry[1]])
      } else {
        addCoords(entry)
      }
    })
  }

  const ingestCollection = (collection: any) => {
    const features = collection?.features || []
    if (!Array.isArray(features)) return
    features.forEach((feature: any) => {
      if (feature?.geometry?.coordinates) addCoords(feature.geometry.coordinates)
    })
  }

  if (data?.type === 'FeatureCollection') {
    ingestCollection(data)
  } else if (data?.features && data?.routes) {
    ingestCollection(data.features)
    ingestCollection(data.routes)
  }

  if (!coords.length) return null

  const lons = coords.map(([lon]) => lon)
  const lats = coords.map(([, lat]) => lat)
  return [
    Math.min(...lats),
    Math.min(...lons),
    Math.max(...lats),
    Math.max(...lons),
  ] as [number, number, number, number]
}

const inferBbox = (slug: string) => {
  const cityPath = CITY_PATH_MAP[slug]
  if (cityPath) {
    const publicPath = path.join(ROOT, 'public', 'city-data', `${slug}.json`)
    const featuresPath = path.join(GAME_ROOT, cityPath, 'data', 'features.json')
    const routesPath = path.join(GAME_ROOT, cityPath, 'data', 'routes.json')

    return (
      computeBboxFromGeojson(publicPath) ||
      computeBboxFromGeojson(featuresPath) ||
      computeBboxFromGeojson(routesPath)
    )
  }

  const center = CITY_COORDINATES[slug]
  if (!center) return null
  const [lon, lat] = center
  const delta = isLargeRegion(slug) ? LARGE_DELTA : DEFAULT_DELTA
  return [lat - delta, lon - delta, lat + delta, lon + delta] as [number, number, number, number]
}

const inferContinent = (slug: string) => {
  const cityPath = CITY_PATH_MAP[slug]
  if (!cityPath) return null
  return cityPath.split('/')[0].replace('-', ' ')
}

const inferLocalLanguages = (slug: string) => {
  const cityPath = CITY_PATH_MAP[slug]
  if (!cityPath) return []
  const country = cityPath.split('/')[1]
  return COUNTRY_LANGUAGE_MAP[country] || []
}

const main = async () => {
  const city = getArg('city') || getArg('slug')
  if (!city) {
    throw new Error('Missing required --city=<slug> argument')
  }

  const bbox = parseBbox(getArg('bbox')) || inferBbox(city)
  if (!bbox) {
    throw new Error(`Could not infer bbox for ${city}; pass --bbox=minLat,minLon,maxLat,maxLon`)
  }

  const continent = getArg('continent') || inferContinent(city)
  const localLanguages = (getArg('localLanguages') || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  const modes = (getArg('modes') || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  const registry: Registry = {
    city,
    continent: continent || undefined,
    bbox,
    localLanguages: localLanguages.length ? localLanguages : inferLocalLanguages(city),
    modes: modes.length ? modes : DEFAULT_MODES,
    lines: [],
    stationAliases: {},
    stationLocalNames: {},
    manualCoords: {},
  }

  const collected = await collectCityInputs(registry, { includeExternalArtifacts: false })
  const lines = buildBootstrapLineProposals({
    registry,
    lineFeatures: collected.lineFeatures,
    startOrder: 0,
  }).map((proposal) => ({
    id: proposal.id,
    name: proposal.name,
    keywords: proposal.keywords,
    order: proposal.order,
  }))

  registry.lines = lines

  const plan = resolveRegistryResearchPlan(registry, new Date(), 'batch')
  registry.automation = {
    researchTier: plan.tier,
    cadenceMonths: plan.cadenceMonths,
    batchSlot: plan.batchSlot,
  }

  const output = `${JSON.stringify(registry, null, 2)}\n`
  if (getArg('dryRun') === '1' || getArg('dry-run') === '1') {
    process.stdout.write(output)
    return
  }

  fs.mkdirSync(REGISTRY_DIR, { recursive: true })
  const outputPath = path.join(REGISTRY_DIR, `${city}.json`)
  if (fs.existsSync(outputPath) && getArg('overwrite') !== '1') {
    throw new Error(`Registry already exists at ${outputPath}; pass --overwrite=1 to replace it`)
  }
  fs.writeFileSync(outputPath, output)
  console.log(
    `Wrote ${outputPath} with ${lines.length} bootstrapped lines (${plan.tier}, every ${plan.cadenceMonths} month(s)).`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

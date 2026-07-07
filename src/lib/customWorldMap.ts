import 'server-only'

import path from 'path'
import { readFile } from 'fs/promises'
import { createHash } from 'crypto'

import bbox from '@turf/bbox'

import { AVAILABLE_CITY_SLUGS } from './availableCityData'
import { CITY_PATH_MAP } from './cityPathMap'
import { isColorLight } from './colorUtils'
import type {
  Config,
  DataFeature,
  DataFeatureCollection,
  Line,
  RoutesFeatureCollection,
} from './types'
import {
  normalizeWorldSelection,
  type WorldMapSelection,
} from './customWorldMapSelection'

type CityDataPayload = {
  features: DataFeatureCollection
  routes: RoutesFeatureCollection
}

const DEFAULT_LINE_COLOR = '#64748b'

// A generic Mapbox style that works with any token (the per-city styles live on
// a private account). Overridable via env for deployments with a custom style.
const WORLD_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE?.trim() || 'mapbox://styles/mapbox/light-v11'

const readCityDataPayload = async (slug: string): Promise<CityDataPayload | null> => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'city-data', `${slug}.json`)
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as CityDataPayload
  } catch {
    return null
  }
}

const prettifyCityName = (slug: string): string =>
  slug
    .split('-')
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(' ')

type DerivedLine = { name: string; color: string; order: number }

/**
 * Derives per-line metadata (name, color, order) for a city straight from its
 * route geometry, so we don't need the city's TypeScript config module. Lines
 * that only appear on station features (no route) fall back to sane defaults.
 */
export const deriveCityLines = (payload: CityDataPayload): Map<string, DerivedLine> => {
  const lines = new Map<string, DerivedLine>()

  payload.routes.features.forEach((feature) => {
    const lineId = feature.properties?.line
    if (typeof lineId !== 'string' || lines.has(lineId)) {
      return
    }
    lines.set(lineId, {
      name: feature.properties?.name || lineId,
      color: feature.properties?.color || DEFAULT_LINE_COLOR,
      order: feature.properties?.order ?? lines.size,
    })
  })

  // Include lines that have stations but no route geometry.
  payload.features.features.forEach((feature) => {
    const lineId = feature.properties?.line
    if (typeof lineId === 'string' && !lines.has(lineId)) {
      lines.set(lineId, { name: lineId, color: DEFAULT_LINE_COLOR, order: lines.size })
    }
  })

  return lines
}

const buildLine = (meta: DerivedLine, order: number): Line => ({
  name: meta.name,
  color: meta.color,
  backgroundColor: meta.color,
  textColor: isColorLight(meta.color) ? '#1f2937' : '#ffffff',
  order,
})

const namespaceLineId = (citySlug: string, lineId: string) => `${citySlug}__${lineId}`

const namespaceClusterKey = (
  citySlug: string,
  clusterKey: number | string | undefined,
): string | undefined =>
  clusterKey === undefined || clusterKey === null
    ? undefined
    : `${citySlug}::${clusterKey}`

/**
 * Loads the selected cities, filters each to its chosen lines, namespaces line
 * ids / cluster keys, re-ids stations globally so they don't collide, merges
 * everything into a single Config + feature/route collections, and auto-fits the
 * map to the combined bounds. Returns null if no valid line survives.
 */
export const loadCustomWorldMapAssets = async (
  rawSelection: WorldMapSelection,
  customTitle: string,
) => {
  const selection = normalizeWorldSelection(rawSelection).filter(
    (entry) => AVAILABLE_CITY_SLUGS.has(entry.city) && CITY_PATH_MAP[entry.city],
  )
  if (selection.length === 0) {
    return null
  }

  const payloads = await Promise.all(
    selection.map(async (entry) => ({ entry, payload: await readCityDataPayload(entry.city) })),
  )

  const mergedLines: Record<string, Line> = {}
  const lineGroups: NonNullable<Config['LINE_GROUPS']> = []
  const mergedFeatures: DataFeature[] = []
  const mergedRoutes: RoutesFeatureCollection['features'] = []
  let lineOrder = 0
  let nextFeatureId = 1

  for (const { entry, payload } of payloads) {
    if (!payload) {
      continue
    }

    const cityLineMeta = deriveCityLines(payload)
    const requestedLines = entry.lines.filter((lineId) => cityLineMeta.has(lineId))
    if (requestedLines.length === 0) {
      continue
    }

    const includeSet = new Set(requestedLines)
    const namespacedIds: string[] = []

    requestedLines.forEach((lineId) => {
      const ns = namespaceLineId(entry.city, lineId)
      const meta = cityLineMeta.get(lineId) ?? {
        name: lineId,
        color: DEFAULT_LINE_COLOR,
        order: 0,
      }
      mergedLines[ns] = buildLine(meta, lineOrder++)
      namespacedIds.push(ns)
    })

    payload.features.features.forEach((feature) => {
      const lineId = feature.properties?.line
      if (typeof lineId !== 'string' || !includeSet.has(lineId)) {
        return
      }
      const id = nextFeatureId++
      mergedFeatures.push({
        ...feature,
        id,
        properties: {
          ...feature.properties,
          id,
          line: namespaceLineId(entry.city, lineId),
          cluster_key: namespaceClusterKey(entry.city, feature.properties?.cluster_key),
        },
      })
    })

    payload.routes.features.forEach((feature) => {
      const lineId = feature.properties?.line
      if (typeof lineId !== 'string' || !includeSet.has(lineId)) {
        return
      }
      mergedRoutes.push({
        ...feature,
        properties: {
          ...feature.properties,
          line: namespaceLineId(entry.city, lineId),
        },
      })
    })

    lineGroups.push({
      title: prettifyCityName(entry.city),
      items: [{ type: 'lines', lines: namespacedIds }],
    })
  }

  if (Object.keys(mergedLines).length === 0 || mergedFeatures.length === 0) {
    return null
  }

  const features: DataFeatureCollection = {
    type: 'FeatureCollection',
    features: mergedFeatures,
  }
  const routes: RoutesFeatureCollection = {
    type: 'FeatureCollection',
    features: mergedRoutes,
  }

  const boundsSource = mergedRoutes.length > 0 ? routes : features
  const [minLng, minLat, maxLng, maxLat] = bbox(boundsSource)
  const hasBounds = [minLng, minLat, maxLng, maxLat].every((value) => Number.isFinite(value))

  const selectionKey = createHash('sha1')
    .update(JSON.stringify(selection))
    .digest('hex')
    .slice(0, 12)
  const slug = `custom-world-${selectionKey}`
  const title = customTitle.trim() || 'Custom World Map'

  const config: Config = {
    MAP_FROM_DATA: true,
    MAP_RENDER_CULLING: { enabled: true, paddingFactor: 0.5 },
    LOCALE: 'en',
    CITY_NAME: slug,
    MAP_CONFIG: {
      container: 'map',
      style: WORLD_MAP_STYLE,
      fadeDuration: 50,
      ...(hasBounds
        ? {
            bounds: [
              [minLng, minLat],
              [maxLng, maxLat],
            ] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: 48 },
          }
        : { center: [0, 20] as [number, number], zoom: 1.4 }),
    },
    METADATA: { title: `${title} — Metro Memory`, description: title },
    LINES: mergedLines,
    LINE_GROUPS: lineGroups,
  }

  const definition = { slug, title, selection }

  return { config, features, routes, definition }
}

import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

import type { CollectedArtifact, ReviewCandidate, ReviewSource } from './types'

const ROOT = process.cwd()
const STATION_MOVE_THRESHOLD_METERS = 120
const STATION_RENAME_DISTANCE_THRESHOLD_METERS = 220
const STATION_SUFFIX_PATTERN =
  /\b(station|stn|sta|metro|subway|mrt|lrt|railway|rail|stop)\b/gi
const PLATFORM_SUFFIX_PATTERN = /\b(platform|plat)\s*\d+[a-z]?\b/gi

const normalize = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

const normalizeStationName = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(STATION_SUFFIX_PATTERN, ' ')
    .replace(PLATFORM_SUFFIX_PATTERN, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')

const splitStationVariants = (value: string | undefined | null) => {
  const raw = String(value || '').trim()
  if (!raw) return []
  return Array.from(
    new Set(
      [
        raw,
        ...raw.split('/'),
        ...raw.split('·'),
        ...raw.split('('),
        ...raw.split('–'),
        ...raw.split('-'),
      ]
        .map((part) => normalizeStationName(part))
        .filter(Boolean),
    ),
  )
}

const splitStationTokens = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(STATION_SUFFIX_PATTERN, ' ')
    .replace(PLATFORM_SUFFIX_PATTERN, ' ')
    .split(/[^\p{L}\p{N}]+/gu)
    .map((part) => part.trim())
    .filter(Boolean)

const stationNamesLookRelated = (left: string, right: string) => {
  const normalizedLeft = normalizeStationName(left)
  const normalizedRight = normalizeStationName(right)
  if (!normalizedLeft || !normalizedRight) return false
  if (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return true
  }

  const leftTokens = new Set(splitStationTokens(left))
  const rightTokens = new Set(splitStationTokens(right))
  const sharedTokenCount = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length
  return sharedTokenCount > 0
}

const splitCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

const parseCsvText = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const header = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    return header.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = values[index] || ''
      return acc
    }, {})
  })
}

const inferSourceDomain = (url?: string | null) => {
  if (!url) return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

const buildGtfsSource = (
  artifact: CollectedArtifact,
  label: string,
  snippet: string,
  metadata: Record<string, any> = {},
): ReviewSource => ({
  sourceType: 'gtfs-diff',
  label,
  url: artifact.sourceUrl,
  snippet,
  metadata: {
    artifactType: artifact.artifactType,
    sourceDomain: artifact.sourceDomain,
    ...metadata,
  },
})

const collectFeatureKey = (feature: any) => {
  const props = feature?.properties || {}
  return `${props.line || ''}|${props.name || ''}`
}

const getFeatureLineId = (feature: any) => {
  const props = feature?.properties || {}
  return String(props.line || '').trim()
}

const getFeatureName = (feature: any) => {
  const props = feature?.properties || {}
  return String(props.name || '').trim()
}

const haversineMeters = (left: [number, number], right: [number, number]) => {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRadians(right[1] - left[1])
  const dLon = toRadians(right[0] - left[0])
  const lat1 = toRadians(left[1])
  const lat2 = toRadians(right[1])
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const findExistingLineMatch = (existingLines: Record<string, any>, routeLabels: string[]) => {
  const normalizedRoutes = routeLabels.map(normalize).filter(Boolean)
  if (normalizedRoutes.length === 0) return null

  const entries = Object.entries(existingLines || {})
  for (const [lineId, line] of entries) {
    const lineName = typeof line?.name === 'string' ? line.name : lineId
    const variants = [lineId, lineName].map(normalize)
    if (normalizedRoutes.some((route) => variants.includes(route))) {
      return { lineId, line, matchedBy: 'exact' as const }
    }
  }

  for (const [lineId, line] of entries) {
    const lineName = typeof line?.name === 'string' ? line.name : lineId
    const variants = [lineId, lineName].map(normalize)
    if (
      normalizedRoutes.some((route) =>
        variants.some(
          (variant) =>
            variant &&
            route &&
            (variant.includes(route) || route.includes(variant)),
        ),
      )
    ) {
      return { lineId, line, matchedBy: 'fuzzy' as const }
    }
  }

  return null
}

type ExistingStationEntry = {
  feature: any
  lineId: string
  name: string
  nameVariants: string[]
  coordinates: [number, number] | null
}

const buildExistingStationEntries = (existingFeatures: any[]) =>
  existingFeatures.map((feature) => {
    const props = feature?.properties || {}
    const alternateNames = Array.isArray(props.alternate_names) ? props.alternate_names : []
    const stationName = getFeatureName(feature)
    const coordinates =
      Array.isArray(feature?.geometry?.coordinates) && feature.geometry.coordinates.length >= 2
        ? ([Number(feature.geometry.coordinates[0]), Number(feature.geometry.coordinates[1])] as [number, number])
        : null

    return {
      feature,
      lineId: getFeatureLineId(feature),
      name: stationName,
      nameVariants: Array.from(
        new Set(
          [stationName, ...alternateNames]
            .flatMap((name) => splitStationVariants(String(name || '')))
            .filter(Boolean),
        ),
      ),
      coordinates,
    } satisfies ExistingStationEntry
  })

const findBestExistingStationMatch = ({
  stopName,
  stopCoordinates,
  lineId,
  stationEntries,
}: {
  stopName: string
  stopCoordinates: [number, number] | null
  lineId: string
  stationEntries: ExistingStationEntry[]
}) => {
  const stopVariants = splitStationVariants(stopName)
  const sameLineStations = stationEntries.filter((entry) => normalize(entry.lineId) === normalize(lineId))

  const exactByName = sameLineStations.find((entry) =>
    stopVariants.some((variant) => entry.nameVariants.includes(variant)),
  )
  if (exactByName) {
    return { entry: exactByName, matchKind: 'name' as const }
  }

  if (stopCoordinates) {
    const nearestByCoords = sameLineStations
      .filter((entry) => entry.coordinates)
      .map((entry) => ({
        entry,
        distance: haversineMeters(entry.coordinates as [number, number], stopCoordinates),
      }))
      .sort((left, right) => left.distance - right.distance)[0]

    if (nearestByCoords && nearestByCoords.distance <= STATION_RENAME_DISTANCE_THRESHOLD_METERS) {
      const likelyRename =
        nearestByCoords.distance <= STATION_MOVE_THRESHOLD_METERS ||
        stationNamesLookRelated(nearestByCoords.entry.name, stopName)

      if (!likelyRename) {
        return null
      }

      return {
        entry: nearestByCoords.entry,
        matchKind: 'coordinates' as const,
        distanceMeters: nearestByCoords.distance,
      }
    }
  }

  return null
}

const readArtifactBuffer = (artifact: CollectedArtifact) => {
  if (!artifact.localPath) return null
  const absolutePath = path.join(ROOT, artifact.localPath)
  if (!fs.existsSync(absolutePath)) return null
  return fs.readFileSync(absolutePath)
}

type ParsedGtfsSnapshot = {
  routes: Array<{
    routeId: string
    lineName: string
    shortName: string
    longName: string
    color: string | null
    stopIds: string[]
    shapePointCount: number
  }>
  stops: Map<
    string,
    {
      stopId: string
      stopName: string
      coordinates: [number, number] | null
    }
  >
}

const parseGtfsSnapshot = async (artifact: CollectedArtifact): Promise<ParsedGtfsSnapshot | null> => {
  const buffer = readArtifactBuffer(artifact)
  if (!buffer) return null

  try {
    const zip = await JSZip.loadAsync(buffer)
    const routesFile = zip.file(/routes\.txt$/i)?.[0] || null
    const stopsFile = zip.file(/stops\.txt$/i)?.[0] || null
    const tripsFile = zip.file(/trips\.txt$/i)?.[0] || null
    const stopTimesFile = zip.file(/stop_times\.txt$/i)?.[0] || null
    const shapesFile = zip.file(/shapes\.txt$/i)?.[0] || null
    if (!routesFile || !stopsFile) return null

    const [routes, stops, trips, stopTimes, shapes] = await Promise.all([
      parseCsvText(await routesFile.async('string')),
      parseCsvText(await stopsFile.async('string')),
      tripsFile ? parseCsvText(await tripsFile.async('string')) : [],
      stopTimesFile ? parseCsvText(await stopTimesFile.async('string')) : [],
      shapesFile ? parseCsvText(await shapesFile.async('string')) : [],
    ])

    const tripById = new Map(trips.map((trip) => [trip.trip_id, trip]))
    const routeStops = new Map<string, Set<string>>()
    stopTimes.forEach((entry) => {
      const trip = tripById.get(entry.trip_id)
      const routeId = trip?.route_id
      const stopId = entry.stop_id
      if (!routeId || !stopId) return
      const bucket = routeStops.get(routeId) || new Set<string>()
      bucket.add(stopId)
      routeStops.set(routeId, bucket)
    })

    const shapePointCounts = new Map<string, number>()
    shapes.forEach((shape) => {
      const shapeId = shape.shape_id?.trim()
      if (!shapeId) return
      shapePointCounts.set(shapeId, (shapePointCounts.get(shapeId) || 0) + 1)
    })

    const routeShapeCounts = new Map<string, number>()
    trips.forEach((trip) => {
      const routeId = trip.route_id?.trim()
      const shapeId = trip.shape_id?.trim()
      if (!routeId || !shapeId) return
      routeShapeCounts.set(
        routeId,
        Math.max(routeShapeCounts.get(routeId) || 0, shapePointCounts.get(shapeId) || 0),
      )
    })

    return {
      routes: routes
        .map((route) => {
          const longName = route.route_long_name?.trim() || ''
          const shortName = route.route_short_name?.trim() || ''
          const routeId = route.route_id?.trim() || ''
          const lineName = longName || shortName || routeId
          return {
            routeId,
            lineName,
            shortName,
            longName,
            color: route.route_color?.trim() ? `#${route.route_color.trim().replace(/^#/, '').toUpperCase()}` : null,
            stopIds: Array.from(routeStops.get(routeId) || []),
            shapePointCount: routeShapeCounts.get(routeId) || 0,
          }
        })
        .filter((route) => route.lineName),
      stops: new Map(
        stops
          .map((stop) => {
            const lon = Number(stop.stop_lon)
            const lat = Number(stop.stop_lat)
            return [
              stop.stop_id,
              {
                stopId: stop.stop_id,
                stopName: stop.stop_name?.trim() || '',
                coordinates:
                  Number.isFinite(lon) && Number.isFinite(lat) ? ([lon, lat] as [number, number]) : null,
              },
            ] as const
          })
          .filter((entry) => entry[0] && entry[1].stopName),
      ),
    }
  } catch {
    return null
  }
}

export const buildGtfsDiffCandidates = async ({
  city,
  artifacts,
  existingFeatures,
  existingLines,
  stationAliases = {},
  stationLocalNames = {},
}: {
  city: string
  artifacts: CollectedArtifact[]
  existingFeatures: any[]
  existingLines: Record<string, any>
  stationAliases?: Record<string, string>
  stationLocalNames?: Record<string, string[]>
}) => {
  const gtfsArtifact = artifacts.find((artifact) => artifact.artifactType === 'GTFS_FEED' && artifact.localPath)
  if (!gtfsArtifact) return []

  const snapshot = await parseGtfsSnapshot(gtfsArtifact)
  if (!snapshot) return []

  const candidates: ReviewCandidate[] = []
  const stationEntries = buildExistingStationEntries(existingFeatures).map((entry) => {
    const canonicalName = stationAliases[entry.name] || entry.name
    const registryLocalNames = stationLocalNames[canonicalName] || stationLocalNames[entry.name] || []
    return {
      ...entry,
      nameVariants: Array.from(
        new Set(
          [...entry.nameVariants, ...registryLocalNames.flatMap((name) => splitStationVariants(name))]
            .filter(Boolean),
        ),
      ),
    }
  })
  const matchedExistingStationKeys = new Set<string>()
  const processedRemovalLines = new Set<string>()

  snapshot.routes.slice(0, 120).forEach((route) => {
    const lineMatch = findExistingLineMatch(existingLines, [
      route.lineName,
      route.shortName,
      route.routeId,
    ])
    const routeStops = route.stopIds
      .map((stopId) => snapshot.stops.get(stopId))
      .filter((stop): stop is NonNullable<typeof stop> => Boolean(stop))

    if (!lineMatch) {
      candidates.push({
        citySlug: city,
        type: 'NEW_LINE',
        entityKey: route.routeId || normalize(route.lineName),
        title: `GTFS route candidate ${route.lineName}`,
        summary: 'GTFS feed exposes a route that does not map to an existing configured line.',
        confidence: route.stopIds.length >= 4 ? 0.87 : 0.76,
        afterValue: {
          id: route.routeId || normalize(route.lineName),
          name: route.lineName,
          keywords: [route.lineName, route.shortName].filter(Boolean),
          color: route.color || '#888888',
          routeSample: {
            gtfsRouteId: route.routeId,
            gtfsStopCount: route.stopIds.length,
            gtfsShapePointCount: route.shapePointCount,
          },
        },
        diff: {
          change: 'gtfs-new-line',
          routeId: route.routeId,
          stopCount: route.stopIds.length,
          shapePointCount: route.shapePointCount,
        },
        metadata: {
          likelyRealTransitLine: true,
          gtfsDiff: true,
          gtfsStopCount: route.stopIds.length,
          gtfsShapePointCount: route.shapePointCount,
        },
        sources: [
          buildGtfsSource(
            gtfsArtifact,
            `GTFS route ${route.lineName}`,
            `${route.lineName} (${route.stopIds.length} stops, ${route.shapePointCount} shape points)`,
            {
              gtfsRouteId: route.routeId,
              gtfsStopCount: route.stopIds.length,
              gtfsShapePointCount: route.shapePointCount,
            },
          ),
        ],
      })
      return
    }

    const currentLineName =
      typeof lineMatch.line?.name === 'string' && lineMatch.line.name.trim()
        ? lineMatch.line.name.trim()
        : lineMatch.lineId
    if (
      route.longName &&
      normalize(route.longName) !== normalize(currentLineName) &&
      route.longName.length >= 4
    ) {
      candidates.push({
        citySlug: city,
        type: 'LINE_RENAME_CANDIDATE',
        entityKey: lineMatch.lineId,
        title: `Rename ${currentLineName} to ${route.longName}`,
        summary: 'GTFS route naming differs from the current configured line name.',
        confidence: lineMatch.matchedBy === 'exact' ? 0.85 : 0.77,
        beforeValue: {
          id: lineMatch.lineId,
          ...lineMatch.line,
        },
        afterValue: {
          id: lineMatch.lineId,
          ...lineMatch.line,
          name: route.longName,
        },
        diff: {
          change: 'gtfs-line-rename',
          routeId: route.routeId,
          from: currentLineName,
          to: route.longName,
        },
        metadata: {
          gtfsDiff: true,
          requiresOfficialEvidence: true,
          likelyRealTransitLine: true,
        },
        sources: [
          buildGtfsSource(
            gtfsArtifact,
            `GTFS route rename ${route.lineName}`,
            `${route.lineName} / ${route.longName}`,
            { gtfsRouteId: route.routeId },
          ),
        ],
      })
    }

    routeStops.slice(0, 220).forEach((stop) => {
      const exactStationKey = `${lineMatch.lineId}|${stop.stopName}`
      const canonicalStopName = stationAliases[stop.stopName] || stop.stopName
      const existingStationMatch = findBestExistingStationMatch({
        stopName: canonicalStopName,
        stopCoordinates: stop.coordinates,
        lineId: lineMatch.lineId,
        stationEntries,
      })
      const existingStation = existingStationMatch?.entry.feature || null
      if (existingStation) {
        matchedExistingStationKeys.add(collectFeatureKey(existingStation))
      }

      if (!existingStation) {
        candidates.push({
          citySlug: city,
          type: 'NEW_STATION',
          entityKey: exactStationKey,
          title: `Add GTFS station ${exactStationKey}`,
          summary: 'GTFS stop appears on an existing route but is missing from the current game data.',
          confidence: 0.86,
          afterValue: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: stop.coordinates || null,
            },
            properties: {
              name: canonicalStopName,
              line: lineMatch.lineId,
              id: stop.stopId,
              alternate_names:
                canonicalStopName !== stop.stopName
                  ? Array.from(new Set([stop.stopName]))
                  : [],
            },
          },
          diff: {
            change: 'gtfs-stop-add',
            stopId: stop.stopId,
            lineId: lineMatch.lineId,
          },
          metadata: {
            gtfsDiff: true,
            likelyRealTransitLine: true,
            stationLifecycle: 'opening',
            stationUpdateSetKey: `${city}|${lineMatch.lineId}|stations`,
            stationUpdateSetLabel: `${lineMatch.lineId} station update set`,
          },
          sources: [
            buildGtfsSource(
              gtfsArtifact,
              `GTFS stop ${stop.stopName}`,
              `${stop.stopName} on ${route.lineName}`,
              {
                gtfsRouteId: route.routeId,
                stopId: stop.stopId,
                lineName: lineMatch.lineId,
              },
            ),
          ],
        })
        return
      }

      const existingStationName = getFeatureName(existingStation)
      if (
        existingStationMatch?.matchKind === 'coordinates' &&
        normalizeStationName(existingStationName) !== normalizeStationName(stop.stopName)
      ) {
        candidates.push({
          citySlug: city,
          type: 'UPDATED_STATION',
        entityKey: `${lineMatch.lineId}|${existingStationName}`,
        title: `Rename GTFS station ${existingStationName} to ${stop.stopName}`,
          summary: 'GTFS stop location matches an existing station, but the official stop name has changed.',
          confidence: 0.84,
          beforeValue: existingStation,
          afterValue: {
            ...existingStation,
            properties: {
              ...(existingStation.properties || {}),
              name: stop.stopName,
              id: stop.stopId,
              alternate_names: Array.from(
                new Set([
                  ...(Array.isArray(existingStation.properties?.alternate_names)
                    ? existingStation.properties.alternate_names
                    : []),
                  existingStationName,
                ]),
              ),
            },
          },
          diff: {
            change: 'gtfs-stop-rename',
            stopId: stop.stopId,
            lineId: lineMatch.lineId,
            from: existingStationName,
            to: stop.stopName,
            matchKind: existingStationMatch.matchKind,
            distanceMeters: existingStationMatch.distanceMeters || 0,
          },
          metadata: {
            gtfsDiff: true,
            likelyRealTransitLine: true,
            stationLifecycle: 'rename',
            stationUpdateSetKey: `${city}|${lineMatch.lineId}|stations`,
            stationUpdateSetLabel: `${lineMatch.lineId} station update set`,
          },
          sources: [
            buildGtfsSource(
              gtfsArtifact,
              `GTFS stop rename ${stop.stopName}`,
              `${existingStationName} -> ${stop.stopName} on ${route.lineName}`,
              {
                gtfsRouteId: route.routeId,
                stopId: stop.stopId,
                lineName: lineMatch.lineId,
              },
            ),
          ],
        })
      }

      const existingCoords = existingStation?.geometry?.coordinates
      if (
        Array.isArray(existingCoords) &&
        existingCoords.length >= 2 &&
        stop.coordinates &&
        haversineMeters(
          [Number(existingCoords[0]), Number(existingCoords[1])],
          stop.coordinates,
        ) >= STATION_MOVE_THRESHOLD_METERS
      ) {
        candidates.push({
          citySlug: city,
          type: 'UPDATED_STATION',
          entityKey: exactStationKey,
          title: `Update GTFS station ${exactStationKey}`,
          summary: 'GTFS stop coordinates differ materially from the current game data.',
          confidence: 0.79,
          beforeValue: existingStation,
          afterValue: {
            ...existingStation,
            geometry: {
              type: 'Point',
              coordinates: stop.coordinates,
            },
          },
          diff: {
            change: 'gtfs-stop-move',
            stopId: stop.stopId,
            lineId: lineMatch.lineId,
            previousCoordinates: existingCoords,
            nextCoordinates: stop.coordinates,
          },
          metadata: {
            gtfsDiff: true,
            likelyRealTransitLine: true,
            stationLifecycle: 'relocation',
            stationUpdateSetKey: `${city}|${lineMatch.lineId}|stations`,
            stationUpdateSetLabel: `${lineMatch.lineId} station update set`,
          },
          sources: [
            buildGtfsSource(
              gtfsArtifact,
              `GTFS stop move ${stop.stopName}`,
              `${stop.stopName} on ${route.lineName}`,
              {
                gtfsRouteId: route.routeId,
                stopId: stop.stopId,
                lineName: lineMatch.lineId,
              },
            ),
          ],
        })
      }
    })

    const sameLineExistingStations = stationEntries.filter(
      (entry) => normalize(entry.lineId) === normalize(lineMatch.lineId),
    )
    if (
      route.stopIds.length >= 1 &&
      sameLineExistingStations.length > 0 &&
      !processedRemovalLines.has(lineMatch.lineId)
    ) {
      processedRemovalLines.add(lineMatch.lineId)
      sameLineExistingStations.slice(0, 220).forEach((entry) => {
        if (matchedExistingStationKeys.has(collectFeatureKey(entry.feature))) return

        candidates.push({
          citySlug: city,
          type: 'REMOVED_STATION',
          entityKey: `${lineMatch.lineId}|${entry.name}`,
          title: `Remove GTFS station ${entry.name}`,
          summary: 'This station exists in the current game data but was not found in the latest GTFS stop list for the line.',
          confidence: 0.66,
          beforeValue: entry.feature,
          diff: {
            change: 'gtfs-stop-removed',
            lineId: lineMatch.lineId,
            stationName: entry.name,
            gtfsRouteId: route.routeId,
          },
          metadata: {
            gtfsDiff: true,
            likelyRealTransitLine: true,
            stationLifecycle: 'closure',
            requiresOfficialEvidence: true,
            closureConfidence:
              route.stopIds.length >= 6
                ? 0.82
                : route.stopIds.length >= 3
                  ? 0.72
                  : 0.58,
            stationUpdateSetKey: `${city}|${lineMatch.lineId}|stations`,
            stationUpdateSetLabel: `${lineMatch.lineId} station update set`,
          },
          sources: [
            buildGtfsSource(
              gtfsArtifact,
              `GTFS station closure ${entry.name}`,
              `${entry.name} no longer appears on ${route.lineName} in the latest GTFS feed`,
              {
                gtfsRouteId: route.routeId,
                lineName: lineMatch.lineId,
              },
            ),
          ],
        })
      })
    }
  })

  return candidates
}

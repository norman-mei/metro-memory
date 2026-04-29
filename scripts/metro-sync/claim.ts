import type {
  ConfigMetadata,
  ExtractedArtifactFact,
  ReportCity,
  ReviewCandidate,
  ReviewSource,
} from './types'

const buildFeatureKey = (feature: any) => {
  const props = feature?.properties || {}
  return `${props.line}|${props.name}`
}

const buildFeatureMap = (features: any[]) => {
  const map = new Map<string, any>()
  features.forEach((feature) => {
    map.set(buildFeatureKey(feature), feature)
  })
  return map
}

const normalize = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

const STATION_SUFFIX_PATTERN =
  /\b(station|stn|sta|metro|subway|mrt|lrt|railway|rail|stop)\b/gi

const normalizeStationName = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(STATION_SUFFIX_PATTERN, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')

const buildStationNameVariants = (value: string | undefined | null) =>
  Array.from(
    new Set(
      String(value || '')
        .split(/[\/·()\-–]/)
        .map((part) => normalizeStationName(part))
        .filter(Boolean),
    ),
  )

const createOsmSource = (
  city: string,
  metadata: Record<string, any> = {},
): ReviewSource => ({
  sourceType: 'osm',
  label: 'OpenStreetMap / Overpass',
  metadata: { city, ...metadata },
})

const buildFactSource = (fact: ExtractedArtifactFact): ReviewSource => ({
  sourceType: `official-${String(fact.kind).toLowerCase()}`,
  label: fact.label,
  url: fact.sourceUrl,
  snippet: fact.snippet,
  metadata: {
    extractedFactKind: fact.kind,
    artifactType: fact.artifactType,
    extractedFactConfidence: fact.confidence,
    ...(fact.metadata && typeof fact.metadata === 'object' ? fact.metadata : {}),
  },
})

const appendUniqueSources = (target: ReviewSource[], incoming: ReviewSource[]) => {
  const seen = new Set(
    target.map((source) => `${source.sourceType}|${source.url || ''}|${source.label || ''}`),
  )
  incoming.forEach((source) => {
    const key = `${source.sourceType}|${source.url || ''}|${source.label || ''}`
    if (seen.has(key)) return
    seen.add(key)
    target.push(source)
  })
}

const findExistingLineEntry = (existingLines: Record<string, any>, input: string | undefined | null) => {
  const normalizedInput = normalize(input)
  if (!normalizedInput) return null

  const entries = Object.entries(existingLines || {})
  for (const [lineId, value] of entries) {
    const lineName = typeof value?.name === 'string' ? value.name : lineId
    const keys = [lineId, lineName].map(normalize)
    if (keys.includes(normalizedInput)) {
      return { lineId, line: value }
    }
  }

  for (const [lineId, value] of entries) {
    const lineName = typeof value?.name === 'string' ? value.name : lineId
    const keys = [lineId, lineName].map(normalize)
    if (
      keys.some(
        (key) =>
          key &&
          normalizedInput &&
          (key.includes(normalizedInput) || normalizedInput.includes(key)),
      )
    ) {
      return { lineId, line: value }
    }
  }

  return null
}

const buildColorAfterValue = (lineId: string, line: any, color: string) => ({
  ...line,
  id: lineId,
  name: typeof line?.name === 'string' && line.name.trim() ? line.name.trim() : lineId,
  color,
  backgroundColor: color,
  textColor: '#FFFFFF',
  progressOutlineColor: color,
})

const buildStructuredStationCandidates = ({
  city,
  existingFeatures,
  nextFeatures,
  extractedFacts,
  stationAliases = {},
  stationLocalNames = {},
}: {
  city: string
  existingFeatures: any[]
  nextFeatures: any[]
  extractedFacts: ExtractedArtifactFact[]
  stationAliases?: Record<string, string>
  stationLocalNames?: Record<string, string[]>
}) => {
  const candidates: ReviewCandidate[] = []
  const createdKeys = new Set<string>()
  const nextStationsByNormalized = new Map(
    nextFeatures.map((feature) => {
      const props = feature?.properties || {}
      const canonicalName = stationAliases[String(props.name || '')] || String(props.name || '')
      const registryLocalNames =
        stationLocalNames[canonicalName] || stationLocalNames[String(props.name || '')] || []
      const variants = Array.from(
        new Set(
          [canonicalName, props.name, ...registryLocalNames]
            .flatMap((name) => buildStationNameVariants(name))
            .filter(Boolean),
        ),
      )
      return variants.map((variant) => [
        `${normalize(props.line)}|${variant}`,
        feature,
      ] as const)
    }).flat(),
  )
  const existingStationsByNormalized = new Map(
    existingFeatures.map((feature) => {
      const props = feature?.properties || {}
      const alternateNames = Array.isArray(props.alternate_names) ? props.alternate_names : []
      const canonicalName = stationAliases[String(props.name || '')] || String(props.name || '')
      const registryLocalNames =
        stationLocalNames[canonicalName] || stationLocalNames[String(props.name || '')] || []
      const variants = Array.from(
        new Set(
          [canonicalName, props.name, ...alternateNames, ...registryLocalNames].flatMap((name) =>
            buildStationNameVariants(name),
          ),
        ),
      )
      return variants.map((variant) => [
        `${normalize(props.line)}|${variant}`,
        feature,
      ] as const)
    }).flat(),
  )

  extractedFacts
    .filter((fact) => fact.kind === 'STATION_REFERENCE')
    .slice(0, 400)
    .forEach((fact) => {
      const stopName =
        fact.metadata && typeof fact.metadata === 'object' && 'stopName' in fact.metadata
          ? String(fact.metadata.stopName || '').trim()
          : ''
      const canonicalStopName = stationAliases[stopName] || stopName
      const lineHint =
        fact.metadata && typeof fact.metadata === 'object' && 'lineName' in fact.metadata
          ? String(fact.metadata.lineName || '').trim()
          : ''
      if (!stopName) return

      const registryLocalNames =
        stationLocalNames[canonicalStopName] || stationLocalNames[stopName] || []
      const normalizedKeys = Array.from(
        new Set([canonicalStopName, stopName, ...registryLocalNames].flatMap((name) => buildStationNameVariants(name))),
      ).map(
        (variant) => `${normalize(lineHint)}|${variant}`,
      )
      const normalizedKey = normalizedKeys[0] || `${normalize(lineHint)}|${normalizeStationName(stopName)}`
      const nextFeature =
        normalizedKeys.map((key) => nextStationsByNormalized.get(key)).find(Boolean) || null
      const existingFeature =
        normalizedKeys.map((key) => existingStationsByNormalized.get(key)).find(Boolean) || null
      const stopLon =
        fact.metadata && typeof fact.metadata === 'object' && 'stopLon' in fact.metadata
          ? Number(fact.metadata.stopLon)
          : NaN
      const stopLat =
        fact.metadata && typeof fact.metadata === 'object' && 'stopLat' in fact.metadata
          ? Number(fact.metadata.stopLat)
          : NaN
      const stopCoordinates =
        Number.isFinite(stopLon) && Number.isFinite(stopLat) ? [stopLon, stopLat] : null

      if (!nextFeature && !existingFeature) {
        const dedupeKey = `station-add|${normalizedKey}`
        if (createdKeys.has(dedupeKey)) return
        createdKeys.add(dedupeKey)
        candidates.push({
          citySlug: city,
          type: 'NEW_STATION',
          entityKey: `${lineHint || 'unknown'}|${stopName}`,
          title: `Add official station ${canonicalStopName}${lineHint ? ` on ${lineHint}` : ''}`,
          summary: 'Official GTFS or agency artifacts mention a station missing from current and proposed data.',
          confidence: Math.max(0.74, fact.confidence),
          afterValue: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: stopCoordinates,
            },
            properties: {
              name: stopName,
              alternate_names:
                canonicalStopName !== stopName ? [stopName] : registryLocalNames,
              line: lineHint || 'unknown',
              id:
                fact.metadata && typeof fact.metadata === 'object' && 'stopId' in fact.metadata
                  ? fact.metadata.stopId || null
                  : null,
            },
          },
          diff: {
            change: 'structured-station-add',
            lineName: lineHint || null,
            stopName: canonicalStopName,
          },
          metadata: {
            structuredArtifactCandidate: true,
            likelyRealTransitLine: true,
            stationUpdateSetKey: `${city}|${lineHint || 'unknown'}|stations`,
            stationUpdateSetLabel: `${lineHint || 'unknown'} station update set`,
          },
          sources: [buildFactSource(fact)],
        })
        return
      }

      if (existingFeature && stopCoordinates && Array.isArray(existingFeature?.geometry?.coordinates)) {
        const [currentLon, currentLat] = existingFeature.geometry.coordinates
        if (
          Number.isFinite(Number(currentLon)) &&
          Number.isFinite(Number(currentLat)) &&
          (Math.abs(Number(currentLon) - stopCoordinates[0]) > 0.001 ||
            Math.abs(Number(currentLat) - stopCoordinates[1]) > 0.001)
        ) {
          const dedupeKey = `station-update|${normalizedKey}`
          if (createdKeys.has(dedupeKey)) return
          createdKeys.add(dedupeKey)
          candidates.push({
            citySlug: city,
            type: 'UPDATED_STATION',
            entityKey: `${lineHint || existingFeature.properties?.line || 'unknown'}|${stopName}`,
            title: `Update official station ${canonicalStopName}${lineHint ? ` on ${lineHint}` : ''}`,
            summary: 'Official GTFS or agency artifacts indicate the station coordinates changed.',
            confidence: Math.max(0.72, fact.confidence),
            beforeValue: existingFeature,
            afterValue: {
              ...existingFeature,
              geometry: {
                type: 'Point',
                coordinates: stopCoordinates,
              },
            },
            diff: {
              change: 'structured-station-update',
              lineName: lineHint || null,
              stopName,
            },
            metadata: {
              structuredArtifactCandidate: true,
              likelyRealTransitLine: true,
              stationUpdateSetKey: `${city}|${lineHint || existingFeature.properties?.line || 'unknown'}|stations`,
              stationUpdateSetLabel: `${lineHint || existingFeature.properties?.line || 'unknown'} station update set`,
            },
            sources: [buildFactSource(fact)],
          })
        }
      }
    })

  return candidates
}

const buildOfficialLineUpdateCandidates = ({
  city,
  existingLines,
  extractedFacts,
}: {
  city: string
  existingLines: Record<string, any>
  extractedFacts: ExtractedArtifactFact[]
}) => {
  const candidates: ReviewCandidate[] = []
  const createdKeys = new Set<string>()

  const factGroupsByKey = new Map<string, ExtractedArtifactFact[]>()
  extractedFacts.forEach((fact) => {
    const lineHint =
      fact.lineName ||
      (fact.metadata && typeof fact.metadata === 'object' && 'previousLineName' in fact.metadata
        ? String(fact.metadata.previousLineName || '')
        : '')
    const lineMatch = findExistingLineEntry(existingLines, lineHint)
    if (!lineMatch) return

    const groupKey = `${fact.kind}|${lineMatch.lineId}`
    const items = factGroupsByKey.get(groupKey) || []
    items.push(fact)
    factGroupsByKey.set(groupKey, items)
  })

  for (const [groupKey, facts] of factGroupsByKey.entries()) {
    const first = facts[0]
    const lineHint =
      first.lineName ||
      (first.metadata && typeof first.metadata === 'object' && 'previousLineName' in first.metadata
        ? String(first.metadata.previousLineName || '')
        : '')
    const lineMatch = findExistingLineEntry(existingLines, lineHint)
    if (!lineMatch) continue
    const { lineId, line } = lineMatch
    const nextSources = facts.map(buildFactSource)
    const officialFactCount = facts.length

    if (first.kind === 'LINE_RENAME_REFERENCE') {
      const nextLineName =
        first.metadata && typeof first.metadata === 'object' && 'nextLineName' in first.metadata
          ? String(first.metadata.nextLineName || '').trim()
          : ''
      if (!nextLineName) continue
      const currentLineName =
        typeof line?.name === 'string' && line.name.trim() ? line.name.trim() : lineId
      if (normalize(currentLineName) === normalize(nextLineName)) continue

      const dedupeKey = `${groupKey}|${normalize(nextLineName)}`
      if (createdKeys.has(dedupeKey)) continue
      createdKeys.add(dedupeKey)

      candidates.push({
        citySlug: city,
        type: 'LINE_RENAME_CANDIDATE',
        entityKey: lineId,
        title: `Rename line ${currentLineName} to ${nextLineName}`,
        summary: 'Official artifacts indicate that this line name changed.',
        confidence: Math.max(0.74, ...facts.map((fact) => fact.confidence)),
        beforeValue: {
          id: lineId,
          ...line,
        },
        afterValue: {
          id: lineId,
          ...line,
          name: nextLineName,
        },
        diff: {
          change: 'line-rename',
          lineId,
          from: currentLineName,
          to: nextLineName,
        },
        metadata: {
          officialFactCount,
          likelyRealTransitLine: true,
          officialFactKinds: facts.map((fact) => fact.kind),
          requiresOfficialEvidence: true,
        },
        sources: nextSources,
      })
      continue
    }

    if (first.kind === 'LINE_COLOR_REFERENCE') {
      const proposedColor =
        first.metadata && typeof first.metadata === 'object' && 'color' in first.metadata
          ? String(first.metadata.color || '').trim()
          : ''
      if (!proposedColor) continue
      const currentColor = typeof line?.color === 'string' ? line.color.trim() : ''
      if (normalize(currentColor) === normalize(proposedColor)) continue

      const dedupeKey = `${groupKey}|${normalize(proposedColor)}`
      if (createdKeys.has(dedupeKey)) continue
      createdKeys.add(dedupeKey)

      candidates.push({
        citySlug: city,
        type: 'LINE_COLOR_CANDIDATE',
        entityKey: lineId,
        title: `Update line color for ${line?.name || lineId}`,
        summary: 'Official artifacts and GTFS data indicate a color update for this line.',
        confidence: Math.max(0.76, ...facts.map((fact) => fact.confidence)),
        beforeValue: {
          id: lineId,
          ...line,
        },
        afterValue: buildColorAfterValue(lineId, line, proposedColor),
        diff: {
          change: 'line-color-update',
          lineId,
          from: currentColor || null,
          to: proposedColor,
        },
        metadata: {
          officialFactCount,
          likelyRealTransitLine: true,
          officialFactKinds: facts.map((fact) => fact.kind),
          requiresOfficialEvidence: true,
        },
        sources: nextSources,
      })
    }
  }

  return candidates
}

const buildOfficialOperatorMetadataCandidate = ({
  city,
  configMetadata,
  extractedFacts,
}: {
  city: string
  configMetadata: ConfigMetadata | null
  extractedFacts: ExtractedArtifactFact[]
}) => {
  if (!configMetadata) return null

  const operatorFacts = extractedFacts.filter(
    (fact) =>
      fact.kind === 'OPERATOR_METADATA_REFERENCE' || fact.kind === 'OPERATOR_REFERENCE',
  )
  if (!operatorFacts.length) return null

  const operatorName = operatorFacts
    .map((fact) =>
      fact.metadata && typeof fact.metadata === 'object' && 'operatorName' in fact.metadata
        ? String(fact.metadata.operatorName || '').trim()
        : '',
    )
    .find(Boolean)
  if (!operatorName) return null

  const suggestedDescription = `How many of the ${operatorName} stations can you name from memory?`
  const currentDescription = configMetadata.description || null
  const currentOpenGraphDescription = configMetadata.openGraphDescription || null

  if (
    currentDescription === suggestedDescription &&
    currentOpenGraphDescription === suggestedDescription
  ) {
    return null
  }

  return {
    citySlug: city,
    type: 'OPERATOR_METADATA_CANDIDATE' as const,
    entityKey: city,
    title: `Update official metadata copy for ${city}`,
    summary: `Official artifacts indicate operator metadata should reflect ${operatorName}.`,
    confidence: Math.max(0.76, ...operatorFacts.map((fact) => fact.confidence)),
    beforeValue: {
      description: currentDescription,
      openGraphDescription: currentOpenGraphDescription,
      title: configMetadata.title,
      openGraphTitle: configMetadata.openGraphTitle,
    },
    afterValue: {
      description: suggestedDescription,
      openGraphDescription: suggestedDescription,
      title: configMetadata.title,
      openGraphTitle: configMetadata.openGraphTitle,
    },
    diff: {
      change: 'operator-metadata-update',
      operator: operatorName,
      from: currentDescription,
      to: suggestedDescription,
    },
    metadata: {
      officialFactCount: operatorFacts.length,
      operatorName,
      requiresOfficialEvidence: true,
    },
    sources: operatorFacts.map(buildFactSource),
  }
}

export const buildReviewCandidates = ({
  city,
  existingFeatures,
  nextFeatures,
  existingLines,
  reportCity,
  configMetadata,
  extractedFacts = [],
  stationAliases = {},
  stationLocalNames = {},
}: {
  city: string
  existingFeatures: any[]
  nextFeatures: any[]
  existingLines: Record<string, any>
  reportCity: ReportCity
  configMetadata: ConfigMetadata | null
  extractedFacts?: ExtractedArtifactFact[]
  stationAliases?: Record<string, string>
  stationLocalNames?: Record<string, string[]>
}) => {
  const existingFeatureMap = buildFeatureMap(existingFeatures)
  const nextFeatureMap = buildFeatureMap(nextFeatures)
  const candidates: ReviewCandidate[] = []

  reportCity.newStations.forEach((entityKey) => {
    const station = nextFeatureMap.get(entityKey)
    candidates.push({
      citySlug: city,
      type: 'NEW_STATION',
      entityKey,
      title: `Add station ${entityKey}`,
      summary: 'Detected from OpenStreetMap near the current route geometry.',
      confidence: 0.78,
      afterValue: station || null,
      diff: {
        change: 'create',
        stationKey: entityKey,
      },
      metadata: {
        stationUpdateSetKey: `${city}|${String(entityKey).split('|')[0] || 'unknown'}|stations`,
        stationUpdateSetLabel: `${String(entityKey).split('|')[0] || 'unknown'} station update set`,
      },
      sources: [createOsmSource(city, { entityKey })],
    })
  })

  reportCity.removedStations.forEach((entityKey) => {
    const station = existingFeatureMap.get(entityKey)
    candidates.push({
      citySlug: city,
      type: 'REMOVED_STATION',
      entityKey,
      title: `Review removed station ${entityKey}`,
      summary:
        'This station was present in existing game data but did not reappear in the latest OSM extraction.',
      confidence: 0.58,
      beforeValue: station || null,
      diff: {
        change: 'remove',
        stationKey: entityKey,
      },
      metadata: {
        stationLifecycle: 'closure',
        stationUpdateSetKey: `${city}|${String(entityKey).split('|')[0] || 'unknown'}|stations`,
        stationUpdateSetLabel: `${String(entityKey).split('|')[0] || 'unknown'} station update set`,
      },
      sources: [createOsmSource(city, { entityKey })],
    })
  })

  reportCity.updatedStations.forEach((entityKey) => {
    const beforeValue = existingFeatureMap.get(entityKey)
    const afterValue = nextFeatureMap.get(entityKey)
    candidates.push({
      citySlug: city,
      type: 'UPDATED_STATION',
      entityKey,
      title: `Update station ${entityKey}`,
      summary: 'Coordinates or station metadata shifted in the latest OSM extraction.',
      confidence: 0.72,
      beforeValue: beforeValue || null,
      afterValue: afterValue || null,
      diff: {
        change: 'update',
        stationKey: entityKey,
        beforeCoordinates: beforeValue?.geometry?.coordinates || null,
        afterCoordinates: afterValue?.geometry?.coordinates || null,
      },
      metadata: {
        stationUpdateSetKey: `${city}|${String(entityKey).split('|')[0] || 'unknown'}|stations`,
        stationUpdateSetLabel: `${String(entityKey).split('|')[0] || 'unknown'} station update set`,
      },
      sources: [createOsmSource(city, { entityKey })],
    })
  })

  reportCity.richLineProposals.forEach((proposal) => {
    candidates.push({
      citySlug: city,
      type: 'NEW_LINE',
      entityKey: proposal.id,
      title: `Review new line candidate ${proposal.name}`,
      summary:
        'OSM route geometry was detected that does not match any configured or inferred line keywords in the registry.',
      confidence: 0.61,
      afterValue: proposal,
      diff: {
        change: 'new-line-candidate',
        lineName: proposal.name,
        lineId: proposal.id,
      },
      metadata: {
        likelyRealTransitLine: true,
      },
      sources: [
        createOsmSource(city, {
          lineName: proposal.name,
          lineId: proposal.id,
        }),
        ...(proposal.iconCandidateSourceUrl
          ? [
              {
                sourceType: 'image-preview',
                label: 'Staged line icon preview',
                url: proposal.iconCandidateSourceUrl,
              } satisfies ReviewSource,
            ]
          : []),
      ],
    })
  })

  candidates.push(
    ...buildOfficialLineUpdateCandidates({
      city,
      existingLines,
      extractedFacts,
    }),
  )

  candidates.push(
    ...buildStructuredStationCandidates({
      city,
      existingFeatures,
      nextFeatures,
      extractedFacts,
      stationAliases,
      stationLocalNames,
    }),
  )

  if (reportCity.operatorSuggestion) {
    candidates.push({
      citySlug: city,
      type: 'OPERATOR_SUGGESTION',
      entityKey: city,
      title: `Review operator suggestion for ${city}`,
      summary: `Suggested operator: ${reportCity.operatorSuggestion.value}`,
      confidence: reportCity.operatorSuggestion.verified ? 0.82 : 0.57,
      beforeValue: null,
      afterValue: reportCity.operatorSuggestion,
      diff: {
        change: 'operator-suggestion',
      },
      sources:
        reportCity.operatorSuggestion.sources.length > 0
          ? reportCity.operatorSuggestion.sources
          : [createOsmSource(city)],
    })
  }

  if (reportCity.headerSuggestion) {
    candidates.push({
      citySlug: city,
      type: 'HEADER_SUGGESTION',
      entityKey: city,
      title: `Review header copy for ${city}`,
      summary: `Suggested header: ${reportCity.headerSuggestion.header}`,
      confidence: reportCity.headerSuggestion.verified ? 0.8 : 0.55,
      beforeValue: null,
      afterValue: reportCity.headerSuggestion,
      diff: {
        change: 'header-suggestion',
      },
      metadata: {
        existingLines: Object.keys(existingLines).length,
      },
      sources:
        reportCity.headerSuggestion.sources.length > 0
          ? reportCity.headerSuggestion.sources
          : [createOsmSource(city)],
    })
  }

  const officialMetadataCandidate = buildOfficialOperatorMetadataCandidate({
    city,
    configMetadata,
    extractedFacts,
  })
  if (officialMetadataCandidate) {
    candidates.push(officialMetadataCandidate)
  }

  if (configMetadata && reportCity.operatorSuggestion) {
    const suggestedDescription = `How many of the ${reportCity.operatorSuggestion.value} stations can you name from memory?`
    const currentDescription = configMetadata.description || null
    const currentOpenGraphDescription = configMetadata.openGraphDescription || null

    if (
      currentDescription !== suggestedDescription ||
      currentOpenGraphDescription !== suggestedDescription
    ) {
      const candidate: ReviewCandidate = {
        citySlug: city,
        type: 'METADATA_CANDIDATE',
        entityKey: city,
        title: `Update metadata copy for ${city}`,
        summary:
          'Generate a deterministic config metadata update from the approved operator suggestion.',
        confidence: reportCity.operatorSuggestion.verified ? 0.74 : 0.5,
        beforeValue: {
          description: currentDescription,
          openGraphDescription: currentOpenGraphDescription,
          title: configMetadata.title,
          openGraphTitle: configMetadata.openGraphTitle,
        },
        afterValue: {
          description: suggestedDescription,
          openGraphDescription: suggestedDescription,
          title: configMetadata.title,
          openGraphTitle: configMetadata.openGraphTitle,
        },
        diff: {
          change: 'metadata-description-update',
          from: currentDescription,
          to: suggestedDescription,
        },
        sources:
          reportCity.operatorSuggestion.sources.length > 0
            ? reportCity.operatorSuggestion.sources
            : [createOsmSource(city)],
      }

      const officialMetadataFacts = extractedFacts.filter(
        (fact) =>
          fact.kind === 'OPERATOR_METADATA_REFERENCE' || fact.kind === 'OPERATOR_REFERENCE',
      )
      if (officialMetadataFacts.length > 0) {
        appendUniqueSources(candidate.sources, officialMetadataFacts.map(buildFactSource))
        candidate.metadata = {
          ...(candidate.metadata && typeof candidate.metadata === 'object'
            ? candidate.metadata
            : {}),
          officialFactCount: officialMetadataFacts.length,
        }
        candidate.confidence = Math.max(candidate.confidence || 0, 0.68)
      }

      candidates.push(candidate)
    }
  }

  return candidates
}

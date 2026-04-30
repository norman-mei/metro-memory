import type { DataFeature } from './types.ts'

export type ExactStationMatch = {
  id: number
  exactStrength: 1 | 2
}

const getFeatureExactCandidates = (
  feature: DataFeature,
  normalizeValue: (value: string) => string,
  stripOptionalPrefixes: (value: string) => string,
) => {
  const propertiesWithAlternates = feature.properties as typeof feature.properties & {
    alternate_names?: string[]
  }

  const primaryCandidates = [
    feature.properties?.name,
    feature.properties?.long_name,
    feature.properties?.short_name,
  ]
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => stripOptionalPrefixes(normalizeValue(entry)))

  const alternateCandidates = Array.isArray(propertiesWithAlternates.alternate_names)
    ? propertiesWithAlternates.alternate_names
        .filter(
          (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
        )
        .map((entry) => stripOptionalPrefixes(normalizeValue(entry)))
    : []

  return {
    primaryCandidates,
    alternateCandidates,
  }
}

export const findExactStationMatches = (
  features: Iterable<DataFeature>,
  normalizedInput: string,
  normalizeValue: (value: string) => string,
  stripOptionalPrefixes: (value: string) => string,
) => {
  const matches: ExactStationMatch[] = []

  for (const feature of features) {
    const id = Number(feature.id)
    if (!Number.isFinite(id)) {
      continue
    }

    const { primaryCandidates, alternateCandidates } = getFeatureExactCandidates(
      feature,
      normalizeValue,
      stripOptionalPrefixes,
    )

    if (primaryCandidates.includes(normalizedInput)) {
      matches.push({
        id,
        exactStrength: 2,
      })
      continue
    }

    if (alternateCandidates.includes(normalizedInput)) {
      matches.push({
        id,
        exactStrength: 1,
      })
    }
  }

  return matches
}

export const hasExactStationMatch = (
  features: Iterable<DataFeature>,
  normalizedInput: string,
  normalizeValue: (value: string) => string,
  stripOptionalPrefixes: (value: string) => string,
) =>
  findExactStationMatches(
    features,
    normalizedInput,
    normalizeValue,
    stripOptionalPrefixes,
  ).length > 0

export const shouldAutoSubmitStationInput = (input: {
  features: Iterable<DataFeature>
  rawInput: string
  normalizeValue: (value: string) => string
  stripOptionalPrefixes: (value: string) => string
  isComposing?: boolean
}) => {
  if (input.isComposing) {
    return false
  }

  if (!input.rawInput.trim()) {
    return false
  }

  const normalizedInput = input.stripOptionalPrefixes(
    input.normalizeValue(input.rawInput),
  )
  if (!normalizedInput) {
    return false
  }

  return hasExactStationMatch(
    input.features,
    normalizedInput,
    input.normalizeValue,
    input.stripOptionalPrefixes,
  )
}

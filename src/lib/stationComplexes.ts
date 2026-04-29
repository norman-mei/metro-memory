import { repairMojibakeString } from './repairMojibake.ts'
import type { DataFeature } from './types.ts'

const DIRECTIONAL_SUFFIX_PATTERN =
  /\s+(?:eastbound|westbound|northbound|southbound|eb|wb|nb|sb)\b\.?$/i
const TRAILING_STATION_SUFFIX_PATTERN =
  /\s+(?:railway\s+station|subway\s+station|metro\s+station|light\s+rail\s+station|station)\b\.?$/i
const PARENTHETICAL_CONTENT_PATTERN = /\(([^)]+)\)/g
const SLASH_SEGMENT_SPLIT_PATTERN = /\s*\/\s*/

const normalizeClusterAliasSpacing = (value: string) =>
  value.replace(/\s+/g, ' ').trim()

const collectDerivedAliases = (rawValue: string) => {
  const aliases = new Set<string>()
  const queue = [normalizeClusterAliasSpacing(repairMojibakeString(rawValue))]

  for (let index = 0; index < queue.length; index += 1) {
    const value = queue[index]
    if (!value || aliases.has(value)) {
      continue
    }

    aliases.add(value)

    const parentheticalContents = Array.from(
      value.matchAll(PARENTHETICAL_CONTENT_PATTERN),
      (match) => normalizeClusterAliasSpacing(match[1] ?? ''),
    ).filter(Boolean)
    parentheticalContents.forEach((content) => {
      if (!aliases.has(content)) {
        queue.push(content)
      }
    })

    const withoutParentheticals = normalizeClusterAliasSpacing(
      value.replace(PARENTHETICAL_CONTENT_PATTERN, ' '),
    )
    if (withoutParentheticals && withoutParentheticals !== value) {
      queue.push(withoutParentheticals)
    }

    const withoutDirectional = normalizeClusterAliasSpacing(
      value.replace(DIRECTIONAL_SUFFIX_PATTERN, ''),
    )
    if (withoutDirectional && withoutDirectional !== value) {
      queue.push(withoutDirectional)
    }

    const withoutStationSuffix = normalizeClusterAliasSpacing(
      value.replace(TRAILING_STATION_SUFFIX_PATTERN, ''),
    )
    if (withoutStationSuffix && withoutStationSuffix !== value) {
      queue.push(withoutStationSuffix)
    }

    if (value.includes('/')) {
      value
        .split(SLASH_SEGMENT_SPLIT_PATTERN)
        .map((segment) => normalizeClusterAliasSpacing(segment))
        .filter((segment) => segment.length >= 4)
        .forEach((segment) => {
          if (!aliases.has(segment)) {
            queue.push(segment)
          }
        })
    }
  }

  return Array.from(aliases)
}

const getFeatureNameCandidates = (feature: DataFeature) => {
  const propertiesWithAlternates = feature.properties as typeof feature.properties & {
    alternate_names?: string[]
  }

  return [
    feature.properties?.name,
    feature.properties?.long_name,
    feature.properties?.short_name,
    ...(Array.isArray(propertiesWithAlternates.alternate_names)
      ? propertiesWithAlternates.alternate_names
      : []),
  ].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  )
}

export const buildAutoClusterAliases = (
  feature: DataFeature,
  normalizeValue: (value: string) => string,
) => {
  const aliases = new Set<string>()

  getFeatureNameCandidates(feature).forEach((value) => {
    collectDerivedAliases(value).forEach((candidate) => {
      const normalized = normalizeValue(candidate)
      if (normalized) {
        aliases.add(normalized)
      }
    })
  })

  return aliases
}

export const autoClusterAliasSetsOverlap = (
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
) => {
  const [smaller, larger] =
    left.size <= right.size ? [left, right] : [right, left]

  for (const alias of smaller) {
    if (larger.has(alias)) {
      return true
    }
  }

  return false
}

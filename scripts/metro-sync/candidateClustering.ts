import type { ReviewCandidate, ReviewSource } from './types'

const DIRECTIONAL_PATTERN =
  /\b(northbound|southbound|eastbound|westbound|clockwise|counterclockwise|anticlockwise|inbound|outbound|branch|spur|service|local|express|via|shuttle|loop|inner|outer|platform|bound)\b/gi

const PAREN_SUFFIX_PATTERN = /\([^)]*\)/g
const ROUTE_SUFFIX_PATTERN =
  /\b(to|towards|from|via)\b[\s\S]*$/i

const normalize = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(PAREN_SUFFIX_PATTERN, ' ')
    .replace(ROUTE_SUFFIX_PATTERN, ' ')
    .replace(DIRECTIONAL_PATTERN, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')

const buildFuzzyVariants = (value: string | undefined | null) => {
  const raw = String(value || '').trim()
  if (!raw) return []

  return Array.from(
    new Set([
      normalize(raw),
      normalize(raw.replace(/line\b/gi, ' ')),
      normalize(raw.replace(/\b(m[eé]tro|metro|u|s|rer|dlr|tram|subway)\b/gi, ' ')),
      normalize(raw.replace(/\b(line|service|route)\s*[0-9a-z-]+$/gi, ' ')),
    ].filter(Boolean)),
  )
}

const uniqueSources = (sources: ReviewSource[]) => {
  const seen = new Set<string>()
  return sources.filter((source) => {
    const key = `${source.sourceType}|${source.url || ''}|${source.label || ''}|${source.snippet || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildClusterLabel = (candidate: ReviewCandidate) => {
  if (candidate.type === 'NEW_LINE' || candidate.type === 'LINE_RENAME_CANDIDATE' || candidate.type === 'LINE_COLOR_CANDIDATE') {
    const nameHint =
      candidate.afterValue?.name ||
      candidate.diff?.to ||
      candidate.diff?.lineName ||
      candidate.entityKey ||
      candidate.title
    return buildFuzzyVariants(String(nameHint || ''))[0] || ''
  }

  if (
    candidate.type === 'NEW_STATION' ||
    candidate.type === 'UPDATED_STATION' ||
    candidate.type === 'REMOVED_STATION'
  ) {
    const key = candidate.entityKey || ''
    const parts = String(key).split('|')
    const lineName = normalize(parts[0] || candidate.afterValue?.properties?.line || candidate.beforeValue?.properties?.line || '')
    const stationName = normalize(
      parts[1] ||
        candidate.afterValue?.properties?.name ||
        candidate.beforeValue?.properties?.name ||
        candidate.title,
    )
    return `${buildFuzzyVariants(lineName)[0] || lineName}|${buildFuzzyVariants(stationName)[0] || stationName}`
  }

  return buildFuzzyVariants(candidate.entityKey || candidate.title)[0] || ''
}

const shouldCluster = (candidate: ReviewCandidate) =>
  [
    'NEW_LINE',
    'LINE_RENAME_CANDIDATE',
    'LINE_COLOR_CANDIDATE',
    'NEW_STATION',
    'UPDATED_STATION',
    'REMOVED_STATION',
  ].includes(candidate.type)

export const clusterReviewCandidates = (candidates: ReviewCandidate[]) => {
  const grouped = new Map<string, ReviewCandidate[]>()

  candidates.forEach((candidate) => {
    if (!shouldCluster(candidate)) {
      grouped.set(`unique|${grouped.size}|${candidate.title}`, [candidate])
      return
    }

    const label = buildClusterLabel(candidate)
    if (!label) {
      grouped.set(`unique|${grouped.size}|${candidate.title}`, [candidate])
      return
    }

    const key = `${candidate.citySlug}|${candidate.type}|${label}`
    const bucket = grouped.get(key) || []
    bucket.push(candidate)
    grouped.set(key, bucket)
  })

  const collapsed = Array.from(grouped.entries()).map(([key, bucket]) => {
    if (bucket.length === 1) {
      const candidate = bucket[0]
      candidate.metadata = {
        ...(candidate.metadata && typeof candidate.metadata === 'object' ? candidate.metadata : {}),
        clusterId: key,
        clusterSize: 1,
      }
      return candidate
    }

    const primary = [...bucket].sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0]
    const duplicateTitles = bucket
      .filter((candidate) => candidate !== primary)
      .map((candidate) => candidate.title)
      .slice(0, 8)

    return {
      ...primary,
      confidence: Math.max(...bucket.map((candidate) => candidate.confidence || 0)),
      sources: uniqueSources(bucket.flatMap((candidate) => candidate.sources)),
      summary:
        primary.summary ||
        `${bucket.length} near-duplicate candidates were clustered into one review item.`,
      metadata: {
        ...(primary.metadata && typeof primary.metadata === 'object' ? primary.metadata : {}),
        clusterId: key,
        clusterSize: bucket.length,
        duplicateTitles,
        dedupeApplied: true,
      },
    } satisfies ReviewCandidate
  })

  const clusteredDuplicateCount = Array.from(grouped.values()).reduce(
    (total, bucket) => total + Math.max(0, bucket.length - 1),
    0,
  )

  return {
    candidates: collapsed,
    clusteredDuplicateCount,
  }
}

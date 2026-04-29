import type {
  CollectedArtifact,
  Registry,
  SourceEnrichmentSuggestion,
} from './types'

const inferSourceDomain = (url?: string | null) => {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const isOfficialishDomain = (domain: string | null) =>
  Boolean(
    domain &&
      (domain.includes('.gov') ||
        domain.includes('.go.') ||
        domain.includes('.gouv.') ||
        domain.includes('metro') ||
        domain.includes('transit') ||
        domain.includes('rail') ||
        domain.includes('tram') ||
        domain.includes('subway')),
  )

const SOURCE_BUCKETS: Array<{
  sourceKey: SourceEnrichmentSuggestion['sourceKey']
  artifactTypes: CollectedArtifact['artifactType'][]
}> = [
  { sourceKey: 'gtfsFeeds', artifactTypes: ['GTFS_FEED'] },
  { sourceKey: 'officialPages', artifactTypes: ['OFFICIAL_PAGE'] },
  { sourceKey: 'pressPages', artifactTypes: ['PRESS_RELEASE'] },
  { sourceKey: 'mapPdfs', artifactTypes: ['MAP_PDF'] },
]

export const suggestSourceEnrichment = ({
  registry,
  artifacts,
}: {
  registry: Registry
  artifacts: CollectedArtifact[]
}) => {
  const suggestions: SourceEnrichmentSuggestion[] = []
  const seen = new Set<string>()

  SOURCE_BUCKETS.forEach(({ sourceKey, artifactTypes }) => {
    const existingUrls = new Set((registry.sources?.[sourceKey] || []).map((url) => String(url)))
    if (existingUrls.size > 0) return

    artifacts
      .filter((artifact) => artifact.sourceUrl && artifactTypes.includes(artifact.artifactType))
      .forEach((artifact) => {
        const url = String(artifact.sourceUrl)
        const domain = inferSourceDomain(url)
        const confidence = artifact.artifactType === 'GTFS_FEED' ? 0.92 : isOfficialishDomain(domain) ? 0.78 : 0.62
        const key = `${sourceKey}|${url}`
        if (seen.has(key) || existingUrls.has(url)) return
        seen.add(key)
        suggestions.push({
          sourceKey,
          url,
          confidence,
          artifactType: artifact.artifactType,
          reason:
            artifact.artifactType === 'GTFS_FEED'
              ? 'Collected GTFS feed artifact that is not yet pinned in city-registry.'
              : `Collected ${artifact.artifactType.toLowerCase().replaceAll('_', ' ')} artifact that can be promoted into city-registry sources.`,
        })
      })
  })

  return suggestions.sort((left, right) => right.confidence - left.confidence || left.url.localeCompare(right.url))
}

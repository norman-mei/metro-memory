import {
  buildGroundedResearchPlan,
  buildGroundedVerification,
} from '../../src/lib/automationAgentModel.ts'

import type {
  CollectedArtifact,
  EvidenceGraphSummary,
  ReviewCandidate,
  ReviewSource,
  ResearchPlannerOutput,
  ResearchTaskType,
  VerificationArtifactResult,
} from './types'

function inferSourceDomain(url?: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function classifySourceTier(source: ReviewSource) {
  const domain = inferSourceDomain(source.url)

  if (source.sourceType === 'osm' || domain === 'openstreetmap.org' || domain === 'overpass-api.de') {
    return { domain, tier: 'OFFICIAL', score: 0.92 }
  }

  if (
    source.sourceType.startsWith('official-') ||
    (source.metadata &&
      typeof source.metadata === 'object' &&
      'artifactType' in source.metadata &&
      ['GTFS_FEED', 'OFFICIAL_PAGE', 'PRESS_RELEASE', 'MAP_PDF'].includes(
        String(source.metadata.artifactType || ''),
      ))
  ) {
    return { domain, tier: 'OFFICIAL', score: 0.9 }
  }

  if (
    domain &&
    (domain.includes('.gov') ||
      domain.includes('.gouv.') ||
      domain.includes('.go.') ||
      domain.includes('.metro.') ||
      domain.includes('.transit.') ||
      domain.includes('.rail.') ||
      domain.includes('serpapi.com'))
  ) {
    return { domain, tier: 'OFFICIAL', score: 0.88 }
  }

  if (
    domain &&
    (domain.includes('google.') ||
      domain.includes('wikimedia.org') ||
      domain.includes('wikipedia.org') ||
      domain.includes('apnews.com') ||
      domain.includes('reuters.com'))
  ) {
    return { domain, tier: 'ESTABLISHED', score: 0.72 }
  }

  if (domain) {
    return { domain, tier: 'COMMUNITY', score: 0.56 }
  }

  return { domain: null, tier: 'UNKNOWN', score: 0.42 }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1, value))
}

const TASK_LABELS: Record<ResearchTaskType, string> = {
  FIND_OFFICIAL_OPERATOR_PAGE: 'find official operator page',
  FIND_MAP_PDF: 'find current map PDF',
  FIND_GTFS_FEED: 'find current GTFS feed',
  FIND_PRESS_PAGE: 'find official press or service notice',
  VERIFY_STATION_RENAME: 'verify station rename from official sources',
  VERIFY_LINE_RENAME: 'verify line rename from official sources',
  VERIFY_LINE_COLOR: 'verify line color from official map or legend',
  VERIFY_OPERATOR: 'verify operator details from official sources',
  VERIFY_METADATA: 'verify metadata from official source text',
}

const CANDIDATE_TYPE_PROFILES: Record<
  ReviewCandidate['type'],
  { minGreenConfidence: number; minGreenScore: number; requiresOfficialEvidence: boolean }
> = {
  NEW_STATION: { minGreenConfidence: 0.82, minGreenScore: 0.84, requiresOfficialEvidence: true },
  REMOVED_STATION: { minGreenConfidence: 0.84, minGreenScore: 0.88, requiresOfficialEvidence: true },
  UPDATED_STATION: { minGreenConfidence: 0.8, minGreenScore: 0.83, requiresOfficialEvidence: true },
  NEW_LINE: { minGreenConfidence: 0.88, minGreenScore: 0.9, requiresOfficialEvidence: true },
  LINE_RENAME_CANDIDATE: { minGreenConfidence: 0.83, minGreenScore: 0.86, requiresOfficialEvidence: true },
  LINE_COLOR_CANDIDATE: { minGreenConfidence: 0.8, minGreenScore: 0.84, requiresOfficialEvidence: true },
  OPERATOR_SUGGESTION: { minGreenConfidence: 0.9, minGreenScore: 0.92, requiresOfficialEvidence: true },
  HEADER_SUGGESTION: { minGreenConfidence: 0.92, minGreenScore: 0.94, requiresOfficialEvidence: true },
  IMAGE_CANDIDATE: { minGreenConfidence: 1, minGreenScore: 1, requiresOfficialEvidence: true },
  METADATA_CANDIDATE: { minGreenConfidence: 0.82, minGreenScore: 0.85, requiresOfficialEvidence: true },
  OPERATOR_METADATA_CANDIDATE: { minGreenConfidence: 0.84, minGreenScore: 0.87, requiresOfficialEvidence: true },
}

const DIRECTIONAL_OR_BRANCH_PATTERN =
  /\b(northbound|southbound|eastbound|westbound|clockwise|counterclockwise|inbound|outbound|branch|spur|depot|yard|service)\b/i

function buildResearchPlannerOutput({
  candidate,
  officialEvidenceCount,
  gtfsEvidenceCount,
  sourceTierScore,
  recencyScore,
  overallScore,
  contradictionFlag,
  conflictReasons,
  blockedSourceFlag,
}: {
  candidate: ReviewCandidate
  officialEvidenceCount: number
  gtfsEvidenceCount: number
  sourceTierScore: number
  recencyScore: number
  overallScore: number
  contradictionFlag: boolean
  conflictReasons: string[]
  blockedSourceFlag: boolean
}): ResearchPlannerOutput {
  const missingEvidence: string[] = []
  const recommendedTaskTypes = new Set<ResearchTaskType>()
  const stationLifecycle =
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'stationLifecycle' in candidate.metadata
      ? String(candidate.metadata.stationLifecycle || '')
      : ''
  const isStationRename =
    candidate.type === 'UPDATED_STATION' &&
    (stationLifecycle === 'rename' || candidate.diff?.change === 'gtfs-stop-rename')
  const followUpStatus =
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'followUpStatus' in candidate.metadata
      ? String(candidate.metadata.followUpStatus || '').toUpperCase()
      : ''
  const contradictionSeverity =
    (contradictionFlag ? 1 : 0) + conflictReasons.length + (blockedSourceFlag ? 1 : 0)
  const hardStopDueToContradiction = contradictionSeverity >= 3

  if (blockedSourceFlag) {
    missingEvidence.push('Current evidence is blocked by source-trust policy.')
  }

  if (contradictionFlag && conflictReasons.length > 0) {
    missingEvidence.push('Resolve contradictory evidence from current sources.')
  }
  if (hardStopDueToContradiction) {
    missingEvidence.push('Contradictory evidence exceeded the bounded autonomy threshold.')
  }

  if (officialEvidenceCount + gtfsEvidenceCount < 1) {
    if (candidate.type === 'LINE_COLOR_CANDIDATE') {
      missingEvidence.push('Need an official map or legend confirming the line color.')
      recommendedTaskTypes.add('FIND_MAP_PDF')
      recommendedTaskTypes.add('VERIFY_LINE_COLOR')
    } else if (candidate.type === 'LINE_RENAME_CANDIDATE') {
      missingEvidence.push('Need an official notice or map confirming the line rename.')
      recommendedTaskTypes.add('FIND_PRESS_PAGE')
      recommendedTaskTypes.add('VERIFY_LINE_RENAME')
    } else if (
      candidate.type === 'OPERATOR_SUGGESTION' ||
      candidate.type === 'OPERATOR_METADATA_CANDIDATE'
    ) {
      missingEvidence.push('Need an official operator source for this change.')
      recommendedTaskTypes.add('FIND_OFFICIAL_OPERATOR_PAGE')
      recommendedTaskTypes.add('VERIFY_OPERATOR')
    } else if (candidate.type === 'METADATA_CANDIDATE' || candidate.type === 'HEADER_SUGGESTION') {
      missingEvidence.push('Need an official page or map confirming the metadata text.')
      recommendedTaskTypes.add('FIND_OFFICIAL_OPERATOR_PAGE')
      recommendedTaskTypes.add('VERIFY_METADATA')
    } else if (isStationRename) {
      missingEvidence.push('Need official confirmation of the station rename.')
      recommendedTaskTypes.add('FIND_PRESS_PAGE')
      recommendedTaskTypes.add('VERIFY_STATION_RENAME')
    } else {
      missingEvidence.push('Need an official or GTFS source for this structured change.')
      recommendedTaskTypes.add('FIND_GTFS_FEED')
      recommendedTaskTypes.add('FIND_PRESS_PAGE')
    }
  }

  if (isStationRename && officialEvidenceCount < 2) {
    missingEvidence.push('Need two independent official confirmations for the station rename.')
    recommendedTaskTypes.add('VERIFY_STATION_RENAME')
  }

  if (sourceTierScore < 0.8) {
    missingEvidence.push('Need a stronger official source tier for this claim.')
    if (
      candidate.type === 'OPERATOR_SUGGESTION' ||
      candidate.type === 'OPERATOR_METADATA_CANDIDATE'
    ) {
      recommendedTaskTypes.add('FIND_OFFICIAL_OPERATOR_PAGE')
    } else {
      recommendedTaskTypes.add('FIND_PRESS_PAGE')
    }
  }

  if (recencyScore < 0.75) {
    missingEvidence.push('Need a more recent official artifact.')
    if (candidate.type === 'LINE_COLOR_CANDIDATE') {
      recommendedTaskTypes.add('FIND_MAP_PDF')
    } else {
      recommendedTaskTypes.add('FIND_PRESS_PAGE')
    }
  }

  if (
    candidate.type === 'METADATA_CANDIDATE' ||
    candidate.type === 'HEADER_SUGGESTION' ||
    candidate.type === 'OPERATOR_METADATA_CANDIDATE'
  ) {
    recommendedTaskTypes.add('VERIFY_METADATA')
  }

  const nextBestAction =
    Array.from(recommendedTaskTypes)[0] ? TASK_LABELS[Array.from(recommendedTaskTypes)[0]] : null
  const exhaustedOrBlocked =
    followUpStatus === 'EXHAUSTED' ||
    followUpStatus === 'BLOCKED' ||
    followUpStatus === 'SATISFIED' ||
    hardStopDueToContradiction
  const followUpRecommended =
    !exhaustedOrBlocked &&
    !blockedSourceFlag &&
    candidate.type !== 'IMAGE_CANDIDATE' &&
    missingEvidence.length > 0 &&
    overallScore >= 0.45

  return {
    followUpRecommended,
    missingEvidence: Array.from(new Set(missingEvidence)),
    nextBestAction,
    recommendedTaskTypes: Array.from(recommendedTaskTypes),
    tasks: Array.from(recommendedTaskTypes).map((taskType) => ({
      taskType,
      title: `Research ${TASK_LABELS[taskType]} for ${candidate.title}`,
      citySlug: candidate.citySlug,
      claimType: candidate.type,
      candidateTitle: candidate.title,
      entityKey: candidate.entityKey,
      expectedArtifactTypes:
        taskType === 'FIND_MAP_PDF'
          ? ['MAP_PDF']
          : taskType === 'FIND_GTFS_FEED'
            ? ['GTFS_FEED']
            : ['OFFICIAL_PAGE', 'PRESS_RELEASE'],
      metadata: {
        missingEvidence: Array.from(new Set(missingEvidence)),
        overallScore,
      },
    })),
  }
}

function buildEvidenceGraphSummary({
  candidate,
  classifiedSources,
  conflictReasons,
  plannerOutput,
}: {
  candidate: ReviewCandidate
  classifiedSources: Array<{ domain: string | null; tier: string; score: number }>
  conflictReasons: string[]
  plannerOutput: ResearchPlannerOutput
}): EvidenceGraphSummary {
  const topSupportingSources = candidate.sources
    .map((source, index) => ({
      sourceType: source.sourceType,
      label: source.label,
      url: source.url,
      domain: classifiedSources[index]?.domain || null,
      score: classifiedSources[index]?.score || 0,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ score: _score, ...rest }) => rest)

  return {
    nodeCount: 1 + candidate.sources.length + plannerOutput.recommendedTaskTypes.length,
    edgeCount:
      candidate.sources.length +
      conflictReasons.length +
      plannerOutput.recommendedTaskTypes.length,
    supportCount: candidate.sources.length,
    contradictionCount: conflictReasons.length,
    missingEvidence: plannerOutput.missingEvidence,
    nextBestAction: plannerOutput.nextBestAction,
    topSupportingSources,
    contradictionReasons: conflictReasons,
    recommendedTaskTypes: plannerOutput.recommendedTaskTypes,
  }
}

export const runBasicCityVerification = async ({
  city,
  newLines,
  newStations,
  searchFn,
}: {
  city: string
  newLines: string[]
  newStations: string[]
  searchFn: (query: string) => Promise<any>
}): Promise<VerificationArtifactResult> => {
  const notes: string[] = []
  const artifacts: CollectedArtifact[] = []
  const candidates = [
    ...newLines.map((label) => ({ type: 'line', label })),
    ...newStations.map((label) => ({ type: 'station', label })),
  ].slice(0, 5)

  for (const candidate of candidates) {
    const label =
      candidate.type === 'station' ? candidate.label.split('|')[1] || candidate.label : candidate.label
    const query = `${label} ${city} metro`
    try {
      const data = await searchFn(query)
      const results = Array.isArray(data?.organic_results) ? data.organic_results : []

      if (!results.length) {
        notes.push(`No search results for ${candidate.type} ${label}`)
        continue
      }

      notes.push(`Verified ${candidate.type} ${label} via search (${results.length} results)`)

      results.slice(0, 3).forEach((result: any, index: number) => {
        const url = typeof result?.link === 'string' ? result.link : null
        artifacts.push({
          citySlug: city,
          artifactType: 'SEARCH_RESULT',
          sourceUrl: url || undefined,
          sourceDomain: inferSourceDomain(url) || undefined,
          mimeType: 'text/html',
          fetchedAt: new Date().toISOString(),
          metadataJson: {
            candidateType: candidate.type,
            candidateLabel: label,
            query,
            position: index + 1,
            title: result?.title || null,
            snippet: result?.snippet || null,
          },
        })
      })
    } catch (error: any) {
      notes.push(`Search failed for ${candidate.type} ${label}: ${error?.message || error}`)
    }
  }

  return { notes, artifacts }
}

export const buildVerificationScores = (candidate: ReviewCandidate) => {
  const profile = CANDIDATE_TYPE_PROFILES[candidate.type]
  const classifiedSources = candidate.sources.map(classifySourceTier)
  const evidenceCount = Math.max(
    candidate.sources.filter((source) => source.url || source.snippet || source.label).length,
    1,
  )
  const sourceTierScore =
    classifiedSources.length > 0
      ? Math.max(...classifiedSources.map((source) => source.score))
      : 0.42
  const recencyScore = candidate.sources.some((source) => source.sourceType === 'osm') ? 0.9 : 0.68
  const consistencyBase = typeof candidate.confidence === 'number' ? candidate.confidence : 0.5
  const consistencyBonus =
    candidate.beforeValue && candidate.afterValue
      ? 0.08
      : candidate.afterValue
        ? 0.04
        : 0

  const officialEvidenceCount = candidate.sources.filter(
    (source) =>
      source.sourceType.startsWith('official-') ||
      (source.metadata &&
        typeof source.metadata === 'object' &&
        'artifactType' in source.metadata &&
        ['GTFS_FEED', 'OFFICIAL_PAGE', 'PRESS_RELEASE', 'MAP_PDF'].includes(
          String(source.metadata.artifactType || ''),
        )),
  ).length
  const gtfsEvidenceCount = candidate.sources.filter(
    (source) =>
      source.metadata &&
      typeof source.metadata === 'object' &&
      'artifactType' in source.metadata &&
      String(source.metadata.artifactType || '') === 'GTFS_FEED',
  ).length
  const officialDomains = Array.from(
    new Set(
      candidate.sources
        .filter(
          (source) =>
            source.sourceType.startsWith('official-') ||
            (source.metadata &&
              typeof source.metadata === 'object' &&
              'artifactType' in source.metadata &&
              ['GTFS_FEED', 'OFFICIAL_PAGE', 'PRESS_RELEASE', 'MAP_PDF'].includes(
                String(source.metadata.artifactType || ''),
              )),
        )
        .map((source) => inferSourceDomain(source.url))
        .filter((value): value is string => Boolean(value)),
    ),
  )
  const extractedFactKinds = Array.from(
    new Set(
      candidate.sources.flatMap((source) => {
        if (
          source.metadata &&
          typeof source.metadata === 'object' &&
          'extractedFactKind' in source.metadata
        ) {
          return [String(source.metadata.extractedFactKind || '')]
        }
        return []
      }),
    ),
  ).filter(Boolean)
  const clusterSize =
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'clusterSize' in candidate.metadata
      ? Number(candidate.metadata.clusterSize)
      : 1

  const blockedSourceFlag = candidate.sources.some((source) => {
    const policy =
      source.metadata &&
      typeof source.metadata === 'object' &&
      'sourcePolicyStatus' in source.metadata
        ? String(source.metadata.sourcePolicyStatus)
        : ''
    return policy.toUpperCase() === 'BLOCKED'
  })
  const conflictReasons =
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    Array.isArray(candidate.metadata.conflictReasons)
      ? candidate.metadata.conflictReasons.map((reason: unknown) => String(reason))
      : []
  const hasExtractedConflict = extractedFactKinds.includes('CONFLICT_REFERENCE')
  const likelyRealTransitLine =
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'likelyRealTransitLine' in candidate.metadata
      ? Boolean(candidate.metadata.likelyRealTransitLine)
      : candidate.type !== 'NEW_LINE'
        ? true
        : officialEvidenceCount > 0 ||
          gtfsEvidenceCount > 0 ||
          !DIRECTIONAL_OR_BRANCH_PATTERN.test(
            String(candidate.afterValue?.name || candidate.title || ''),
          )
  const contradictionFlag =
    blockedSourceFlag ||
    Boolean(candidate.metadata?.sourcePolicy?.status === 'BLOCKED') ||
    Boolean(candidate.metadata?.contradictionFlag) ||
    hasExtractedConflict ||
    conflictReasons.length > 0

  const officialEvidenceBonus = Math.min(0.24, officialEvidenceCount * 0.08)
  const gtfsEvidenceBonus = Math.min(0.18, gtfsEvidenceCount * 0.07)
  const lineRealityBonus = likelyRealTransitLine ? 0.06 : -0.18
  const clusterPenalty = clusterSize > 1 ? Math.min(0.1, (clusterSize - 1) * 0.02) : 0
  const consistencyScore = clampScore(
    consistencyBase +
      consistencyBonus +
      officialEvidenceBonus +
      gtfsEvidenceBonus +
      lineRealityBonus -
      clusterPenalty,
  )
  const evidenceScore = clampScore(0.3 + evidenceCount * 0.12 + officialEvidenceCount * 0.06)
  const overallScore = clampScore(
    sourceTierScore * 0.28 +
      recencyScore * 0.16 +
      consistencyScore * 0.34 +
      evidenceScore * 0.22 -
      clusterPenalty -
      (contradictionFlag ? 0.38 : 0),
  )
  const plannerOutput = buildResearchPlannerOutput({
    candidate,
    officialEvidenceCount,
    gtfsEvidenceCount,
    sourceTierScore,
    recencyScore,
    overallScore,
    contradictionFlag,
    conflictReasons,
    blockedSourceFlag,
  })
  const evidenceGraphSummary = buildEvidenceGraphSummary({
    candidate,
    classifiedSources,
    conflictReasons,
    plannerOutput,
  })
  const contradictionScore = clampScore(
    (contradictionFlag ? 0.65 : 0) + conflictReasons.length * 0.12 + (blockedSourceFlag ? 0.2 : 0),
  )
  const supportScore = clampScore(evidenceScore + officialEvidenceBonus + gtfsEvidenceBonus)

  return {
    sourceTierScore,
    evidenceCount,
    recencyScore,
    consistencyScore,
    contradictionFlag,
    verifierVersion: 'phase-f-v1',
    verificationJson: {
      overallScore,
      supportScore,
      contradictionScore,
      evidenceScore,
      officialEvidenceCount,
      officialDomainCount: officialDomains.length,
      gtfsEvidenceCount,
      likelyRealTransitLine,
      hasConflict: contradictionFlag,
      conflictReasons,
      blockedBySourcePolicy: blockedSourceFlag,
      sourceTypes: candidate.sources.map((source) => source.sourceType),
      sourceDomains: classifiedSources.map((source) => source.domain).filter(Boolean),
      sourceTiers: classifiedSources.map((source) => source.tier),
      extractedFactKinds,
      entityKey: candidate.entityKey || null,
      clusterSize,
      candidateTypeProfile: profile,
      missingEvidence: plannerOutput.missingEvidence,
      nextBestAction: plannerOutput.nextBestAction,
      followUpRecommended: plannerOutput.followUpRecommended,
      recommendedTaskTypes: plannerOutput.recommendedTaskTypes,
      evidenceGraphSummary,
    },
  }
}

export const buildVerificationScoresWithGrounding = async (candidate: ReviewCandidate) => {
  const heuristic = buildVerificationScores(candidate)
  const grounded = await buildGroundedVerification(candidate).catch(() => null)
  if (!grounded) {
    return heuristic
  }

  const baseJson =
    heuristic.verificationJson && typeof heuristic.verificationJson === 'object'
      ? (heuristic.verificationJson as Record<string, any>)
      : {}

  const mergedRecommendedTaskTypes = Array.from(
    new Set([
      ...(Array.isArray(baseJson.recommendedTaskTypes) ? baseJson.recommendedTaskTypes : []),
      ...(Array.isArray(grounded.recommendedTaskTypes) ? grounded.recommendedTaskTypes : []),
    ]),
  )

  const groundedPlanner = await buildGroundedResearchPlan({
    candidate,
    latestVerificationJson: baseJson,
    missingEvidence: grounded.missingEvidence || [],
  }).catch(() => null)

  const mergedConflictReasons = Array.from(
    new Set([
      ...(Array.isArray(baseJson.conflictReasons) ? baseJson.conflictReasons : []),
      ...(grounded.contradictionReasons || []),
    ]),
  )
  const contradictionFlag = Boolean(
    heuristic.contradictionFlag || grounded.contradictionFlag || mergedConflictReasons.length > 0,
  )
  const overallScore = Math.max(
    0,
    Math.min(
      1,
      Number(baseJson.overallScore || 0) + Number(grounded.confidenceAdjustment || 0),
    ),
  )

  return {
    ...heuristic,
    contradictionFlag,
    verifierVersion: `${heuristic.verifierVersion || 'phase-f-v1'}+grounded`,
    verificationJson: {
      ...baseJson,
      overallScore,
      hasConflict: contradictionFlag,
      conflictReasons: mergedConflictReasons,
      missingEvidence:
        groundedPlanner?.missingEvidence ||
        grounded.missingEvidence ||
        baseJson.missingEvidence ||
        [],
      nextBestAction:
        groundedPlanner?.nextBestAction || grounded.nextBestAction || baseJson.nextBestAction || null,
      followUpRecommended:
        groundedPlanner?.followUpRecommended ??
        baseJson.followUpRecommended ??
        false,
      recommendedTaskTypes:
        groundedPlanner?.recommendedTaskTypes || mergedRecommendedTaskTypes,
      groundedModel: grounded.raw || null,
      groundedPlannerReason: groundedPlanner?.plannerReason || grounded.plannerReason || null,
      groundedCitations:
        groundedPlanner?.citations || grounded.citations || baseJson.groundedCitations || [],
      supportScore:
        typeof grounded.supportScore === 'number'
          ? grounded.supportScore
          : baseJson.supportScore,
    },
  }
}

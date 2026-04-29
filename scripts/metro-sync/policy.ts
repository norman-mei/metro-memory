import type { ReviewCandidate } from './types'

export type AutomationLane = 'GREEN' | 'YELLOW' | 'RED'

type PolicyFeedback = {
  domainTrustScore?: number
  cityTrustScore?: number
  claimTypeTrustScore?: number
  cityCoolingPenalty?: number
  claimTypeScoreAdjustment?: number
  domainBlocked?: boolean
  forcedLane?: AutomationLane | null
  policyTuning?: Partial<PolicyTuning>
}

export type PolicyTuning = {
  greenConfidenceDelta: number
  greenAdjustedScoreDelta: number
  greenSourceTierDelta: number
  autoApplyMinOfficialEvidenceCount: number
  autoApplyMinOfficialDomainCount: number
  autoApplyMinSupportScore: number
  autoApplyMaxContradictionScore: number
  autoApplyMinDomainTrustScore: number
  autoApplyMinCityTrustScore: number
  autoApplyMinClaimTypeTrustScore: number
}

const GREEN_TYPES = new Set<ReviewCandidate['type']>([
  'NEW_STATION',
  'UPDATED_STATION',
  'METADATA_CANDIDATE',
  'LINE_RENAME_CANDIDATE',
  'LINE_COLOR_CANDIDATE',
  'OPERATOR_METADATA_CANDIDATE',
])

const RED_TYPES = new Set<ReviewCandidate['type']>(['IMAGE_CANDIDATE'])

const AUTO_APPLY_HISTORY_THRESHOLDS = {
  domainTrustScore: 0.72,
  cityTrustScore: 0.58,
  claimTypeTrustScore: 0.6,
}

const DEFAULT_POLICY_TUNING: PolicyTuning = {
  greenConfidenceDelta: 0,
  greenAdjustedScoreDelta: 0,
  greenSourceTierDelta: 0,
  autoApplyMinOfficialEvidenceCount: 2,
  autoApplyMinOfficialDomainCount: 1,
  autoApplyMinSupportScore: 0.74,
  autoApplyMaxContradictionScore: 0.14,
  autoApplyMinDomainTrustScore: AUTO_APPLY_HISTORY_THRESHOLDS.domainTrustScore,
  autoApplyMinCityTrustScore: AUTO_APPLY_HISTORY_THRESHOLDS.cityTrustScore,
  autoApplyMinClaimTypeTrustScore: AUTO_APPLY_HISTORY_THRESHOLDS.claimTypeTrustScore,
}

const TYPE_THRESHOLDS: Record<
  ReviewCandidate['type'],
  {
    confidence: number
    adjustedScore: number
    sourceTier: number
    requiresOfficialEvidence: boolean
    autoApplyAllowed: boolean
  }
> = {
  NEW_STATION: { confidence: 0.82, adjustedScore: 0.84, sourceTier: 0.86, requiresOfficialEvidence: true, autoApplyAllowed: true },
  REMOVED_STATION: { confidence: 0.88, adjustedScore: 0.9, sourceTier: 0.9, requiresOfficialEvidence: true, autoApplyAllowed: false },
  UPDATED_STATION: { confidence: 0.8, adjustedScore: 0.83, sourceTier: 0.85, requiresOfficialEvidence: true, autoApplyAllowed: true },
  NEW_LINE: { confidence: 0.9, adjustedScore: 0.92, sourceTier: 0.9, requiresOfficialEvidence: true, autoApplyAllowed: false },
  LINE_RENAME_CANDIDATE: { confidence: 0.83, adjustedScore: 0.86, sourceTier: 0.87, requiresOfficialEvidence: true, autoApplyAllowed: true },
  LINE_COLOR_CANDIDATE: { confidence: 0.8, adjustedScore: 0.84, sourceTier: 0.86, requiresOfficialEvidence: true, autoApplyAllowed: true },
  OPERATOR_SUGGESTION: { confidence: 0.9, adjustedScore: 0.93, sourceTier: 0.9, requiresOfficialEvidence: true, autoApplyAllowed: false },
  HEADER_SUGGESTION: { confidence: 0.92, adjustedScore: 0.94, sourceTier: 0.92, requiresOfficialEvidence: true, autoApplyAllowed: false },
  IMAGE_CANDIDATE: { confidence: 1, adjustedScore: 1, sourceTier: 1, requiresOfficialEvidence: true, autoApplyAllowed: false },
  METADATA_CANDIDATE: { confidence: 0.82, adjustedScore: 0.85, sourceTier: 0.86, requiresOfficialEvidence: true, autoApplyAllowed: true },
  OPERATOR_METADATA_CANDIDATE: { confidence: 0.84, adjustedScore: 0.87, sourceTier: 0.88, requiresOfficialEvidence: true, autoApplyAllowed: true },
}

export const buildClaimPolicy = (
  candidate: ReviewCandidate,
  verification: {
    sourceTierScore: number
    evidenceCount: number
    recencyScore: number
    consistencyScore: number
    contradictionFlag: boolean
    verificationJson?: {
      overallScore?: number
      supportScore?: number
      contradictionScore?: number
      officialEvidenceCount?: number
      officialDomainCount?: number
      gtfsEvidenceCount?: number
      likelyRealTransitLine?: boolean
      hasConflict?: boolean
      followUpRecommended?: boolean
      missingEvidence?: string[]
    }
  },
  feedback: PolicyFeedback = {},
) => {
  let lane: AutomationLane = 'YELLOW'
  let decisionReason = 'Requires review under the default research-agent policy.'
  let autoApplyAllowed = false
  const thresholds = TYPE_THRESHOLDS[candidate.type]
  const policyTuning: PolicyTuning = {
    ...DEFAULT_POLICY_TUNING,
    ...(feedback.policyTuning || {}),
  }
  const overallScore = verification.verificationJson?.overallScore ?? 0
  const domainTrustScore = feedback.domainTrustScore ?? 0.5
  const cityTrustScore = feedback.cityTrustScore ?? 0.5
  const claimTypeTrustScore = feedback.claimTypeTrustScore ?? 0.5
  const cityCoolingPenalty = Math.max(0, Math.min(0.2, feedback.cityCoolingPenalty ?? 0))
  const claimTypeScoreAdjustment = Math.max(
    -0.2,
    Math.min(0.2, feedback.claimTypeScoreAdjustment ?? 0),
  )
  const trustAdjustment =
    (domainTrustScore - 0.5) * 0.28 +
    (cityTrustScore - 0.5) * 0.14 +
    (claimTypeTrustScore - 0.5) * 0.1 +
    claimTypeScoreAdjustment -
    cityCoolingPenalty
  const adjustedScore = Math.max(0, Math.min(1, overallScore + trustAdjustment))
  const officialEvidenceCount = verification.verificationJson?.officialEvidenceCount ?? 0
  const officialDomainCount = verification.verificationJson?.officialDomainCount ?? 0
  const gtfsEvidenceCount = verification.verificationJson?.gtfsEvidenceCount ?? 0
  const supportScore = verification.verificationJson?.supportScore ?? 0
  const contradictionScore = verification.verificationJson?.contradictionScore ?? 0
  const likelyRealTransitLine = verification.verificationJson?.likelyRealTransitLine ?? true
  const hasConflict = verification.verificationJson?.hasConflict ?? verification.contradictionFlag
  const followUpRecommended = verification.verificationJson?.followUpRecommended ?? false
  const missingEvidenceCount = verification.verificationJson?.missingEvidence?.length ?? 0
  const greenSourceThreshold = Math.max(
    thresholds.sourceTier + policyTuning.greenSourceTierDelta,
    domainTrustScore < 0.35 ? 0.9 : 0.85,
  )
  const greenAdjustedThreshold = Math.max(
    thresholds.adjustedScore + policyTuning.greenAdjustedScoreDelta,
    cityTrustScore < 0.35 || claimTypeTrustScore < 0.35 ? 0.86 : 0.81,
  )
  const redAdjustedThreshold = domainTrustScore < 0.3 ? 0.5 : 0.45
  const requiresOfficialEvidence = thresholds.requiresOfficialEvidence
  const stationLifecycle =
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'stationLifecycle' in candidate.metadata
      ? String(candidate.metadata.stationLifecycle || '')
      : ''
  const isStationRename =
    candidate.type === 'UPDATED_STATION' &&
    (stationLifecycle === 'rename' || candidate.diff?.change === 'gtfs-stop-rename')
  const isStationClosure = candidate.type === 'REMOVED_STATION' || stationLifecycle === 'closure'
  const stationRenameRequiresDualEvidence = isStationRename && officialEvidenceCount < 1
  const stationClosureRequiresManualReview = isStationClosure
  const hardenedAutoApplyAllowed =
    thresholds.autoApplyAllowed &&
    !isStationRename &&
    !isStationClosure &&
    candidate.type !== 'IMAGE_CANDIDATE'
  const qualifiesForNarrowAutoApply =
    hardenedAutoApplyAllowed &&
    !followUpRecommended &&
    missingEvidenceCount === 0 &&
    (candidate.confidence ?? 0) >= thresholds.confidence + 0.05 + policyTuning.greenConfidenceDelta &&
    adjustedScore >= greenAdjustedThreshold + 0.04 &&
    verification.sourceTierScore >= Math.max(greenSourceThreshold, 0.9) &&
    supportScore >= policyTuning.autoApplyMinSupportScore &&
    contradictionScore <= policyTuning.autoApplyMaxContradictionScore &&
    officialEvidenceCount + gtfsEvidenceCount >= policyTuning.autoApplyMinOfficialEvidenceCount &&
    officialDomainCount >= policyTuning.autoApplyMinOfficialDomainCount &&
    domainTrustScore >= policyTuning.autoApplyMinDomainTrustScore &&
    cityTrustScore >= policyTuning.autoApplyMinCityTrustScore &&
    claimTypeTrustScore >= policyTuning.autoApplyMinClaimTypeTrustScore

  if (feedback.forcedLane) {
    lane = feedback.forcedLane
    decisionReason = `Lane forced to ${feedback.forcedLane.toLowerCase()} by admin override.`
    autoApplyAllowed = feedback.forcedLane === 'GREEN' && qualifiesForNarrowAutoApply
  } else if (feedback.domainBlocked) {
    lane = 'RED'
    decisionReason = 'Source domain is blocked by automation audit metrics.'
  } else if (verification.contradictionFlag || hasConflict) {
    lane = 'RED'
    decisionReason = 'Contradictory evidence detected.'
  } else if (!likelyRealTransitLine && candidate.type === 'NEW_LINE') {
    lane = 'RED'
    decisionReason = 'Candidate does not look like a real transit line after verifier checks.'
  } else if (
    requiresOfficialEvidence &&
    officialEvidenceCount + gtfsEvidenceCount < 1
  ) {
    lane = 'YELLOW'
    decisionReason = 'Structured update needs direct official or GTFS evidence before auto-apply.'
  } else if (stationRenameRequiresDualEvidence) {
    lane = 'YELLOW'
    decisionReason = 'Station renames need direct official evidence before they can auto-apply.'
  } else if (stationClosureRequiresManualReview) {
    lane = 'YELLOW'
    decisionReason = 'Station removals stay in manual review even with strong GTFS evidence.'
  } else if (followUpRecommended) {
    lane = 'YELLOW'
    decisionReason = 'AI follow-up research is still recommended before this claim is ready for manual review or auto-apply.'
  } else if (
    GREEN_TYPES.has(candidate.type) &&
    (candidate.confidence ?? 0) >= thresholds.confidence &&
    verification.sourceTierScore >= greenSourceThreshold &&
    adjustedScore >= greenAdjustedThreshold &&
    (!requiresOfficialEvidence || officialEvidenceCount + gtfsEvidenceCount >= 1)
  ) {
    lane = 'GREEN'
    decisionReason =
      'Structured change with strong source quality, confidence, verification score, and historical trust metrics.'
    autoApplyAllowed = qualifiesForNarrowAutoApply
  } else if (RED_TYPES.has(candidate.type)) {
    lane = 'RED'
    decisionReason = 'Image and media candidates remain manual-review only.'
  } else if ((candidate.confidence ?? 0) < 0.55 || adjustedScore < redAdjustedThreshold) {
    lane = 'RED'
    decisionReason = 'Confidence or trust-adjusted verification score is below the minimum threshold.'
  } else if (domainTrustScore < 0.4 || cityTrustScore < 0.35 || claimTypeTrustScore < 0.35) {
    lane = 'YELLOW'
    decisionReason =
      'Historical audit metrics lowered confidence enough to require manual review.'
  }

  return {
    lane,
    decisionReason: `${decisionReason} (domain=${Math.round(domainTrustScore * 100)}%, city=${Math.round(
      cityTrustScore * 100,
    )}%, claim=${Math.round(claimTypeTrustScore * 100)}%, adjusted=${Math.round(
      adjustedScore * 100,
    )}%, cooling=${Math.round(cityCoolingPenalty * 100)}%, claimAdj=${Math.round(
      claimTypeScoreAdjustment * 100,
    )}%, official=${officialEvidenceCount}, officialDomains=${officialDomainCount}, gtfs=${gtfsEvidenceCount}, support=${Math.round(
      supportScore * 100,
    )}%, contradiction=${Math.round(contradictionScore * 100)}%, missing=${missingEvidenceCount}, autoApply=${autoApplyAllowed ? 'yes' : 'no'})`,
    autoApplyAllowed,
    policyVersion: 'phase-f-v1',
  }
}

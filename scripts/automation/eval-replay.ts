import { AutomationDecisionStatus, PrismaClient } from '@prisma/client'

import { buildAutomationClaimResearchState } from '../../src/lib/automationClaimState.ts'
import { buildClaimPolicy, type PolicyTuning } from '../metro-sync/policy'
import type { ReviewCandidate } from '../metro-sync/types'
import { buildVerificationScoresWithGrounding } from '../metro-sync/verify'

function parseArg(name: string, fallback?: string) {
  const match = process.argv.find((entry) => entry.startsWith(`${name}=`))
  if (!match) return fallback
  return match.slice(name.length + 1)
}

function parseCsvArg(name: string) {
  const value = parseArg(name, '')
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseNumberArg(name: string) {
  const raw = parseArg(name)
  const parsed = Number(raw || '')
  return Number.isFinite(parsed) ? parsed : null
}

function toReviewCandidate(candidate: {
  citySlug: string
  type: ReviewCandidate['type']
  entityKey: string | null
  title: string
  summary: string | null
  confidence: number | null
  beforeValue: unknown
  afterValue: unknown
  diff: unknown
  metadata: unknown
  sources: Array<{
    sourceType: string
    label: string | null
    url: string | null
    snippet: string | null
    metadata: unknown
  }>
}): ReviewCandidate {
  return {
    citySlug: candidate.citySlug,
    type: candidate.type,
    entityKey: candidate.entityKey || undefined,
    title: candidate.title,
    summary: candidate.summary || undefined,
    confidence: candidate.confidence ?? undefined,
    beforeValue: candidate.beforeValue,
    afterValue: candidate.afterValue,
    diff: candidate.diff,
    metadata: candidate.metadata,
    sources: candidate.sources.map((source) => ({
      sourceType: source.sourceType,
      label: source.label || undefined,
      url: source.url || undefined,
      snippet: source.snippet || undefined,
      metadata:
        source.metadata && typeof source.metadata === 'object'
          ? (source.metadata as Record<string, any>)
          : undefined,
    })),
  }
}

function classifyPredictedOutcome(lane: 'GREEN' | 'YELLOW' | 'RED') {
  if (lane === 'GREEN') return 'APPROVE'
  if (lane === 'RED') return 'REJECT'
  return 'REVIEW'
}

function buildCandidatePolicyTuningFromArgs() {
  const tuning: Partial<PolicyTuning> = {}
  const mapping: Array<[keyof PolicyTuning, string]> = [
    ['greenConfidenceDelta', '--candidate-green-confidence-delta'],
    ['greenAdjustedScoreDelta', '--candidate-green-adjusted-delta'],
    ['greenSourceTierDelta', '--candidate-green-source-tier-delta'],
    ['autoApplyMinOfficialEvidenceCount', '--candidate-auto-apply-min-official'],
    ['autoApplyMinOfficialDomainCount', '--candidate-auto-apply-min-official-domains'],
    ['autoApplyMinSupportScore', '--candidate-auto-apply-min-support'],
    ['autoApplyMaxContradictionScore', '--candidate-auto-apply-max-contradiction'],
    ['autoApplyMinDomainTrustScore', '--candidate-auto-apply-min-domain-trust'],
    ['autoApplyMinCityTrustScore', '--candidate-auto-apply-min-city-trust'],
    ['autoApplyMinClaimTypeTrustScore', '--candidate-auto-apply-min-claim-type-trust'],
  ]

  mapping.forEach(([key, flag]) => {
    const value = parseNumberArg(flag)
    if (value !== null) {
      tuning[key] = value
    }
  })

  return Object.keys(tuning).length > 0 ? tuning : null
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : []
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function getRecordedClaimState(candidate: {
  claim: {
    verificationNotes: unknown
    metadataJson: unknown
    verifications: Array<{ verificationJson: unknown }>
    researchRuns: Array<{
      id: string
      status: string
      attemptNumber: number
      tasks: Array<{
        id: string
        taskType: string
        status: string
        priority: number
        retryCount: number
        blockedReason: string | null
        nextActionHint: string | null
        nextAttemptAt: Date | null
        goalJson: unknown
      }>
    }>
    lane: 'GREEN' | 'YELLOW' | 'RED'
    autoApplyEligible: boolean
  } | null
}) {
  const notesState = asRecord(candidate.claim?.verificationNotes).claimResearchState
  if (notesState && typeof notesState === 'object') return notesState as Record<string, any>
  const metadataState = asRecord(candidate.claim?.metadataJson).claimResearchState
  if (metadataState && typeof metadataState === 'object') return metadataState as Record<string, any>
  if (!candidate.claim) return null

  return buildAutomationClaimResearchState({
    lane: candidate.claim.lane,
    autoApplyEligible: candidate.claim.autoApplyEligible,
    verificationJson: candidate.claim.verifications[0]?.verificationJson,
    tasks: candidate.claim.researchRuns[0]?.tasks || [],
    researchRuns: candidate.claim.researchRuns.map((run) => ({
      id: run.id,
      status: run.status,
      attemptNumber: run.attemptNumber,
    })),
    latestResearchRunId: candidate.claim.researchRuns[0]?.id || null,
  })
}

type ReplaySummary = {
  label: string
  total: number
  reviewedApproved: number
  reviewedRejected: number
  predictedApprove: number
  predictedReject: number
  predictedReview: number
  falsePositiveRate: number
  autoApplyFalsePositiveRate: number
  blockedRate: number
  exhaustedRate: number
  exactMatchRate: number
  conservativeMatchRate: number
  laneMatchRate: number
  stopReasonBreakdown: Array<{ stopReason: string; count: number }>
  greenPrecisionByClaimType: Array<{ claimType: string; total: number; precision: number | null }>
  autoApplyPrecisionByClaimType: Array<{ claimType: string; total: number; precision: number | null }>
  byType: Array<{ claimType: string; total: number; exactMatchRate: number; conservativeMatchRate: number }>
  falsePositiveCases: Array<Record<string, any>>
  mismatches: Array<Record<string, any>>
  filters: {
    limit: number
    citySlugs: string[]
    claimTypes: string[]
  }
  policyTuning: Partial<PolicyTuning> | null
}

async function buildReplaySummary(input: {
  label: string
  candidates: Array<any>
  policyTuning?: Partial<PolicyTuning> | null
  filters: {
    limit: number
    citySlugs: string[]
    claimTypes: string[]
  }
}) {
  const mismatches: Array<Record<string, any>> = []
  const falsePositiveCases: Array<Record<string, any>> = []
  const byType = new Map<string, { total: number; exact: number; conservative: number }>()
  const stopReasonCounts = new Map<string, number>()
  const greenPrecisionByType = new Map<string, { total: number; approved: number }>()
  const autoApplyPrecisionByType = new Map<string, { total: number; approved: number }>()

  let exactMatches = 0
  let conservativeMatches = 0
  let laneMatches = 0
  let predictedApprove = 0
  let predictedReject = 0
  let predictedReview = 0
  let falsePositiveCount = 0
  let autoApplyFalsePositiveCount = 0
  let blockedCount = 0
  let exhaustedCount = 0

  for (const candidate of input.candidates) {
    const reviewCandidate = toReviewCandidate(candidate)
    const verification = await buildVerificationScoresWithGrounding(reviewCandidate)
    const policy = buildClaimPolicy(reviewCandidate, verification, {
      ...(input.policyTuning ? { policyTuning: input.policyTuning } : {}),
    })
    const predictedOutcome = classifyPredictedOutcome(policy.lane)
    const humanOutcome =
      candidate.status === AutomationDecisionStatus.APPROVED ? 'APPROVE' : 'REJECT'
    const reverted = Boolean(candidate.run?.revertedAt)
    const recordedClaimState = getRecordedClaimState(candidate)
    const recordedClaimStateStatus =
      recordedClaimState && typeof recordedClaimState.status === 'string'
        ? recordedClaimState.status
        : null
    const stopReasons = recordedClaimState ? asStringArray(recordedClaimState.stopReasons) : []
    const exactMatch = predictedOutcome === humanOutcome
    const conservativeMatch =
      humanOutcome === 'APPROVE' ? predictedOutcome !== 'REJECT' : predictedOutcome === 'REJECT'
    const falsePositive =
      (policy.lane === 'GREEN' && humanOutcome === 'REJECT') ||
      (policy.autoApplyAllowed && (humanOutcome === 'REJECT' || reverted))

    if (policy.lane === 'GREEN') predictedApprove += 1
    if (policy.lane === 'RED') predictedReject += 1
    if (policy.lane === 'YELLOW') predictedReview += 1
    if (recordedClaimStateStatus === 'BLOCKED') blockedCount += 1
    if (recordedClaimStateStatus === 'EXHAUSTED') exhaustedCount += 1
    if (falsePositive) falsePositiveCount += 1
    if (policy.autoApplyAllowed && (humanOutcome === 'REJECT' || reverted)) {
      autoApplyFalsePositiveCount += 1
    }
    if (exactMatch) exactMatches += 1
    if (conservativeMatch) conservativeMatches += 1
    if (candidate.claim?.lane === policy.lane) laneMatches += 1

    stopReasons.forEach((reason) => {
      stopReasonCounts.set(reason, (stopReasonCounts.get(reason) || 0) + 1)
    })

    const currentType = byType.get(candidate.type) || { total: 0, exact: 0, conservative: 0 }
    currentType.total += 1
    if (exactMatch) currentType.exact += 1
    if (conservativeMatch) currentType.conservative += 1
    byType.set(candidate.type, currentType)

    if (policy.lane === 'GREEN') {
      const stats = greenPrecisionByType.get(candidate.type) || { total: 0, approved: 0 }
      stats.total += 1
      if (humanOutcome === 'APPROVE' && !reverted) stats.approved += 1
      greenPrecisionByType.set(candidate.type, stats)
    }
    if (policy.autoApplyAllowed) {
      const stats = autoApplyPrecisionByType.get(candidate.type) || { total: 0, approved: 0 }
      stats.total += 1
      if (humanOutcome === 'APPROVE' && !reverted) stats.approved += 1
      autoApplyPrecisionByType.set(candidate.type, stats)
    }

    if (!exactMatch || candidate.claim?.lane !== policy.lane) {
      mismatches.push({
        candidateId: candidate.id,
        citySlug: candidate.citySlug,
        claimType: candidate.type,
        title: candidate.title,
        humanOutcome,
        predictedOutcome,
        recordedLane: candidate.claim?.lane || null,
        predictedLane: policy.lane,
        recordedClaimState: recordedClaimStateStatus,
        stopReasons,
        reviewedAt: candidate.reviewedAt?.toISOString() || null,
        latestRecordedOverallScore:
          candidate.claim?.verifications[0]?.verificationJson &&
          typeof candidate.claim.verifications[0].verificationJson === 'object' &&
          'overallScore' in candidate.claim.verifications[0].verificationJson
            ? Number(candidate.claim.verifications[0].verificationJson.overallScore || 0)
            : null,
        replayedOverallScore:
          verification.verificationJson &&
          typeof verification.verificationJson === 'object' &&
          'overallScore' in verification.verificationJson
            ? Number(verification.verificationJson.overallScore || 0)
            : null,
        decisionReason: policy.decisionReason,
      })
    }

    if (falsePositive) {
      falsePositiveCases.push({
        candidateId: candidate.id,
        citySlug: candidate.citySlug,
        claimType: candidate.type,
        title: candidate.title,
        humanOutcome,
        reverted,
        predictedLane: policy.lane,
        autoApplyAllowed: policy.autoApplyAllowed,
        recordedClaimState: recordedClaimStateStatus,
        stopReasons,
        decisionReason: policy.decisionReason,
      })
    }
  }

  const toPrecisionRows = (values: Map<string, { total: number; approved: number }>) =>
    Array.from(values.entries())
      .map(([claimType, stats]) => ({
        claimType,
        total: stats.total,
        precision: stats.total > 0 ? Number((stats.approved / stats.total).toFixed(4)) : null,
      }))
      .sort((left, right) => right.total - left.total || left.claimType.localeCompare(right.claimType))

  return {
    label: input.label,
    total: input.candidates.length,
    reviewedApproved: input.candidates.filter(
      (candidate) => candidate.status === AutomationDecisionStatus.APPROVED,
    ).length,
    reviewedRejected: input.candidates.filter(
      (candidate) => candidate.status === AutomationDecisionStatus.REJECTED,
    ).length,
    predictedApprove,
    predictedReject,
    predictedReview,
    falsePositiveRate: Number((falsePositiveCount / input.candidates.length).toFixed(4)),
    autoApplyFalsePositiveRate: Number(
      (autoApplyFalsePositiveCount / input.candidates.length).toFixed(4),
    ),
    blockedRate: Number((blockedCount / input.candidates.length).toFixed(4)),
    exhaustedRate: Number((exhaustedCount / input.candidates.length).toFixed(4)),
    exactMatchRate: Number((exactMatches / input.candidates.length).toFixed(4)),
    conservativeMatchRate: Number((conservativeMatches / input.candidates.length).toFixed(4)),
    laneMatchRate: Number((laneMatches / input.candidates.length).toFixed(4)),
    stopReasonBreakdown: Array.from(stopReasonCounts.entries())
      .map(([stopReason, count]) => ({ stopReason, count }))
      .sort((left, right) => right.count - left.count || left.stopReason.localeCompare(right.stopReason)),
    greenPrecisionByClaimType: toPrecisionRows(greenPrecisionByType),
    autoApplyPrecisionByClaimType: toPrecisionRows(autoApplyPrecisionByType),
    byType: Array.from(byType.entries())
      .map(([claimType, stats]) => ({
        claimType,
        total: stats.total,
        exactMatchRate: Number((stats.exact / stats.total).toFixed(4)),
        conservativeMatchRate: Number((stats.conservative / stats.total).toFixed(4)),
      }))
      .sort((left, right) => right.total - left.total || left.claimType.localeCompare(right.claimType)),
    falsePositiveCases: falsePositiveCases.slice(0, 25),
    mismatches: mismatches.slice(0, 25),
    filters: input.filters,
    policyTuning: input.policyTuning || null,
  } satisfies ReplaySummary
}

function buildSummaryDiff(baseline: ReplaySummary, candidate: ReplaySummary) {
  return {
    falsePositiveRateDelta: Number(
      (candidate.falsePositiveRate - baseline.falsePositiveRate).toFixed(4),
    ),
    autoApplyFalsePositiveRateDelta: Number(
      (candidate.autoApplyFalsePositiveRate - baseline.autoApplyFalsePositiveRate).toFixed(4),
    ),
    predictedReviewDelta: candidate.predictedReview - baseline.predictedReview,
    predictedApproveDelta: candidate.predictedApprove - baseline.predictedApprove,
    exactMatchRateDelta: Number((candidate.exactMatchRate - baseline.exactMatchRate).toFixed(4)),
    conservativeMatchRateDelta: Number(
      (candidate.conservativeMatchRate - baseline.conservativeMatchRate).toFixed(4),
    ),
  }
}

async function main() {
  const prisma = new PrismaClient()
  const limit = Math.max(1, Number(parseArg('--limit', '50')) || 50)
  const citySlugs = parseCsvArg('--cities')
  const claimTypes = parseCsvArg('--types')
  const label =
    parseArg('--label') ||
    `replay-${new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '')}`
  const candidatePolicyTuning = buildCandidatePolicyTuningFromArgs()

  try {
    const candidates = await prisma.automationCandidate.findMany({
      where: {
        status: {
          in: [AutomationDecisionStatus.APPROVED, AutomationDecisionStatus.REJECTED],
        },
        ...(citySlugs.length > 0 ? { citySlug: { in: citySlugs } } : {}),
        ...(claimTypes.length > 0 ? { type: { in: claimTypes as ReviewCandidate['type'][] } } : {}),
        claim: {
          isNot: null,
        },
      },
      orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        sources: true,
        run: {
          select: {
            revertedAt: true,
          },
        },
        claim: {
          include: {
            verifications: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            policyDecisions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            researchRuns: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                tasks: {
                  orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        },
      },
    })

    if (candidates.length === 0) {
      console.log('No reviewed automation candidates matched the replay filters.')
      return
    }

    const filters = {
      limit,
      citySlugs,
      claimTypes,
    }
    const baseline = await buildReplaySummary({
      label: `${label}:baseline`,
      candidates,
      filters,
    })
    const candidate = candidatePolicyTuning
      ? await buildReplaySummary({
          label: `${label}:candidate`,
          candidates,
          policyTuning: candidatePolicyTuning,
          filters,
        })
      : null
    const summary = {
      label,
      baseline,
      candidate,
      diff: candidate ? buildSummaryDiff(baseline, candidate) : null,
    }

    await prisma.automationEvalRun.create({
      data: {
        label,
        requestedBy: process.env.USER || process.env.AUTOMATION_ADMIN_LABEL || 'automation-cli',
        inputJson: {
          limit,
          citySlugs,
          claimTypes,
          candidatePolicyTuning,
        },
        summaryJson: summary,
      },
    })

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

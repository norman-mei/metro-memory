import ApplyRunButton from '@/app/(website)/admin/automation/ApplyRunButton'
import AutomationAgentPanel from '@/app/(website)/admin/automation/AutomationAgentPanel'
import BulkReviewActions from '@/app/(website)/admin/automation/BulkReviewActions'
import QuickBulkReviewButton from '@/app/(website)/admin/automation/QuickBulkReviewButton'
import RevertRunButton from '@/app/(website)/admin/automation/RevertRunButton'
import TrustOverrideForm from '@/app/(website)/admin/automation/TrustOverrideForm'
import { Button } from '@/components/Button'
import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import { AutomationDecisionStatus, AutomationLane } from '@prisma/client'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import CandidateReviewActions from '@/app/(website)/admin/automation/CandidateReviewActions'
import ResearchFollowUpActions from '@/app/(website)/admin/automation/ResearchFollowUpActions'
import {
  isAutomationAdminAuthenticated,
  isAutomationAdminConfigured,
} from '@/lib/adminAuth'
import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'
import {
  getAutomationAnalyticsOverview,
  getAutomationAuditOverview,
  listAutomationEvalRuns,
  listAutomationRuns,
} from '@/lib/automationReview'
import { listAutomationAgentSessions } from '@/lib/automationRunRequests'
import { getAutomationApplyWorkflowStatuses } from '@/lib/automationWorkflowStatus'
import { buildAutomationClaimResearchState } from '@/lib/automationClaimState'

export const metadata = {
  title: 'Automation Review | Metro Memory',
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

type ImageSourcePolicyMetadata = {
  status?: string
  hostname?: string
  reason?: string
  licenseStatus?: string
  policyVersion?: string
}

type AutomationRunRecord = Awaited<ReturnType<typeof listAutomationRuns>>[number]
type AutomationCandidateRecord = AutomationRunRecord['candidates'][number]
type AutomationEvalRunRecord = Awaited<ReturnType<typeof listAutomationEvalRuns>>[number]
type ParsedSourceSuggestion = {
  city: string
  sourceKey: string
  url: string
}

function getClaimResearchState(candidate: AutomationCandidateRecord) {
  const notes =
    candidate.claim?.verificationNotes && typeof candidate.claim.verificationNotes === 'object'
      ? (candidate.claim.verificationNotes as Record<string, any>)
      : {}
  const metadata =
    candidate.claim?.metadataJson && typeof candidate.claim.metadataJson === 'object'
      ? (candidate.claim.metadataJson as Record<string, any>)
      : {}
  const persisted = notes.claimResearchState || metadata.claimResearchState
  if (persisted && typeof persisted === 'object') {
    return persisted as ReturnType<typeof buildAutomationClaimResearchState>
  }
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

function getClaimResearchStatus(candidate: AutomationCandidateRecord) {
  return getClaimResearchState(candidate)?.status || null
}

function getClaimStopReasons(candidate: AutomationCandidateRecord) {
  const claimResearchState = getClaimResearchState(candidate)
  const stopReasons = claimResearchState?.stopReasons
  return Array.isArray(stopReasons) ? stopReasons.map((reason) => String(reason)) : []
}

function getEvalSummary(evalRun: AutomationEvalRunRecord) {
  return evalRun.summaryJson && typeof evalRun.summaryJson === 'object'
    ? (evalRun.summaryJson as Record<string, any>)
    : null
}

function getBaselineEvalSummary(evalRun: AutomationEvalRunRecord) {
  const summary = getEvalSummary(evalRun)
  if (summary?.baseline && typeof summary.baseline === 'object') {
    return summary.baseline as Record<string, any>
  }
  return summary
}

function formatStopReason(reason: string) {
  return reason.toLowerCase().replaceAll('_', ' ')
}

function formatPercentStat(value: number | null | undefined) {
  return `${percentFormatter.format(Number(value || 0) * 100)}%`
}

function getResearchStateClasses(status: string | null | undefined) {
  if (status === 'SATISFIED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
  }
  if (status === 'BLOCKED') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
  }
  if (status === 'EXHAUSTED') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
  }
  return 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300'
}

function getDecisionStatusClasses(status: AutomationDecisionStatus) {
  if (status === AutomationDecisionStatus.APPROVED) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
  }
  if (status === AutomationDecisionStatus.REJECTED) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
}

function getRunStatusClasses(status: string | null | undefined) {
  if (status === 'COMPLETED' || status === 'APPLIED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
  }
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
  }
  if (status === 'RUNNING') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300'
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
}

const shellPanelClass =
  'relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white/88 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/72'

const nestedPanelClass =
  'rounded-[1.25rem] border border-zinc-200/80 bg-white/72 p-4 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-950/58'

const mutedPanelClass =
  'rounded-[1.25rem] border border-zinc-200/70 bg-zinc-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/60'

const filterInputClass =
  'w-full rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-100 dark:focus:border-sky-500 dark:focus:ring-sky-950/60'

const badgeClass =
  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]'

type CityQueueSummary = {
  citySlug: string
  total: number
  pending: number
  approved: number
  rejected: number
  safePendingIds: string[]
  trustBlockedIds: string[]
  stationUpdateSetCount: number
}

function getLatestVerification(candidate: AutomationCandidateRecord) {
  return candidate.claim?.verifications[0] || null
}

function getLatestPolicyDecision(candidate: AutomationCandidateRecord) {
  return candidate.claim?.policyDecisions[0] || null
}

function getLatestResearchRun(candidate: AutomationCandidateRecord) {
  return candidate.claim?.researchRuns[0] || null
}

function getLatestResearchTaskId(candidate: AutomationCandidateRecord) {
  const latestResearchRun = getLatestResearchRun(candidate)
  return latestResearchRun?.tasks?.[0]?.id || null
}

function getVerificationOverallScore(candidate: AutomationCandidateRecord) {
  const verificationJson = getLatestVerification(candidate)?.verificationJson
  if (!verificationJson || typeof verificationJson !== 'object') return null
  if (!('overallScore' in verificationJson)) return null
  const score = verificationJson.overallScore
  return typeof score === 'number' ? score : null
}

function getVerificationJson(candidate: AutomationCandidateRecord) {
  const verificationJson = getLatestVerification(candidate)?.verificationJson
  return verificationJson && typeof verificationJson === 'object' ? verificationJson : null
}

function getMissingEvidence(candidate: AutomationCandidateRecord) {
  const verificationJson = getVerificationJson(candidate)
  if (!verificationJson || !('missingEvidence' in verificationJson)) return [] as string[]
  return Array.isArray(verificationJson.missingEvidence)
    ? verificationJson.missingEvidence.map((value) => String(value))
    : []
}

function getNextBestAction(candidate: AutomationCandidateRecord) {
  const verificationJson = getVerificationJson(candidate)
  if (!verificationJson || !('nextBestAction' in verificationJson)) return null
  return typeof verificationJson.nextBestAction === 'string'
    ? verificationJson.nextBestAction
    : null
}

function isAiFollowUpRecommended(candidate: AutomationCandidateRecord) {
  const verificationJson = getVerificationJson(candidate)
  if (!verificationJson || !('followUpRecommended' in verificationJson)) return false
  return Boolean(verificationJson.followUpRecommended)
}

function getFollowUpStatus(candidate: AutomationCandidateRecord) {
  const latestResearchRun = getLatestResearchRun(candidate)
  if (latestResearchRun?.status) {
    return String(latestResearchRun.status)
  }

  if (
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'followUpStatus' in candidate.metadata &&
    candidate.metadata.followUpStatus
  ) {
    return String(candidate.metadata.followUpStatus)
  }

  return null
}

function isWaitingOnAiFollowUp(candidate: AutomationCandidateRecord) {
  const status = getFollowUpStatus(candidate)
  return status === 'PENDING' || status === 'RUNNING'
}

function isLikelyRealTransitLine(candidate: AutomationCandidateRecord) {
  const verificationJson = getVerificationJson(candidate)
  if (!verificationJson || !('likelyRealTransitLine' in verificationJson)) return false
  return Boolean(verificationJson.likelyRealTransitLine)
}

function hasConflictingEvidence(candidate: AutomationCandidateRecord) {
  const verificationJson = getVerificationJson(candidate)
  if (!verificationJson || !('hasConflict' in verificationJson)) return false
  return Boolean(verificationJson.hasConflict)
}

function isBlockedByTrustPolicy(candidate: AutomationCandidateRecord) {
  const latestPolicy = getLatestPolicyDecision(candidate)
  if (!latestPolicy?.decisionReason) return false
  return latestPolicy.decisionReason.toLowerCase().includes('blocked by automation audit metrics')
}

function getClusterSize(candidate: AutomationCandidateRecord) {
  if (
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'clusterSize' in candidate.metadata
  ) {
    return Number(candidate.metadata.clusterSize) || 0
  }
  return 0
}

function getStationUpdateSetKey(candidate: AutomationCandidateRecord) {
  if (
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'stationUpdateSetKey' in candidate.metadata &&
    candidate.metadata.stationUpdateSetKey
  ) {
    return String(candidate.metadata.stationUpdateSetKey)
  }
  if (
    candidate.type === 'NEW_STATION' ||
    candidate.type === 'UPDATED_STATION' ||
    candidate.type === 'REMOVED_STATION'
  ) {
    const lineHint =
      (candidate.diff &&
      typeof candidate.diff === 'object' &&
      ('lineId' in candidate.diff || 'lineName' in candidate.diff)
        ? String(candidate.diff.lineId || candidate.diff.lineName || '')
        : '') ||
      String(candidate.entityKey || '').split('|')[0] ||
      'unknown'
    return `${candidate.citySlug}|${lineHint}|stations`
  }
  return null
}

function getStationUpdateSetLabel(candidate: AutomationCandidateRecord) {
  if (
    candidate.metadata &&
    typeof candidate.metadata === 'object' &&
    'stationUpdateSetLabel' in candidate.metadata &&
    candidate.metadata.stationUpdateSetLabel
  ) {
    return String(candidate.metadata.stationUpdateSetLabel)
  }
  const key = getStationUpdateSetKey(candidate)
  if (!key) return null
  const [, lineHint] = key.split('|')
  return `${lineHint || 'unknown'} station update set`
}

function getLaneClasses(lane: AutomationLane | null | undefined) {
  if (lane === AutomationLane.GREEN) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  }
  if (lane === AutomationLane.RED) {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
}

function getLaneLabel(lane: AutomationLane | null | undefined) {
  if (lane === AutomationLane.GREEN) return 'ready'
  if (lane === AutomationLane.RED) return 'blocked'
  return 'review'
}

function formatCandidateTypeLabel(type: string) {
  return type.toLowerCase().replaceAll('_', ' ')
}

function formatCitationLocator(citation: {
  locatorType: string
  pageNumber: number | null
  domSelector: string | null
}) {
  if (citation.locatorType === 'PDF_PAGE' && typeof citation.pageNumber === 'number') {
    return `PDF page ${citation.pageNumber}`
  }
  if (citation.locatorType === 'HTML_SELECTOR' && citation.domSelector) {
    return citation.domSelector
  }
  return citation.locatorType.toLowerCase().replaceAll('_', ' ')
}

function getClaimProvenanceEntries(candidate: AutomationCandidateRecord) {
  return candidate.claim?.citations || []
}

function getCandidateHeadlineReason(candidate: AutomationCandidateRecord) {
  const verificationJson = getVerificationJson(candidate)
  const latestPolicy = getLatestPolicyDecision(candidate)
  const reasons: string[] = []
  const officialEvidenceCount =
    verificationJson &&
    'officialEvidenceCount' in verificationJson &&
    typeof verificationJson.officialEvidenceCount === 'number'
      ? verificationJson.officialEvidenceCount
      : 0
  const gtfsEvidenceCount =
    verificationJson &&
    'gtfsEvidenceCount' in verificationJson &&
    typeof verificationJson.gtfsEvidenceCount === 'number'
      ? verificationJson.gtfsEvidenceCount
      : 0

  if (candidate.summary) {
    reasons.push(candidate.summary)
  }

  if (officialEvidenceCount > 0) {
    reasons.push(
      `Matched ${officialEvidenceCount} official source${officialEvidenceCount === 1 ? '' : 's'}.`,
    )
  }
  if (gtfsEvidenceCount > 0) {
    reasons.push(
      `Backed by ${gtfsEvidenceCount} GTFS feed check${gtfsEvidenceCount === 1 ? '' : 's'}.`,
    )
  }
  if (hasConflictingEvidence(candidate)) {
    reasons.push('Some sources disagree, so this needs a closer review.')
  }
  if (isBlockedByTrustPolicy(candidate)) {
    reasons.push('The source history for this suggestion is currently low-trust.')
  }
  if (latestPolicy?.decisionReason && !reasons.includes(latestPolicy.decisionReason)) {
    reasons.push(latestPolicy.decisionReason)
  }

  return reasons.filter(Boolean).slice(0, 3)
}

function getCandidateDiffSummary(candidate: AutomationCandidateRecord) {
  const diff = candidate.diff && typeof candidate.diff === 'object' ? candidate.diff : null
  if (!diff) return null
  const change = 'change' in diff ? String(diff.change || '') : ''
  const fromValue = 'from' in diff ? String(diff.from || '') : ''
  const toValue = 'to' in diff ? String(diff.to || '') : ''
  const stationName = 'stationName' in diff ? String(diff.stationName || '') : ''
  const lineId = 'lineId' in diff ? String(diff.lineId || '') : ''
  if (change === 'gtfs-stop-rename') {
    return `Rename ${fromValue || 'station'} to ${toValue || 'new name'}.`
  }
  if (change === 'gtfs-stop-removed') {
    return `Review whether ${stationName || 'this station'} should be removed from ${lineId || 'the line'}.`
  }
  if (change === 'gtfs-stop-add') {
    return `Add a GTFS-backed station to ${lineId || 'the line'}.`
  }
  if (change === 'gtfs-stop-move') {
    return `Update the mapped location for this station from GTFS coordinates.`
  }
  if (change === 'gtfs-line-rename') {
    return `Rename ${fromValue || 'this line'} to ${toValue || 'the official name'}.`
  }
  if (change === 'line-color-update') {
    return `Update the configured line color from official evidence.`
  }
  if (change === 'operator-metadata-update') {
    return `Update operator-facing copy from official metadata sources.`
  }
  if (change === 'metadata-description-update') {
    return `Refresh the generated metadata description for this city.`
  }
  return null
}

function parseSourceSuggestionsFromReport(reportMarkdown: string | null | undefined) {
  if (!reportMarkdown) return [] as ParsedSourceSuggestion[]

  const suggestions: ParsedSourceSuggestion[] = []
  let currentCity = ''

  reportMarkdown.split('\n').forEach((line) => {
    if (line.startsWith('## ')) {
      currentCity = line.replace(/^##\s+/, '').trim()
      return
    }
    if (!line.startsWith('- Source enrichment: ') || !currentCity) {
      return
    }

    line
      .replace('- Source enrichment: ', '')
      .split(' | ')
      .map((entry) => entry.trim())
      .forEach((entry) => {
        const [sourceKey, url] = entry.split(' -> ')
        if (!sourceKey || !url) return
        suggestions.push({
          city: currentCity,
          sourceKey: sourceKey.trim(),
          url: url.trim(),
        })
      })
  })

  return suggestions
}

function getRunCounts(run: Awaited<ReturnType<typeof listAutomationRuns>>[number]) {
  return run.candidates.reduce(
    (acc, candidate) => {
      acc.total += 1
      acc[candidate.status] += 1
      if (candidate.appliedAt) {
        acc.applied += 1
      }
      return acc
    },
    {
      total: 0,
      applied: 0,
      [AutomationDecisionStatus.PENDING]: 0,
      [AutomationDecisionStatus.APPROVED]: 0,
      [AutomationDecisionStatus.REJECTED]: 0,
    },
  )
}

function buildCityQueueSummaries(run: AutomationRunRecord): CityQueueSummary[] {
  const grouped = new Map<string, CityQueueSummary>()

  run.candidates.forEach((candidate) => {
    const current =
      grouped.get(candidate.citySlug) || {
        citySlug: candidate.citySlug,
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        safePendingIds: [],
        trustBlockedIds: [],
        stationUpdateSetCount: 0,
      }
    current.total += 1
    if (candidate.status === AutomationDecisionStatus.PENDING) current.pending += 1
    if (candidate.status === AutomationDecisionStatus.APPROVED) current.approved += 1
    if (candidate.status === AutomationDecisionStatus.REJECTED) current.rejected += 1

    const reviewScore = getVerificationOverallScore(candidate)
    const isSafePending =
      candidate.status === AutomationDecisionStatus.PENDING &&
      !hasConflictingEvidence(candidate) &&
      !isBlockedByTrustPolicy(candidate) &&
      ((candidate.claim?.lane === AutomationLane.GREEN && candidate.claim.autoApplyEligible) ||
        (isLikelyRealTransitLine(candidate) && (reviewScore || 0) >= 0.88))
    if (isSafePending) {
      current.safePendingIds.push(candidate.id)
    }
    if (
      candidate.status === AutomationDecisionStatus.PENDING &&
      isBlockedByTrustPolicy(candidate)
    ) {
      current.trustBlockedIds.push(candidate.id)
    }

    grouped.set(candidate.citySlug, current)
  })

  grouped.forEach((summary) => {
    const stationSetKeys = new Set(
      run.candidates
        .filter((candidate) => candidate.citySlug === summary.citySlug)
        .map(getStationUpdateSetKey)
        .filter(Boolean),
    )
    summary.stationUpdateSetCount = stationSetKeys.size
  })

  return Array.from(grouped.values()).sort((left, right) =>
    right.pending - left.pending || left.citySlug.localeCompare(right.citySlug),
  )
}

export default async function AutomationAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!isAutomationAdminConfigured()) {
    redirect('/admin/automation/login')
  }

  if (!(await isAutomationAdminAuthenticated())) {
    redirect('/admin/automation/login')
  }

  const resolvedSearchParams = (await searchParams) || {}
  const statusFilter = String(resolvedSearchParams.status || '').toUpperCase()
  const typeFilter = String(resolvedSearchParams.type || '').toUpperCase()
  const cityFilter = String(resolvedSearchParams.city || '').trim().toLowerCase()
  const applyFilter = String(resolvedSearchParams.apply || '').toUpperCase()
  const laneFilter = String(resolvedSearchParams.lane || '').toUpperCase()
  const bootstrapFilter = String(resolvedSearchParams.bootstrap || '').toUpperCase()
  const lineRealityFilter = String(resolvedSearchParams.lineReality || '').toUpperCase()
  const conflictFilter = String(resolvedSearchParams.conflicts || '').toUpperCase()
  const trustBlockedFilter = String(resolvedSearchParams.trustBlocked || '').toUpperCase()
  const researchStateFilter = String(resolvedSearchParams.researchState || '').toUpperCase()
  const stopReasonFilter = String(resolvedSearchParams.stopReason || '').trim().toLowerCase()
  const autoApplyFilter = String(resolvedSearchParams.autoApply || '').toUpperCase()
  const confidenceMinInput = String(resolvedSearchParams.confidenceMin || '').trim()
  const confidenceMin = confidenceMinInput ? Number(confidenceMinInput) : null

  const [runResults, auditOverview, analyticsOverview, agentSessions, evalRuns] = await Promise.all([
    listAutomationRuns(10),
    getAutomationAuditOverview(5),
    getAutomationAnalyticsOverview(6),
    listAutomationAgentSessions(20),
    listAutomationEvalRuns(6),
  ])

  const runs = runResults
    .map((run) => ({
      ...run,
      candidates: run.candidates.filter((candidate) => {
        if (
          statusFilter &&
          statusFilter !== 'ALL' &&
          String(candidate.status) !== statusFilter
        ) {
          return false
        }
        if (typeFilter && typeFilter !== 'ALL' && String(candidate.type) !== typeFilter) {
          return false
        }
        if (applyFilter === 'UNAPPLIED' && candidate.appliedAt) {
          return false
        }
        if (applyFilter === 'APPLIED' && !candidate.appliedAt) {
          return false
        }
        if (
          laneFilter &&
          laneFilter !== 'ALL' &&
          String(candidate.claim?.lane || '').toUpperCase() !== laneFilter
        ) {
          return false
        }
        const bootstrapKind =
          candidate.metadata &&
          typeof candidate.metadata === 'object' &&
          'bootstrapKind' in candidate.metadata
            ? String(candidate.metadata.bootstrapKind || '')
            : ''
        if (bootstrapFilter === 'ONLY' && bootstrapKind !== 'initial-registry-bootstrap') {
          return false
        }
        if (bootstrapFilter === 'EXCLUDE' && bootstrapKind === 'initial-registry-bootstrap') {
          return false
        }
        if (lineRealityFilter === 'ONLY' && !isLikelyRealTransitLine(candidate)) {
          return false
        }
        if (lineRealityFilter === 'EXCLUDE' && isLikelyRealTransitLine(candidate)) {
          return false
        }
        if (conflictFilter === 'ONLY' && !hasConflictingEvidence(candidate)) {
          return false
        }
        if (conflictFilter === 'EXCLUDE' && hasConflictingEvidence(candidate)) {
          return false
        }
        if (trustBlockedFilter === 'ONLY' && !isBlockedByTrustPolicy(candidate)) {
          return false
        }
        if (trustBlockedFilter === 'EXCLUDE' && isBlockedByTrustPolicy(candidate)) {
          return false
        }
        const claimResearchState = getClaimResearchState(candidate)
        const claimResearchStatus = claimResearchState?.status || ''
        if (
          researchStateFilter &&
          researchStateFilter !== 'ALL' &&
          String(claimResearchStatus).toUpperCase() !== researchStateFilter
        ) {
          return false
        }
        if (
          stopReasonFilter &&
          !getClaimStopReasons(candidate).some((reason) =>
            String(reason).toLowerCase().includes(stopReasonFilter),
          )
        ) {
          return false
        }
        if (autoApplyFilter === 'ONLY' && !candidate.claim?.autoApplyEligible) {
          return false
        }
        if (autoApplyFilter === 'EXCLUDE' && candidate.claim?.autoApplyEligible) {
          return false
        }
        if (confidenceMin !== null && Number.isFinite(confidenceMin)) {
          const score = getVerificationOverallScore(candidate)
          if (score === null || score * 100 < confidenceMin) {
            return false
          }
        }
        if (
          cityFilter &&
          !candidate.citySlug.toLowerCase().includes(cityFilter) &&
          !(candidate.title || '').toLowerCase().includes(cityFilter)
        ) {
          return false
        }
        return true
      }),
    }))
    .filter(
      (run) =>
        run.candidates.length > 0 ||
        (!statusFilter &&
          !typeFilter &&
          !cityFilter &&
          !applyFilter &&
          !laneFilter &&
          !bootstrapFilter &&
          !lineRealityFilter &&
          !conflictFilter &&
          !trustBlockedFilter &&
          !researchStateFilter &&
          !stopReasonFilter &&
          !autoApplyFilter &&
          !confidenceMinInput),
    )

  const applyWorkflowStatuses = await getAutomationApplyWorkflowStatuses(
    runs.map((run) => ({
      runId: run.id,
      summary: run.summary,
    })),
  )
  const serializedAgentSessions = JSON.parse(JSON.stringify(agentSessions))
  const sourceSuggestionsByRun = new Map(
    runs.map((run) => [run.id, parseSourceSuggestionsFromReport(run.reportMarkdown)]),
  )
  const databaseUrl = process.env.DATABASE_URL?.trim() || ''
  const usingLocalSqliteDatabase = !databaseUrl || databaseUrl.startsWith('file:')
  const visibleCandidates = runs.flatMap((run) => run.candidates)
  const visibleCities = new Set(visibleCandidates.map((candidate) => candidate.citySlug))
  const readyAutoApplyCount = visibleCandidates.filter(
    (candidate) =>
      candidate.claim?.lane === AutomationLane.GREEN && candidate.claim?.autoApplyEligible,
  ).length
  const manualReviewCount = visibleCandidates.filter(
    (candidate) =>
      candidate.status === AutomationDecisionStatus.PENDING &&
      (!candidate.claim?.autoApplyEligible || candidate.claim?.lane !== AutomationLane.GREEN),
  ).length
  const pendingResearchCount = visibleCandidates.filter(
    (candidate) => getClaimResearchStatus(candidate) === 'PENDING',
  ).length
  const blockedResearchCount = visibleCandidates.filter((candidate) => {
    const status = getClaimResearchStatus(candidate)
    return status === 'BLOCKED' || status === 'EXHAUSTED'
  }).length
  const approvedVisibleCount = visibleCandidates.filter(
    (candidate) => candidate.status === AutomationDecisionStatus.APPROVED,
  ).length
  const activeFilterCount = [
    statusFilter,
    typeFilter,
    cityFilter,
    applyFilter,
    laneFilter,
    bootstrapFilter,
    lineRealityFilter,
    conflictFilter,
    trustBlockedFilter,
    researchStateFilter,
    stopReasonFilter,
    autoApplyFilter,
    confidenceMinInput,
  ].filter((value) => value && value !== 'ALL').length

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f1ea] pt-4 pb-20 dark:bg-[#09090b]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.14),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.3),_rgba(244,241,234,0))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,_rgba(24,24,27,0.25),_rgba(9,9,11,0))]" />
      <div className="pointer-events-none fixed -top-24 right-[-8rem] z-0 h-[24rem] w-[24rem] rounded-full bg-sky-400/10 blur-[110px] dark:bg-sky-500/10" />
      <div className="pointer-events-none fixed bottom-[-8rem] left-[-6rem] z-0 h-[20rem] w-[20rem] rounded-full bg-amber-300/10 blur-[120px] dark:bg-amber-500/10" />
      <div className="relative z-10 mx-auto w-full max-w-[92rem] px-4 py-10 text-zinc-950 sm:px-6 lg:px-8 lg:pl-24 dark:text-zinc-50">
        <Suspense fallback={null}>
          <StandaloneSidebarNav />
        </Suspense>

        <div className="mb-6 flex justify-start">
          <Button href="/?tab=cities" variant="secondary" className="rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-2.5 shadow-sm dark:border-white/10 dark:bg-zinc-950/70">
            Back to home
          </Button>
        </div>

        <section className={`${shellPanelClass} mb-8 p-6 lg:p-8`}>
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(14,165,233,0.16),rgba(251,191,36,0.08),transparent)] dark:bg-[linear-gradient(90deg,rgba(14,165,233,0.14),rgba(251,191,36,0.08),transparent)]" />
          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${badgeClass} bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300`}>
                  Admin review
                </span>
                <span className={`${badgeClass} bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300`}>
                  {runs.length} visible run{runs.length === 1 ? '' : 's'}
                </span>
                {activeFilterCount ? (
                  <span className={`${badgeClass} bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300`}>
                    {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                  Automation control center
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
                  Review evidence, drain research follow-up, and ship safe changes without digging through raw system internals first. The queue is now claim-centric, so the page prioritizes status, stop reasons, and next bounded work over chat history.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={nestedPanelClass}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    Review
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    Evidence, citations, and contradictions are grouped with each claim before you decide.
                  </p>
                </div>
                <div className={nestedPanelClass}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    Contain
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    Hard-stop rules now halt wasted retries when evidence quality, trust, or contradiction thresholds fail.
                  </p>
                </div>
                <div className={nestedPanelClass}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                    Apply
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    Green lane and auto-apply are separated, so only the safest reviewed candidates move on to PR creation.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[24rem] xl:max-w-[26rem]">
              <div className={`${nestedPanelClass} bg-zinc-950 text-white dark:bg-zinc-900`}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  Visible queue
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-4xl font-semibold tracking-tight">{visibleCandidates.length}</div>
                  <div className="text-sm text-zinc-400">
                    {visibleCities.size} cit{visibleCities.size === 1 ? 'y' : 'ies'}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {manualReviewCount} still require a human decision after policy and verification.
                </p>
              </div>
              <div className={nestedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                  Ready to apply
                </p>
                <div className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {readyAutoApplyCount}
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Approved green-lane candidates with auto-apply eligibility.
                </p>
              </div>
              <div className={nestedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                  Research in flight
                </p>
                <div className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {pendingResearchCount}
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Claims still draining bounded follow-up work.
                </p>
              </div>
              <div className={nestedPanelClass}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                  Contained claims
                </p>
                <div className="mt-3 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  {blockedResearchCount}
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Blocked or exhausted claims that stopped cleanly instead of looping.
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={mutedPanelClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Pending review
              </div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {visibleCandidates.filter((candidate) => candidate.status === AutomationDecisionStatus.PENDING).length}
              </div>
            </div>
            <div className={mutedPanelClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Approved
              </div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {approvedVisibleCount}
              </div>
            </div>
            <div className={mutedPanelClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Review only
              </div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {manualReviewCount}
              </div>
            </div>
            <div className={mutedPanelClass}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Agent sessions
              </div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                {serializedAgentSessions.length}
              </div>
            </div>
          </div>
        </section>

        {usingLocalSqliteDatabase ? (
          <section className={`${shellPanelClass} mb-8 border-amber-300/80 bg-amber-50/90 p-5 dark:border-amber-900/80 dark:bg-amber-950/30`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
              Deployment warning
            </p>
            <h2 className="mt-2 text-xl font-semibold text-amber-950 dark:text-amber-50">
              Auth and automation are still using local SQLite
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-900 dark:text-amber-100">
              This is acceptable for local development, but not for production. Vercel and GitHub Actions cannot share a local <code>file:</code> database, so logins, apply jobs, audit history, and review state need a shared external <code>DATABASE_URL</code>.
            </p>
            <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">
              Recommended next step: move auth and automation to managed Postgres and point both Vercel and GitHub Actions at the same connection string.
            </p>
          </section>
        ) : null}

        <section className={`${shellPanelClass} mb-8 p-5 lg:p-6`}>
          <div className="mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Operator tools
              </p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                Research console
              </h2>
            </div>
          </div>
          <AutomationAgentPanel
            initialSessions={serializedAgentSessions}
            availableCitySlugs={Array.from(AVAILABLE_CITY_SLUGS)}
          />
        </section>

        <section className={`${shellPanelClass} mb-8 p-5 lg:p-6`}>
          <details className="group" open={activeFilterCount > 0 ? true : undefined}>
          <summary className="flex cursor-pointer flex-wrap items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                Queue controls
              </p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                Filter the review surface
                <svg className="ml-2 inline-block h-5 w-5 text-zinc-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Narrow by lane, trust, research state, or stop reason so the queue stays operational.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilterCount ? (
                <span className={`${badgeClass} bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950`}>
                  {activeFilterCount} active
                </span>
              ) : (
                <span className={`${badgeClass} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300`}>
                  No active filters
                </span>
              )}
            </div>
          </summary>
          <div className="mt-5">

          <form className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Search
                </span>
                <input
                  type="text"
                  name="city"
                  defaultValue={cityFilter}
                  placeholder="City slug or candidate title"
                  className={filterInputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Review status
                </span>
                <select name="status" defaultValue={statusFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Candidate type
                </span>
                <select name="type" defaultValue={typeFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All types</option>
                  <option value="NEW_STATION">New station</option>
                  <option value="REMOVED_STATION">Removed station</option>
                  <option value="UPDATED_STATION">Updated station</option>
                  <option value="NEW_LINE">New line</option>
                  <option value="LINE_RENAME_CANDIDATE">Line rename</option>
                  <option value="LINE_COLOR_CANDIDATE">Line color update</option>
                  <option value="IMAGE_CANDIDATE">Image candidate</option>
                  <option value="METADATA_CANDIDATE">Metadata candidate</option>
                  <option value="OPERATOR_METADATA_CANDIDATE">Operator metadata</option>
                  <option value="OPERATOR_SUGGESTION">Operator suggestion</option>
                  <option value="HEADER_SUGGESTION">Header suggestion</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Min verifier score
                </span>
                <input
                  type="number"
                  name="confidenceMin"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={confidenceMinInput}
                  placeholder="Percent"
                  className={filterInputClass}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Lane
                </span>
                <select name="lane" defaultValue={laneFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All lanes</option>
                  <option value="GREEN">Ready to auto-apply</option>
                  <option value="YELLOW">Needs review</option>
                  <option value="RED">Blocked</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Research state
                </span>
                <select
                  name="researchState"
                  defaultValue={researchStateFilter || 'ALL'}
                  className={filterInputClass}
                >
                  <option value="ALL">All research states</option>
                  <option value="PENDING">Pending research</option>
                  <option value="SATISFIED">Satisfied</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="EXHAUSTED">Exhausted</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Auto-apply
                </span>
                <select name="autoApply" defaultValue={autoApplyFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All auto-apply states</option>
                  <option value="ONLY">Auto-apply only</option>
                  <option value="EXCLUDE">Review-only</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Apply state
                </span>
                <select name="apply" defaultValue={applyFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All apply states</option>
                  <option value="UNAPPLIED">Not applied</option>
                  <option value="APPLIED">Applied</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Stop reason
                </span>
                <input
                  type="text"
                  name="stopReason"
                  defaultValue={stopReasonFilter}
                  placeholder="e.g. insufficient_official_evidence"
                  className={filterInputClass}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Line likelihood
                </span>
                <select name="lineReality" defaultValue={lineRealityFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All line-likelihood</option>
                  <option value="ONLY">Likely real lines</option>
                  <option value="EXCLUDE">Exclude likely real lines</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Conflict state
                </span>
                <select name="conflicts" defaultValue={conflictFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All conflict states</option>
                  <option value="ONLY">Conflicting candidates</option>
                  <option value="EXCLUDE">Exclude conflicts</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Trust gate
                </span>
                <select name="trustBlocked" defaultValue={trustBlockedFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All trust states</option>
                  <option value="ONLY">Blocked by trust checks</option>
                  <option value="EXCLUDE">Exclude trust-blocked</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Source cohort
                </span>
                <select name="bootstrap" defaultValue={bootstrapFilter || 'ALL'} className={filterInputClass}>
                  <option value="ALL">All sources</option>
                  <option value="ONLY">First-time imports only</option>
                  <option value="EXCLUDE">Exclude first-time imports</option>
                </select>
              </label>
            </div>

            <div className={`${mutedPanelClass} flex flex-col gap-3 border-dashed sm:flex-row sm:items-center sm:justify-between`}>
              <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Use filters to isolate claims that are safe to approve, claims that need manual review, or claims that stopped because the autonomous worker hit a hard boundary.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                >
                  Apply filters
                </button>
                <Link
                  href="/admin/automation"
                  className="rounded-2xl border border-zinc-200/80 bg-white/80 px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:text-zinc-950 dark:border-white/10 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
                >
                  Reset
                </Link>
              </div>
            </div>
          </form>
          </div>
          </details>
        </section>

      <section className={`${shellPanelClass} mb-8 p-6`}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            Trust and quality
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            What the system is learning
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            These scores help the automation get stricter where it has been wrong in
            the past. Lower trust means future suggestions are more likely to stay in
            manual review instead of being auto-applied.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className={nestedPanelClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Low-trust domains
            </p>
            <div className="space-y-3 text-sm">
              {auditOverview.domains.length ? (
                auditOverview.domains.map((metric) => (
                  <div key={metric.key} className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {metric.key}
                      </span>
                      {metric.blocked ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          blocked
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Trust {percentFormatter.format((metric.trustScore || 0) * 100)}%
                      {' · '}
                      reviewed {metric.reviewedCount}
                    </p>
                    {metric.notes ? (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        {metric.notes}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <TrustOverrideForm
                        kind="domain"
                        itemKey={metric.key}
                        title="Domain override"
                        currentTrustScore={metric.trustScore}
                        currentManualTrustScore={metric.manualTrustScore}
                        currentBlocked={metric.blocked}
                        currentManualBlocked={metric.manualBlocked}
                        currentOverrideReason={metric.overrideReason}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">No domain metrics yet.</p>
              )}
            </div>
          </div>

          <div className={nestedPanelClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Low-trust cities
            </p>
            <div className="space-y-3 text-sm">
              {auditOverview.cities.length ? (
                auditOverview.cities.map((metric) => (
                  <div key={metric.key} className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{metric.key}</div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Trust {percentFormatter.format((metric.trustScore || 0) * 100)}%
                      {' · '}
                      revert {percentFormatter.format((metric.revertRate || 0) * 100)}%
                    </p>
                    <div className="mt-3">
                      <TrustOverrideForm
                        kind="city"
                        itemKey={metric.key}
                        title="City override"
                        currentTrustScore={metric.trustScore}
                        currentManualTrustScore={metric.manualTrustScore}
                        currentForcedLane={metric.forcedLane}
                        currentOverrideReason={metric.overrideReason}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">No city metrics yet.</p>
              )}
            </div>
          </div>

          <div className={nestedPanelClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Low-trust change types
            </p>
            <div className="space-y-3 text-sm">
              {auditOverview.claimTypes.length ? (
                auditOverview.claimTypes.map((metric) => (
                  <div key={metric.key} className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {metric.key.toLowerCase().replaceAll('_', ' ')}
                    </div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Trust {percentFormatter.format((metric.trustScore || 0) * 100)}%
                      {' · '}
                      rejected {percentFormatter.format((metric.rejectionRate || 0) * 100)}%
                    </p>
                    <div className="mt-3">
                      <TrustOverrideForm
                        kind="claimType"
                        itemKey={metric.key}
                        title="Claim type override"
                        currentTrustScore={metric.trustScore}
                        currentManualTrustScore={metric.manualTrustScore}
                        currentForcedLane={metric.forcedLane}
                        currentOverrideReason={metric.overrideReason}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">No claim-type metrics yet.</p>
              )}
            </div>
          </div>

          <div className={nestedPanelClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Currently blocked domains
            </p>
            <div className="space-y-3 text-sm">
              {auditOverview.blockedDomains.length ? (
                auditOverview.blockedDomains.map((domain) => (
                  <div key={domain.id} className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{domain.domain}</div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Trust {percentFormatter.format((domain.trustScore || 0) * 100)}%
                    </p>
                    {domain.overrideReason ? (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        Override: {domain.overrideReason}
                      </p>
                    ) : null}
                    {domain.notes ? (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{domain.notes}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">No blocked domains.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
              Follow-up success
            </p>
            <p className="mt-2 text-3xl font-semibold text-sky-950 dark:text-sky-50">
              {percentFormatter.format(
                (auditOverview.research.summary.followUpSuccessRate || 0) * 100,
              )}
              %
            </p>
            <p className="mt-2 text-sm text-sky-900 dark:text-sky-100">
              {auditOverview.research.summary.completedRunCount} completed of{' '}
              {auditOverview.research.summary.finalRunCount} finished research runs.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
              Queue pressure
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-950 dark:text-amber-50">
              {auditOverview.research.summary.pendingRunCount}
            </p>
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
              Pending or running follow-up research runs across{' '}
              {auditOverview.research.summary.runCount} total recorded runs.
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">
              Wasteful domains
            </p>
            <div className="mt-3 space-y-2 text-sm text-rose-900 dark:text-rose-100">
              {auditOverview.research.wastefulDomains.length ? (
                auditOverview.research.wastefulDomains.map((domain) => (
                  <div key={domain.domain}>
                    {domain.domain} ({domain.count})
                  </div>
                ))
              ) : (
                <p>No repeat retry waste yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              Stubborn claim types
            </p>
            <div className="mt-3 space-y-2 text-sm text-violet-900 dark:text-violet-100">
              {auditOverview.research.stubbornClaimTypes.length ? (
                auditOverview.research.stubbornClaimTypes.map((item) => (
                  <div key={item.claimType}>
                    {formatCandidateTypeLabel(item.claimType)} ({item.count})
                  </div>
                ))
              ) : (
                <p>No stubborn claim-type pattern yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className={nestedPanelClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Best research task types
            </p>
            <div className="space-y-3 text-sm">
              {auditOverview.research.taskTypes.length ? (
                auditOverview.research.taskTypes.map((task) => (
                  <div
                    key={task.taskType}
                    className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCandidateTypeLabel(task.taskType)}
                    </div>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      Resolved {task.resolved}/{task.total} (
                      {percentFormatter.format(task.resolutionRate * 100)}%)
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-zinc-600 dark:text-zinc-400">
                  No research task outcomes recorded yet.
                </p>
              )}
            </div>
          </div>

          <div className={nestedPanelClass}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Research audit summary
            </p>
            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <p>Total research runs: {auditOverview.research.summary.runCount}</p>
              <p>Finished research runs: {auditOverview.research.summary.finalRunCount}</p>
              <p>Completed follow-ups: {auditOverview.research.summary.completedRunCount}</p>
              <p>Pending follow-ups: {auditOverview.research.summary.pendingRunCount}</p>
              <p>
                Follow-up success rate:{' '}
                {percentFormatter.format(
                  (auditOverview.research.summary.followUpSuccessRate || 0) * 100,
                )}
                %
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${shellPanelClass} mb-8 p-6`}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            Trends
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Historical analytics
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 dark:text-zinc-400">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Cities changed</th>
                <th className="px-3 py-2">Auto-applied</th>
                <th className="px-3 py-2">Needed review</th>
                <th className="px-3 py-2">Approval rate</th>
                <th className="px-3 py-2">Revert rate</th>
                <th className="px-3 py-2">Auto-apply success</th>
                <th className="px-3 py-2">Research runs</th>
                <th className="px-3 py-2">Research pending</th>
                <th className="px-3 py-2">Follow-up success</th>
                <th className="px-3 py-2">Best task resolution</th>
                <th className="px-3 py-2">Research waste</th>
                <th className="px-3 py-2">Stubborn types</th>
                <th className="px-3 py-2">Claim-type precision</th>
                <th className="px-3 py-2">Worsening domains</th>
                <th className="px-3 py-2">Noisy cities</th>
                <th className="px-3 py-2">Noisy change types</th>
                <th className="px-3 py-2">Revert causes</th>
              </tr>
            </thead>
            <tbody>
              {analyticsOverview.map((month) => (
                <tr key={month.month} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{month.month}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{month.createdCount}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{month.changedCityCount}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{month.autoAppliedCount}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{month.reviewRequiredCount}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {percentFormatter.format(month.approvalRate * 100)}%
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {percentFormatter.format(month.revertRate * 100)}%
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {percentFormatter.format(month.greenLaneSuccessRate * 100)}%
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.researchRunCount}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.researchPendingCount}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {percentFormatter.format(month.followUpSuccessRate * 100)}%
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.researchTaskResolution.length
                      ? month.researchTaskResolution.join(', ')
                      : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.researchWasteDomains.length
                      ? month.researchWasteDomains.join(', ')
                      : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.stubbornClaimTypes.length
                      ? month.stubbornClaimTypes
                          .map((value) => value.toLowerCase().replaceAll('_', ' '))
                          .join(', ')
                      : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.claimTypePrecision.length
                      ? month.claimTypePrecision.join(', ')
                      : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.worseningDomains.length ? month.worseningDomains.join(', ') : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.falsePositiveCities.length
                      ? month.falsePositiveCities.join(', ')
                      : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.falsePositiveClaimTypes.length
                      ? month.falsePositiveClaimTypes
                          .map((value) => value.toLowerCase().replaceAll('_', ' '))
                          .join(', ')
                      : 'None'}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                    {month.revertCauses.length ? month.revertCauses.join(', ') : 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${shellPanelClass} mb-8 p-6`}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
            Replay calibration
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Recent eval runs
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Replay evals measure whether policy changes actually reduce bad green-lane decisions and unsafe auto-apply cases.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {evalRuns.length ? (
            evalRuns.map((evalRun) => {
              const baseline = getBaselineEvalSummary(evalRun)
              const diff =
                getEvalSummary(evalRun)?.diff && typeof getEvalSummary(evalRun)?.diff === 'object'
                  ? (getEvalSummary(evalRun)?.diff as Record<string, any>)
                  : null
              return (
                <div key={evalRun.id} className={nestedPanelClass}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{evalRun.label}</div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {dateTimeFormatter.format(evalRun.createdAt)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    <p>
                      False positives:{' '}
                      {percentFormatter.format(Number(baseline?.falsePositiveRate || 0) * 100)}%
                    </p>
                    <p>
                      Auto-apply false positives:{' '}
                      {percentFormatter.format(
                        Number(baseline?.autoApplyFalsePositiveRate || 0) * 100,
                      )}
                      %
                    </p>
                    <p>
                      Blocked:{' '}
                      {percentFormatter.format(Number(baseline?.blockedRate || 0) * 100)}%
                      {' · '}
                      Exhausted:{' '}
                      {percentFormatter.format(Number(baseline?.exhaustedRate || 0) * 100)}%
                    </p>
                    <p>
                      Exact match:{' '}
                      {percentFormatter.format(Number(baseline?.exactMatchRate || 0) * 100)}%
                    </p>
                    {diff ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Candidate delta: FP {Number(diff.falsePositiveRateDelta || 0) > 0 ? '+' : ''}
                        {Number(diff.falsePositiveRateDelta || 0)} / auto-apply FP{' '}
                        {Number(diff.autoApplyFalsePositiveRateDelta || 0) > 0 ? '+' : ''}
                        {Number(diff.autoApplyFalsePositiveRateDelta || 0)}
                      </p>
                    ) : null}
                  </div>
                  {Array.isArray(baseline?.stopReasonBreakdown) &&
                  baseline?.stopReasonBreakdown.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {baseline.stopReasonBreakdown.slice(0, 3).map((entry) => (
                        <span
                          key={`${evalRun.id}-${String(entry.stopReason)}`}
                          className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {formatStopReason(String(entry.stopReason))} ({Number(entry.count || 0)})
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              No replay eval runs have been persisted yet.
            </p>
          )}
        </div>
      </section>

      {!runs.length ? (
        <div className={`${shellPanelClass} p-10 text-center`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <svg className="h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No automation runs yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Once the monthly sync writes review candidates into the database, they will appear here. You can also trigger a manual run from the research console above.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {runs.map((run) => {
            const counts = getRunCounts(run)
            const citySummaries = buildCityQueueSummaries(run)
            const stationUpdateSetCounts = new Map<string, number>()
            run.candidates.forEach((candidate) => {
              const key = getStationUpdateSetKey(candidate)
              if (!key) return
              stationUpdateSetCounts.set(key, (stationUpdateSetCounts.get(key) || 0) + 1)
            })

            return (
              <section
                key={run.id}
                className={`${shellPanelClass} p-6`}
              >
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`${badgeClass} bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300`}>
                        {run.scope || 'all'}
                      </span>
                      <span className={`${badgeClass} ${getRunStatusClasses(String(run.status))}`}>
                        {String(run.status).toLowerCase().replaceAll('_', ' ')}
                      </span>
                    </div>
                    <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                      {run.source === 'metro-sync' ? 'Monthly sync run' : `${run.source} run`}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Started {dateTimeFormatter.format(run.startedAt)}
                      {run.finishedAt
                        ? `, finished ${dateTimeFormatter.format(run.finishedAt)}`
                        : ''}
                    </p>
                    {run.appliedAt ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Applied {dateTimeFormatter.format(run.appliedAt)}
                        {run.appliedBy ? ` by ${run.appliedBy}` : ''}
                      </p>
                    ) : null}
                    {run.pullRequestUrl ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Apply PR:{' '}
                        <Link
                          href={run.pullRequestUrl}
                          target="_blank"
                          className="text-sky-300 transition hover:text-sky-200"
                        >
                          #{run.pullRequestNumber || 'open'}
                        </Link>
                      </p>
                    ) : null}
                    {run.revertPullRequestUrl ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Revert PR:{' '}
                        <Link
                          href={run.revertPullRequestUrl}
                          target="_blank"
                          className="text-rose-300 transition hover:text-rose-200"
                        >
                          #{run.revertPullRequestNumber || 'open'}
                        </Link>
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="grid min-w-[260px] grid-cols-2 gap-3 text-sm">
                      <div className={nestedPanelClass}>
                        <div className="text-zinc-500 dark:text-zinc-400">Total</div>
                        <div className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                          {counts.total}
                        </div>
                      </div>
                      <div className={nestedPanelClass}>
                        <div className="text-zinc-500 dark:text-zinc-400">Pending</div>
                        <div className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-300">
                          {counts.PENDING}
                        </div>
                      </div>
                      <div className={nestedPanelClass}>
                        <div className="text-zinc-500 dark:text-zinc-400">Approved</div>
                        <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
                          {counts.APPROVED}
                        </div>
                      </div>
                      <div className={nestedPanelClass}>
                        <div className="text-zinc-500 dark:text-zinc-400">Rejected</div>
                        <div className="mt-1 text-2xl font-semibold text-rose-600 dark:text-rose-300">
                          {counts.REJECTED}
                        </div>
                      </div>
                    </div>
                    <div className={nestedPanelClass}>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-zinc-500 dark:text-zinc-400">Applied</div>
                          <div className="mt-1 text-2xl font-semibold text-sky-600 dark:text-sky-300">
                            {counts.applied}
                          </div>
                        </div>
                        <ApplyRunButton
                          runId={run.id}
                          approvedCount={counts.APPROVED}
                          pendingApplyCount={counts.APPROVED - counts.applied}
                          workflowStatus={applyWorkflowStatuses[run.id] || null}
                        />
                      </div>
                      <RevertRunButton
                        runId={run.id}
                        disabled={!run.commitSha || Boolean(run.revertedAt)}
                      />
                    </div>
                  </div>
                </div>

                {run.reportMarkdown ? (
                  <details className={`mb-6 ${mutedPanelClass}`}>
                    <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      View generated report
                    </summary>
                    <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-zinc-600 dark:text-zinc-300">
                      {run.reportMarkdown}
                    </pre>
                  </details>
                ) : null}

                <div className="mb-6">
                  <BulkReviewActions
                    runId={run.id}
                    candidates={run.candidates.map((candidate) => ({
                      id: candidate.id,
                      title: candidate.title,
                      status: candidate.status,
                      appliedAt: candidate.appliedAt?.toISOString() || null,
                      likelyRealTransitLine: isLikelyRealTransitLine(candidate),
                      hasConflict: hasConflictingEvidence(candidate),
                      trustBlocked: isBlockedByTrustPolicy(candidate),
                      clusterSize: getClusterSize(candidate),
                    }))}
                  />
                </div>

                {citySummaries.length ? (
                  <div className={`mb-6 ${mutedPanelClass}`}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      Queue by city
                    </p>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {citySummaries.map((summary) => (
                        <div
                          key={summary.citySlug}
                          className={nestedPanelClass}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {summary.citySlug}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {summary.stationUpdateSetCount} station update set
                                {summary.stationUpdateSetCount === 1 ? '' : 's'}
                              </div>
                            </div>
                            <span className={`${badgeClass} bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300`}>
                              {summary.pending} pending
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                            <span>{summary.total} total</span>
                            <span>{summary.approved} approved</span>
                            <span>{summary.rejected} rejected</span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <QuickBulkReviewButton
                              candidateIds={summary.safePendingIds}
                              status="APPROVED"
                              note={`Bulk-approved safe pending candidates for ${summary.citySlug}.`}
                              label={`Approve safe (${summary.safePendingIds.length})`}
                              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <QuickBulkReviewButton
                              candidateIds={summary.trustBlockedIds}
                              status="REJECTED"
                              note={`Bulk-rejected trust-blocked candidates for ${summary.citySlug}.`}
                              label={`Reject blocked (${summary.trustBlockedIds.length})`}
                              className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-rose-950 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {sourceSuggestionsByRun.get(run.id)?.length ? (
                  <div className={`mb-6 ${mutedPanelClass}`}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      Suggested source hints
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {sourceSuggestionsByRun
                        .get(run.id)
                        ?.slice(0, 12)
                        .map((suggestion, index) => (
                          <div
                            key={`${suggestion.city}|${suggestion.sourceKey}|${suggestion.url}|${index}`}
                            className={`${nestedPanelClass} text-sm`}
                          >
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {suggestion.city}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                              {suggestion.sourceKey}
                            </div>
                            <Link
                              href={suggestion.url}
                              target="_blank"
                              className="mt-2 inline-flex break-all text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
                            >
                              {suggestion.url}
                            </Link>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  {run.candidates.map((candidate) => (
                    (() => {
                      const latestVerification = getLatestVerification(candidate)
                      const latestPolicyDecision = getLatestPolicyDecision(candidate)
                      const overallScore = getVerificationOverallScore(candidate)
                      const lane = candidate.claim?.lane || null
                      const headlineReasons = getCandidateHeadlineReason(candidate)
                      const diffSummary = getCandidateDiffSummary(candidate)
                      const missingEvidence = getMissingEvidence(candidate)
                      const nextBestAction = getNextBestAction(candidate)
                      const aiFollowUpRecommended = isAiFollowUpRecommended(candidate)
                      const latestResearchRun = getLatestResearchRun(candidate)
                      const followUpStatus = getFollowUpStatus(candidate)
                      const waitingOnAiFollowUp = isWaitingOnAiFollowUp(candidate)
                      const claimResearchState = getClaimResearchState(candidate)
                      const claimProvenance = getClaimProvenanceEntries(candidate)
                      const stationUpdateSetKey = getStationUpdateSetKey(candidate)
                      const stationUpdateSetLabel = getStationUpdateSetLabel(candidate)
                      const sourcePolicy =
                        candidate.metadata &&
                        typeof candidate.metadata === 'object' &&
                        'sourcePolicy' in candidate.metadata &&
                        candidate.metadata.sourcePolicy &&
                        typeof candidate.metadata.sourcePolicy === 'object'
                          ? (candidate.metadata.sourcePolicy as ImageSourcePolicyMetadata)
                          : null
                      const duplicateTitles =
                        candidate.metadata &&
                        typeof candidate.metadata === 'object' &&
                        'duplicateTitles' in candidate.metadata &&
                        Array.isArray(candidate.metadata.duplicateTitles)
                          ? candidate.metadata.duplicateTitles.map((value) => String(value))
                          : []

                      return (
                        <article
                          key={candidate.id}
                          className={`${nestedPanelClass} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
                        >
                      <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`${badgeClass} bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
                              {candidate.citySlug}
                            </span>
                            <span className={`${badgeClass} bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300`}>
                              {formatCandidateTypeLabel(String(candidate.type))}
                            </span>
                            <span className={`${badgeClass} ${getDecisionStatusClasses(candidate.status)}`}>
                              {String(candidate.status).toLowerCase()}
                            </span>
                            {lane ? (
                              <span
                                className={`${badgeClass} ${getLaneClasses(
                                  lane,
                                )}`}
                              >
                                {getLaneLabel(lane)}
                              </span>
                            ) : null}
                            {candidate.claim?.autoApplyEligible ? (
                              <span className={`${badgeClass} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300`}>
                                can auto-apply
                              </span>
                            ) : null}
                            {aiFollowUpRecommended || waitingOnAiFollowUp ? (
                              <span className={`${badgeClass} bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300`}>
                                ai follow-up recommended
                              </span>
                            ) : null}
                            {followUpStatus ? (
                              <span className={`${badgeClass} bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
                                follow-up {String(followUpStatus).toLowerCase().replaceAll('_', ' ')}
                              </span>
                            ) : null}
                            {claimResearchState?.status ? (
                              <span className={`${badgeClass} ${getResearchStateClasses(claimResearchState.status)}`}>
                                claim state {String(claimResearchState.status).toLowerCase().replaceAll('_', ' ')}
                              </span>
                            ) : null}
                            {getClusterSize(candidate) > 1 ? (
                              <span className={`${badgeClass} bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300`}>
                                grouped {getClusterSize(candidate)}
                              </span>
                            ) : null}
                            {candidate.metadata &&
                            typeof candidate.metadata === 'object' &&
                            'bootstrapKind' in candidate.metadata &&
                            String(candidate.metadata.bootstrapKind) ===
                              'initial-registry-bootstrap' ? (
                              <span className={`${badgeClass} bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300`}>
                                first-time import
                              </span>
                            ) : null}
                          </div>
                          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                            {candidate.title}
                          </h3>
                          {candidate.summary ? (
                            <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                              {candidate.summary}
                            </p>
                          ) : null}
                          {diffSummary ? (
                            <p className="max-w-3xl text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                              {diffSummary}
                            </p>
                          ) : null}
                          {headlineReasons.length ? (
                            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                                Why this was suggested
                              </div>
                              <ul className="mt-2 space-y-1">
                                {headlineReasons.map((reason) => (
                                  <li key={reason}>• {reason}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                            {candidate.entityKey ? (
                              <span>Match key: {candidate.entityKey}</span>
                            ) : null}
                            {stationUpdateSetKey && stationUpdateSetLabel ? (
                              <span>
                                {stationUpdateSetLabel}: {stationUpdateSetCounts.get(stationUpdateSetKey) || 1} change
                                {(stationUpdateSetCounts.get(stationUpdateSetKey) || 1) === 1 ? '' : 's'}
                              </span>
                            ) : null}
                            {typeof candidate.confidence === 'number' ? (
                              <span>
                                Suggestion confidence: {Math.round(candidate.confidence * 100)}%
                              </span>
                            ) : null}
                            {overallScore !== null ? (
                              <span>Review score: {Math.round(overallScore * 100)}%</span>
                            ) : null}
                            {typeof latestVerification?.evidenceCount === 'number' ? (
                              <span>Sources checked: {latestVerification.evidenceCount}</span>
                            ) : null}
                            {candidate.reviewedAt ? (
                              <span>
                                Reviewed {dateTimeFormatter.format(candidate.reviewedAt)}
                              </span>
                            ) : null}
                            {candidate.appliedAt ? (
                              <span>
                                Applied {dateTimeFormatter.format(candidate.appliedAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="w-full xl:justify-self-end">
                          {waitingOnAiFollowUp ? (
                            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                                AI follow-up running
                              </div>
                              <p className="mt-2">
                                Review actions unlock after the autonomous follow-up pass finishes or exhausts its retry budget.
                              </p>
                              {nextBestAction ? <p className="mt-2">Next action: {nextBestAction}</p> : null}
                            </div>
                          ) : (
                            <div className="space-y-3 rounded-[1.25rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950/70">
                              <CandidateReviewActions
                                candidateId={candidate.id}
                                currentStatus={candidate.status}
                                currentNote={candidate.reviewNote}
                              />
                              {(aiFollowUpRecommended || latestResearchRun) ? (
                                <ResearchFollowUpActions
                                  claimId={candidate.claim?.id || ''}
                                  latestTaskId={getLatestResearchTaskId(candidate)}
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      <details className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                        <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          View raw data
                        </summary>
                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Current data
                            </p>
                            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-zinc-700 dark:text-zinc-300">
                              {candidate.beforeValue
                                ? JSON.stringify(candidate.beforeValue, null, 2)
                                : 'No current value recorded.'}
                            </pre>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Proposed data
                            </p>
                            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-zinc-700 dark:text-zinc-300">
                              {candidate.afterValue
                                ? JSON.stringify(candidate.afterValue, null, 2)
                                : 'No proposed value recorded.'}
                            </pre>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Change details
                            </p>
                            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-zinc-700 dark:text-zinc-300">
                              {candidate.diff
                                ? JSON.stringify(candidate.diff, null, 2)
                                : 'No change payload recorded.'}
                            </pre>
                          </div>
                        </div>
                      </details>

                      {candidate.claim ? (
                        <div className="mt-4 grid gap-4 lg:grid-cols-4">
                          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Quality checks
                            </p>
                            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                              <p>
                                Source quality: {Math.round((latestVerification?.sourceTierScore || 0) * 100)}%
                              </p>
                              <p>
                                Freshness: {Math.round((latestVerification?.recencyScore || 0) * 100)}%
                              </p>
                              <p>
                                Agreement: {Math.round((latestVerification?.consistencyScore || 0) * 100)}%
                              </p>
                              <p>
                                Contradictions found:{' '}
                                {latestVerification?.contradictionFlag ? 'yes' : 'no'}
                              </p>
                              <p>
                                Looks like a real transit line:{' '}
                                {isLikelyRealTransitLine(candidate) ? 'yes' : 'no'}
                              </p>
                              <p>
                                Source conflict:{' '}
                                {hasConflictingEvidence(candidate) ? 'yes' : 'no'}
                              </p>
                              <p>
                                Blocked by trust checks:{' '}
                                {isBlockedByTrustPolicy(candidate) ? 'yes' : 'no'}
                              </p>
                              <p>
                                Group size: {Math.max(getClusterSize(candidate), 1)}
                              </p>
                              {candidate.metadata &&
                              typeof candidate.metadata === 'object' &&
                              'closureConfidence' in candidate.metadata &&
                              typeof candidate.metadata.closureConfidence === 'number' ? (
                                <p>
                                  Closure confidence:{' '}
                                  {Math.round(candidate.metadata.closureConfidence * 100)}%
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Review outcome
                            </p>
                            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                              <p>
                                Status:{' '}
                                <span className="font-medium">
                                  {getLaneLabel(candidate.claim.lane)}
                                </span>
                              </p>
                              <p>
                                Auto-apply:{' '}
                                {candidate.claim.autoApplyEligible ? 'allowed' : 'review only'}
                              </p>
                              {candidate.claim.lane === AutomationLane.GREEN &&
                              !candidate.claim.autoApplyEligible ? (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  Green lane is still held back from auto-apply because the stronger safety gate was not met.
                                </p>
                              ) : null}
                              <p>
                                Claim state:{' '}
                                {String(candidate.claim.status).toLowerCase().replaceAll('_', ' ')}
                              </p>
                              <p className="text-zinc-600 dark:text-zinc-400">
                                {latestPolicyDecision?.decisionReason ||
                                  candidate.claim.reason ||
                                  'No policy note recorded.'}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Claim research state
                            </p>
                            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                              <p>
                                Status:{' '}
                                {claimResearchState?.status
                                  ? String(claimResearchState.status).toLowerCase().replaceAll('_', ' ')
                                  : aiFollowUpRecommended
                                    ? 'pending'
                                    : 'not queued'}
                              </p>
                              <p>
                                Recommended: {aiFollowUpRecommended ? 'yes' : 'no'}
                              </p>
                              <p>
                                Next task:{' '}
                                {claimResearchState?.nextTask?.taskType
                                  ? String(claimResearchState.nextTask.taskType)
                                      .toLowerCase()
                                      .replaceAll('_', ' ')
                                  : 'No bounded task recorded.'}
                              </p>
                              <p>
                                Next action:{' '}
                                {claimResearchState?.evidence?.nextBestAction ||
                                  nextBestAction ||
                                  'No follow-up action recorded.'}
                              </p>
                              {claimResearchState?.statusReason ? (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  {claimResearchState.statusReason}
                                </p>
                              ) : null}
                              {claimResearchState ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
                                  <div>
                                    Attempts {claimResearchState.runAttemptCount}/
                                    {claimResearchState.maxResearchRunAttempts}
                                  </div>
                                  <div>
                                    Tasks pending {claimResearchState.pendingTaskCount} · satisfied{' '}
                                    {claimResearchState.satisfiedTaskCount} · blocked{' '}
                                    {claimResearchState.blockedTaskCount} · exhausted{' '}
                                    {claimResearchState.exhaustedTaskCount}
                                  </div>
                                  <div>
                                    Official evidence {claimResearchState.evidence.officialEvidenceCount}
                                    {' · '}GTFS {claimResearchState.evidence.gtfsEvidenceCount}
                                  </div>
                                  <div>
                                    Contradiction {Math.round(
                                      claimResearchState.evidence.contradictionScore * 100,
                                    )}
                                    %
                                  </div>
                                </div>
                              ) : null}
                              {claimResearchState?.stopReasons?.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {claimResearchState.stopReasons.map((reason) => (
                                    <span
                                      key={reason}
                                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                    >
                                      {formatStopReason(String(reason))}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {latestResearchRun?.tasks?.length ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
                                  {latestResearchRun.tasks.slice(0, 4).map((task) => (
                                    <div key={task.id} className="mb-1 last:mb-0">
                                      {String(task.taskType).toLowerCase().replaceAll('_', ' ')}:{' '}
                                      {String(task.status).toLowerCase().replaceAll('_', ' ')}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Evidence still missing
                            </p>
                            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                              {missingEvidence.length ? (
                                missingEvidence.slice(0, 5).map((reason) => (
                                  <p key={reason}>{reason}</p>
                                ))
                              ) : (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  No missing-evidence list recorded.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Supporting files
                            </p>
                            <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                              {candidate.claim.artifactLinks.length ? (
                                candidate.claim.artifactLinks.slice(0, 5).map((link) => (
                                  <div
                                    key={link.id}
                                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                                  >
                                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {String(link.artifact.artifactType)
                                      .toLowerCase()
                                      .replaceAll('_', ' ')}
                                  </div>
                                    {link.artifact.sourceDomain ? (
                                      <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                        {link.artifact.sourceDomain}
                                      </div>
                                    ) : null}
                                    {link.artifact.sourceUrl ? (
                                      <Link
                                        href={link.artifact.sourceUrl}
                                        target="_blank"
                                        className="mt-1 inline-flex text-sky-300 transition hover:text-sky-200"
                                      >
                                        {link.artifact.sourceUrl}
                                      </Link>
                                    ) : link.artifact.localPath ? (
                                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                        {link.artifact.localPath}
                                      </div>
                                    ) : null}
                                  </div>
                                ))
                              ) : (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  No linked artifacts recorded.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70 lg:col-span-2">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                              Citation provenance
                            </p>
                            <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
                              {claimProvenance.length ? (
                                claimProvenance.slice(0, 8).map((citation) => (
                                  <div
                                    key={citation.id}
                                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                                  >
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                        {formatCitationLocator({
                                          locatorType: String(citation.locatorType),
                                          pageNumber: citation.pageNumber,
                                          domSelector: citation.domSelector,
                                        })}
                                      </span>
                                      {citation.artifact ? (
                                        <span>
                                          {String(citation.artifact.artifactType)
                                            .toLowerCase()
                                            .replaceAll('_', ' ')}
                                        </span>
                                      ) : null}
                                      {citation.researchTask ? (
                                        <span>
                                          via {String(citation.researchTask.taskType).toLowerCase().replaceAll('_', ' ')}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-zinc-900 dark:text-zinc-100">
                                      “{citation.excerpt}”
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                      {citation.sourceUrl ? (
                                        <Link
                                          href={citation.sourceUrl}
                                          target="_blank"
                                          className="text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
                                        >
                                          {citation.sourceUrl}
                                        </Link>
                                      ) : null}
                                      {citation.artifact?.sourceDomain ? (
                                        <span>{citation.artifact.sourceDomain}</span>
                                      ) : null}
                                      {typeof citation.startOffset === 'number' &&
                                      typeof citation.endOffset === 'number' ? (
                                        <span>
                                          chars {citation.startOffset}-{citation.endOffset}
                                        </span>
                                      ) : null}
                                      {typeof citation.ocrConfidence === 'number' ? (
                                        <span>
                                          OCR {Math.round(citation.ocrConfidence * 100)}%
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  No excerpt-level citations recorded yet.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {latestResearchRun?.tasks?.length ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            Research lineage
                          </p>
                          <div className="space-y-3">
                            {latestResearchRun.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {String(task.taskType).toLowerCase().replaceAll('_', ' ')}
                                  </span>
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                    {String(task.status).toLowerCase().replaceAll('_', ' ')}
                                  </span>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                                    retry {task.retryCount}
                                  </span>
                                </div>
                                {task.nextAttemptAt ? (
                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                    Next attempt {dateTimeFormatter.format(task.nextAttemptAt)}
                                  </p>
                                ) : null}
                                {task.blockedReason ? (
                                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                    {task.blockedReason}
                                  </p>
                                ) : null}
                                {task.artifactLinks.length ? (
                                  <div className="mt-3 space-y-2">
                                    {task.artifactLinks.map((link) => (
                                      <div
                                        key={link.id}
                                        className="rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/70"
                                      >
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                          {String(link.artifact.artifactType)
                                            .toLowerCase()
                                            .replaceAll('_', ' ')}
                                        </div>
                                        {link.artifact.sourceUrl ? (
                                          <Link
                                            href={link.artifact.sourceUrl}
                                            target="_blank"
                                            className="mt-1 inline-flex text-sky-300 transition hover:text-sky-200"
                                          >
                                            {link.artifact.sourceUrl}
                                          </Link>
                                        ) : null}
                                        {link.artifact.sourceDomain ? (
                                          <div className="mt-2">
                                            <TrustOverrideForm
                                              kind="domain"
                                              itemKey={link.artifact.sourceDomain}
                                              title={`Domain override: ${link.artifact.sourceDomain}`}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {task.citations.length ? (
                                  <div className="mt-3 space-y-2">
                                    {task.citations.slice(0, 4).map((citation) => (
                                      <div
                                        key={citation.id}
                                        className="rounded-lg border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/70"
                                      >
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                          {formatCitationLocator({
                                            locatorType: String(citation.locatorType),
                                            pageNumber: citation.pageNumber,
                                            domSelector: citation.domSelector,
                                          })}
                                        </div>
                                        <p className="mt-1 leading-5 text-zinc-700 dark:text-zinc-300">
                                          “{citation.excerpt}”
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-500 dark:text-zinc-500">
                                          {citation.sourceUrl ? (
                                            <Link
                                              href={citation.sourceUrl}
                                              target="_blank"
                                              className="text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
                                            >
                                              {citation.sourceUrl}
                                            </Link>
                                          ) : null}
                                          {citation.artifact?.artifactType ? (
                                            <span>
                                              {String(citation.artifact.artifactType)
                                                .toLowerCase()
                                                .replaceAll('_', ' ')}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {candidate.afterValue &&
                      typeof candidate.afterValue === 'object' &&
                      ('stagedPublicPath' in candidate.afterValue ||
                        'iconCandidatePublicPath' in candidate.afterValue ||
                        'extractedColor' in candidate.afterValue ||
                        'color' in candidate.afterValue) ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            Visual review
                          </p>
                          <div className="grid gap-4 md:grid-cols-2">
                            {'stagedPublicPath' in candidate.afterValue &&
                            typeof candidate.afterValue.stagedPublicPath === 'string' ? (
                              <div>
                                <Image
                                  src={candidate.afterValue.stagedPublicPath}
                                  alt={candidate.title}
                                  width={960}
                                  height={540}
                                  unoptimized
                                  className="max-h-72 w-full rounded-xl border border-zinc-200 object-contain bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
                                />
                              </div>
                            ) : 'iconCandidatePublicPath' in candidate.afterValue &&
                              typeof candidate.afterValue.iconCandidatePublicPath === 'string' ? (
                              <div>
                                <Image
                                  src={candidate.afterValue.iconCandidatePublicPath}
                                  alt={candidate.title}
                                  width={960}
                                  height={540}
                                  unoptimized
                                  className="max-h-72 w-full rounded-xl border border-zinc-200 object-contain bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
                                />
                              </div>
                            ) : null}

                            <div className="space-y-3">
                              {'extractedColor' in candidate.afterValue &&
                              typeof candidate.afterValue.extractedColor === 'string' ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                    Extracted color
                                  </div>
                                  <div className="mt-2 flex items-center gap-3">
                                    <span
                                      className="h-8 w-8 rounded-full border border-zinc-700"
                                      style={{
                                        backgroundColor: candidate.afterValue.extractedColor,
                                      }}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                      {candidate.afterValue.extractedColor}
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                              {'color' in candidate.afterValue &&
                              typeof candidate.afterValue.color === 'string' ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                    Suggested line color
                                  </div>
                                  <div className="mt-2 flex items-center gap-3">
                                    <span
                                      className="h-8 w-8 rounded-full border border-zinc-700"
                                      style={{ backgroundColor: candidate.afterValue.color }}
                                    />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                      {candidate.afterValue.color}
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                              {sourcePolicy ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70">
                                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                    Image source check
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        sourcePolicy.status === 'PREFERRED'
                                          ? 'bg-emerald-950 text-emerald-300'
                                          : sourcePolicy.status === 'BLOCKED'
                                            ? 'bg-rose-950 text-rose-300'
                                            : 'bg-amber-950 text-amber-300'
                                      }`}
                                    >
                                      {String(sourcePolicy.status || 'unknown')
                                        .toLowerCase()
                                        .replaceAll('_', ' ')}
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      {sourcePolicy.hostname || 'unknown'}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    {sourcePolicy.reason || 'No source-check note recorded.'}
                                  </p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                    License {String(sourcePolicy.licenseStatus || 'unknown')
                                      .toLowerCase()
                                      .replaceAll('_', ' ')}
                                    {' · '}
                                    rules {sourcePolicy.policyVersion || 'legacy'}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {candidate.sources.length ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            Source links
                          </p>
                          <div className="space-y-3">
                            {candidate.sources.map((source) => (
                              <div
                                key={source.id}
                                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {source.label || source.sourceType}
                                  </span>
                                  <span className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                    {source.sourceType}
                                  </span>
                                </div>
                                {source.snippet ? (
                                  <p className="mt-2 leading-6 text-zinc-600 dark:text-zinc-400">
                                    {source.snippet}
                                  </p>
                                ) : null}
                                {source.url ? (
                                  <Link
                                    href={source.url}
                                    target="_blank"
                                    className="mt-2 inline-flex text-sky-300 transition hover:text-sky-200"
                                  >
                                    {source.url}
                                  </Link>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {candidate.decisions.length ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            Review history
                          </p>
                          <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {duplicateTitles.length > 0 ? (
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
                                  Grouped duplicates
                                </div>
                                <div className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-300">
                                  {duplicateTitles.slice(0, 5).map((title: string) => (
                                    <p key={title}>{title}</p>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {candidate.decisions.map((decision) => (
                              <div
                                key={decision.id}
                                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-zinc-900 dark:text-zinc-100">
                                  <span className="font-medium">
                                    {String(decision.status).toLowerCase()}
                                  </span>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                                    {dateTimeFormatter.format(decision.createdAt)}
                                  </span>
                                  {decision.reviewer ? (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                                      by {decision.reviewer}
                                    </span>
                                  ) : null}
                                </div>
                                {decision.note ? (
                                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{decision.note}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {candidate.applyNote ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            Apply status
                          </p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">{candidate.applyNote}</p>
                        </div>
                      ) : null}
                        </article>
                      )
                    })()
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

import { AutomationDecisionStatus } from '@prisma/client'

export type CandidateAuditSnapshot = {
  status: AutomationDecisionStatus
  reviewedAt: Date | null
  appliedAt: Date | null
  reverted: boolean
}

export type AuditCounters = {
  reviewedCount: number
  approvedCount: number
  rejectedCount: number
  appliedCount: number
  revertedCount: number
}

export type AuditMetricSnapshot = AuditCounters & {
  approvalRate: number
  rejectionRate: number
  revertRate: number
  trustScore: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export function buildAuditCounters(items: CandidateAuditSnapshot[]): AuditCounters {
  return items.reduce(
    (acc, item) => {
      const reviewed = item.reviewedAt !== null || item.status !== AutomationDecisionStatus.PENDING
      if (reviewed) {
        acc.reviewedCount += 1
      }
      if (item.status === AutomationDecisionStatus.APPROVED) {
        acc.approvedCount += 1
      }
      if (item.status === AutomationDecisionStatus.REJECTED) {
        acc.rejectedCount += 1
      }
      if (item.appliedAt) {
        acc.appliedCount += 1
      }
      if (item.appliedAt && item.reverted) {
        acc.revertedCount += 1
      }
      return acc
    },
    {
      reviewedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      appliedCount: 0,
      revertedCount: 0,
    } satisfies AuditCounters,
  )
}

export function calculateAutomationTrustScore(counters: AuditCounters) {
  const approvalRate =
    counters.reviewedCount > 0 ? counters.approvedCount / counters.reviewedCount : 0
  const rejectionRate =
    counters.reviewedCount > 0 ? counters.rejectedCount / counters.reviewedCount : 0
  const revertRate =
    counters.appliedCount > 0 ? counters.revertedCount / counters.appliedCount : 0

  const rawScore = clamp01(
    approvalRate * 0.7 + (1 - rejectionRate) * 0.15 + (1 - revertRate) * 0.15,
  )
  const smoothingWeight = 6
  const trustScore = clamp01(
    (rawScore * counters.reviewedCount + 0.5 * smoothingWeight) /
      (counters.reviewedCount + smoothingWeight),
  )

  return {
    ...counters,
    approvalRate,
    rejectionRate,
    revertRate,
    trustScore,
  } satisfies AuditMetricSnapshot
}

export function buildAuditMetricNotes(metric: AuditMetricSnapshot) {
  return `reviewed=${metric.reviewedCount}, approved=${metric.approvedCount}, rejected=${metric.rejectedCount}, applied=${metric.appliedCount}, reverted=${metric.revertedCount}`
}

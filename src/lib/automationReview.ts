import {
  AutomationResearchMemoryKind,
  AutomationClaimStatus,
  AutomationDecisionStatus,
  AutomationMetricScope,
  AutomationRunStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client'

import {
  getAutomationHistoricalAnalytics,
  getAutomationResearchAuditOverview,
  refreshAutomationAuditMetrics,
} from '@/lib/automationAudit'
import { rememberAutomationResearchMemory } from '@/lib/automationResearchMemory'
import { prisma } from '@/lib/prisma'

type DbClient = PrismaClient | Prisma.TransactionClient

export async function listAutomationRuns(limit = 8) {
  return prisma.automationRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: {
      candidates: {
        orderBy: [{ status: 'asc' }, { citySlug: 'asc' }, { createdAt: 'desc' }],
        include: {
          sources: true,
          decisions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
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
              artifactLinks: {
                include: {
                  artifact: true,
                },
              },
              citations: {
                orderBy: { createdAt: 'desc' },
                take: 8,
                include: {
                  artifact: true,
                  researchTask: true,
                },
              },
              researchRuns: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  tasks: {
                    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
                    include: {
                      artifactLinks: {
                        include: {
                          artifact: true,
                        },
                      },
                      citations: {
                        orderBy: { createdAt: 'desc' },
                        take: 6,
                        include: {
                          artifact: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}

export async function getAutomationRun(runId: string) {
  return prisma.automationRun.findUnique({
    where: { id: runId },
    include: {
      candidates: {
        orderBy: [{ status: 'asc' }, { citySlug: 'asc' }, { createdAt: 'desc' }],
        include: {
          sources: true,
          decisions: {
            orderBy: { createdAt: 'desc' },
          },
          claim: {
            include: {
              verifications: {
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
              policyDecisions: {
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
              artifactLinks: {
                include: {
                  artifact: true,
                },
              },
              citations: {
                orderBy: { createdAt: 'desc' },
                take: 12,
                include: {
                  artifact: true,
                  researchTask: true,
                },
              },
              researchRuns: {
                orderBy: { createdAt: 'desc' },
                take: 3,
                include: {
                  tasks: {
                    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
                    include: {
                      artifactLinks: {
                        include: {
                          artifact: true,
                        },
                      },
                      citations: {
                        orderBy: { createdAt: 'desc' },
                        take: 8,
                        include: {
                          artifact: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}

export async function getAutomationAuditOverview(limit = 5) {
  const [domainMetrics, cityMetrics, claimTypeMetrics, sourceDomains, research] =
    await Promise.all([
    prisma.automationPolicyMetric.findMany({
      where: {
        scope: AutomationMetricScope.DOMAIN,
        reviewedCount: { gt: 0 },
      },
      orderBy: [{ trustScore: 'asc' }, { reviewedCount: 'desc' }],
      take: limit,
    }),
    prisma.automationPolicyMetric.findMany({
      where: {
        scope: AutomationMetricScope.CITY,
        reviewedCount: { gt: 0 },
      },
      orderBy: [{ trustScore: 'asc' }, { reviewedCount: 'desc' }],
      take: limit,
    }),
    prisma.automationPolicyMetric.findMany({
      where: {
        scope: AutomationMetricScope.CLAIM_TYPE,
        reviewedCount: { gt: 0 },
      },
      orderBy: [{ trustScore: 'asc' }, { reviewedCount: 'desc' }],
      take: limit,
    }),
    prisma.automationSourceDomain.findMany({
      where: {
        blocked: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: limit,
    }),
    getAutomationResearchAuditOverview(limit),
  ])

  const blockedDomainSet = new Set(sourceDomains.map((domain) => domain.domain))
  const sourceDomainByKey = new Map(sourceDomains.map((domain) => [domain.domain, domain]))

  return {
    domains: domainMetrics.map((metric) => ({
      ...metric,
      trustScore: sourceDomainByKey.get(metric.key)?.trustScore ?? metric.trustScore,
      autoTrustScore:
        sourceDomainByKey.get(metric.key)?.autoTrustScore ?? metric.autoTrustScore,
      manualTrustScore:
        sourceDomainByKey.get(metric.key)?.manualTrustScore ?? metric.manualTrustScore,
      manualBlocked: sourceDomainByKey.get(metric.key)?.manualBlocked ?? null,
      overrideReason:
        sourceDomainByKey.get(metric.key)?.overrideReason ?? metric.overrideReason,
      notes: sourceDomainByKey.get(metric.key)?.notes ?? metric.notes,
      blocked: blockedDomainSet.has(metric.key),
    })),
    cities: cityMetrics,
    claimTypes: claimTypeMetrics,
    blockedDomains: sourceDomains,
    research,
  }
}

export async function getAutomationAnalyticsOverview(months = 6) {
  return getAutomationHistoricalAnalytics(months)
}

export async function listAutomationEvalRuns(limit = 6) {
  return prisma.automationEvalRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

function summarizeStatuses(
  counts: Array<{ status: AutomationDecisionStatus; _count: { _all: number } }>,
) {
  return counts.reduce(
    (acc, entry) => {
      acc[entry.status] = entry._count._all
      return acc
    },
    {
      [AutomationDecisionStatus.PENDING]: 0,
      [AutomationDecisionStatus.APPROVED]: 0,
      [AutomationDecisionStatus.REJECTED]: 0,
    } satisfies Record<AutomationDecisionStatus, number>,
  )
}

function mapDecisionStatusToClaimStatus(status: AutomationDecisionStatus): AutomationClaimStatus {
  if (status === AutomationDecisionStatus.APPROVED) return AutomationClaimStatus.APPROVED
  if (status === AutomationDecisionStatus.REJECTED) return AutomationClaimStatus.REJECTED
  return AutomationClaimStatus.PENDING_REVIEW
}

export async function syncAutomationRunStatus(db: DbClient, runId: string) {
  const grouped = await db.automationCandidate.groupBy({
    by: ['status'],
    where: { runId },
    _count: {
      _all: true,
    },
  })

  const counts = summarizeStatuses(grouped)

  let status: AutomationRunStatus = AutomationRunStatus.PENDING_REVIEW
  if (counts.PENDING > 0 && counts.APPROVED + counts.REJECTED > 0) {
    status = AutomationRunStatus.PARTIALLY_REVIEWED
  } else if (counts.PENDING === 0) {
    status = AutomationRunStatus.REVIEWED
  }

  await db.automationRun.update({
    where: { id: runId },
    data: {
      status,
      summary: {
        pending: counts.PENDING,
        approved: counts.APPROVED,
        rejected: counts.REJECTED,
      },
    },
  })
}

type UpdateCandidateDecisionInput = {
  candidateId: string
  status: AutomationDecisionStatus
  note?: string
  reviewer?: string
}

export async function updateAutomationCandidateDecision({
  candidateId,
  status,
  note,
  reviewer,
}: UpdateCandidateDecisionInput) {
  return prisma.$transaction(async (tx) => {
    const candidate = await tx.automationCandidate.findUnique({
      where: { id: candidateId },
      select: { id: true, runId: true },
    })

    if (!candidate) {
      throw new Error('Automation candidate not found')
    }

    const reviewedAt = new Date()
    const updatedCandidate = await tx.automationCandidate.update({
      where: { id: candidate.id },
      data: {
        status,
        reviewNote: note?.trim() || null,
        reviewedBy: reviewer || null,
        reviewedAt,
      },
      include: {
        sources: true,
        decisions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    await tx.automationClaim.updateMany({
      where: { candidateId: candidate.id },
      data: {
        status: mapDecisionStatusToClaimStatus(status),
      },
    })

    await tx.automationDecision.create({
      data: {
        candidateId: candidate.id,
        status,
        note: note?.trim() || null,
        reviewer: reviewer || null,
      },
    })
    await rememberAutomationResearchMemory(
      {
        kind: AutomationResearchMemoryKind.HISTORICAL_FACT,
        key: `review:${updatedCandidate.citySlug}:${updatedCandidate.type}:${candidate.id}:${status}`,
        citySlug: updatedCandidate.citySlug,
        valueJson: {
          title: updatedCandidate.title,
          claimType: updatedCandidate.type,
          status,
          note: note?.trim() || null,
          reviewedBy: reviewer || null,
        },
        trustScore: status === AutomationDecisionStatus.APPROVED ? 0.9 : 0.7,
      },
      tx,
    ).catch(() => null)

    await syncAutomationRunStatus(tx, candidate.runId)
    await refreshAutomationAuditMetrics(tx)

    return updatedCandidate
  })
}

type BulkUpdateCandidatesInput = {
  candidateIds: string[]
  status: AutomationDecisionStatus
  note?: string
  reviewer?: string
}

type ApproveAutoApplyEligibleCandidatesInput = {
  runId: string
  reviewer?: string
  note?: string
}

export async function bulkUpdateAutomationCandidateDecision({
  candidateIds,
  status,
  note,
  reviewer,
}: BulkUpdateCandidatesInput) {
  const uniqueIds = Array.from(new Set(candidateIds.filter(Boolean)))
  if (uniqueIds.length === 0) {
    throw new Error('No candidates selected')
  }

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.automationCandidate.findMany({
      where: {
        id: { in: uniqueIds },
      },
      select: {
        id: true,
        runId: true,
      },
    })

    if (candidates.length === 0) {
      throw new Error('No matching automation candidates found')
    }

    const reviewedAt = new Date()
    await tx.automationCandidate.updateMany({
      where: {
        id: { in: candidates.map((candidate) => candidate.id) },
      },
      data: {
        status,
        reviewNote: note?.trim() || null,
        reviewedBy: reviewer || null,
        reviewedAt,
      },
    })

    await tx.automationClaim.updateMany({
      where: {
        candidateId: { in: candidates.map((candidate) => candidate.id) },
      },
      data: {
        status: mapDecisionStatusToClaimStatus(status),
      },
    })

    await tx.automationDecision.createMany({
      data: candidates.map((candidate) => ({
        candidateId: candidate.id,
        status,
        note: note?.trim() || null,
        reviewer: reviewer || null,
      })),
    })

    const runIds = Array.from(new Set(candidates.map((candidate) => candidate.runId)))
    for (const runId of runIds) {
      await syncAutomationRunStatus(tx, runId)
    }
    await refreshAutomationAuditMetrics(tx)

    return {
      updatedCount: candidates.length,
      runIds,
    }
  })
}

export async function approveAutoApplyEligibleCandidatesForRun({
  runId,
  reviewer,
  note,
}: ApproveAutoApplyEligibleCandidatesInput) {
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.automationCandidate.findMany({
      where: {
        runId,
        status: AutomationDecisionStatus.PENDING,
        appliedAt: null,
        claim: {
          is: {
            lane: 'GREEN',
            autoApplyEligible: true,
            status: AutomationClaimStatus.PENDING_REVIEW,
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (candidates.length === 0) {
      return {
        updatedCount: 0,
        candidateIds: [] as string[],
      }
    }

    const candidateIds = candidates.map((candidate) => candidate.id)
    const reviewedAt = new Date()
    const reviewNote =
      note?.trim() || 'Auto-approved by the green-lane automation policy.'

    await tx.automationCandidate.updateMany({
      where: {
        id: { in: candidateIds },
      },
      data: {
        status: AutomationDecisionStatus.APPROVED,
        reviewNote,
        reviewedBy: reviewer || null,
        reviewedAt,
      },
    })

    await tx.automationClaim.updateMany({
      where: {
        candidateId: { in: candidateIds },
      },
      data: {
        status: AutomationClaimStatus.APPROVED,
      },
    })

    await tx.automationDecision.createMany({
      data: candidateIds.map((candidateId) => ({
        candidateId,
        status: AutomationDecisionStatus.APPROVED,
        note: reviewNote,
        reviewer: reviewer || null,
      })),
    })

    await syncAutomationRunStatus(tx, runId)
    await refreshAutomationAuditMetrics(tx)

    return {
      updatedCount: candidateIds.length,
      candidateIds,
    }
  })
}

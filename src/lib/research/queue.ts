// Review-queue reads and claim-decision writes for the admin UI + API.

import { prisma } from '@/lib/prisma'
import type { Prisma, ResearchClaimStatus, ResearchLane } from '@prisma/client'

export type QueueFilters = {
  lane?: ResearchLane
  status?: ResearchClaimStatus
  citySlug?: string
  claimType?: string
  minConfidence?: number
  take?: number
}

export type ClaimDecision = 'approve' | 'reject' | 'apply'

/** Lists claims for the queue, newest first, with evidence included. */
export async function listClaims(filters: QueueFilters = {}) {
  const where: Prisma.ResearchClaimWhereInput = {
    status: filters.status ?? 'PENDING',
    ...(filters.lane ? { lane: filters.lane } : {}),
    ...(filters.citySlug ? { citySlug: filters.citySlug } : {}),
    ...(filters.claimType ? { claimType: filters.claimType } : {}),
    ...(typeof filters.minConfidence === 'number'
      ? { confidence: { gte: filters.minConfidence } }
      : {}),
  }

  return prisma.researchClaim.findMany({
    where,
    include: { evidence: true, run: { select: { id: true, trigger: true, createdAt: true } } },
    orderBy: [{ lane: 'asc' }, { confidence: 'desc' }, { createdAt: 'desc' }],
    take: filters.take ?? 200,
  })
}

export async function getClaim(id: string) {
  return prisma.researchClaim.findUnique({
    where: { id },
    include: { evidence: true, run: true },
  })
}

const DECISION_STATUS: Record<ClaimDecision, ResearchClaimStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  apply: 'APPLIED',
}

/** Applies a single decision to a claim and stamps the reviewer. */
export async function decideClaim(args: {
  id: string
  decision: ClaimDecision
  reviewer: string
  notes?: string | null
}) {
  return prisma.researchClaim.update({
    where: { id: args.id },
    data: {
      status: DECISION_STATUS[args.decision],
      reviewedBy: args.reviewer,
      reviewedAt: new Date(),
      ...(args.notes != null ? { reviewNotes: args.notes } : {}),
    },
  })
}

/** Applies the same decision to many claims at once. Returns the affected count. */
export async function bulkDecide(args: {
  ids: string[]
  decision: ClaimDecision
  reviewer: string
}): Promise<number> {
  if (!args.ids.length) return 0
  const result = await prisma.researchClaim.updateMany({
    where: { id: { in: args.ids } },
    data: {
      status: DECISION_STATUS[args.decision],
      reviewedBy: args.reviewer,
      reviewedAt: new Date(),
    },
  })
  return result.count
}

/** Aggregate counts for the dashboard header (pending by lane, plus lifetime totals). */
export async function queueMetrics() {
  const [pendingByLane, statusTotals, recentRuns] = await Promise.all([
    prisma.researchClaim.groupBy({
      by: ['lane'],
      where: { status: 'PENDING' },
      _count: { _all: true },
    }),
    prisma.researchClaim.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.researchRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        trigger: true,
        status: true,
        citySlugs: true,
        createdAt: true,
        finishedAt: true,
        summaryJson: true,
      },
    }),
  ])

  const lane = (l: string) =>
    pendingByLane.find((row) => row.lane === l)?._count._all ?? 0
  const status = (s: string) =>
    statusTotals.find((row) => row.status === s)?._count._all ?? 0

  return {
    pending: { green: lane('GREEN'), yellow: lane('YELLOW'), red: lane('RED') },
    totals: {
      pending: status('PENDING'),
      approved: status('APPROVED'),
      rejected: status('REJECTED'),
      applied: status('APPLIED'),
    },
    recentRuns,
  }
}

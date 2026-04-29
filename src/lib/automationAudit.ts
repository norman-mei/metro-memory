import {
  AutomationLane,
  AutomationMetricScope,
  AutomationResearchMemoryKind,
  Prisma,
  PrismaClient,
} from '@prisma/client'

import {
  buildAuditCounters,
  buildAuditMetricNotes,
  calculateAutomationTrustScore,
  type CandidateAuditSnapshot,
  type AuditMetricSnapshot,
} from '@/lib/automationAuditCore'
import { rememberAutomationResearchMemory } from '@/lib/automationResearchMemory'
import { prisma } from '@/lib/prisma'

type DbClient = PrismaClient | Prisma.TransactionClient

type PolicyMetricContext = {
  domainMetrics: Map<string, { trustScore: number; blocked: boolean }>
  cityMetrics: Map<string, { trustScore: number; forcedLane: AutomationLane | null }>
  claimTypeMetrics: Map<string, { trustScore: number; forcedLane: AutomationLane | null }>
}

export type AdaptiveResearchContext = {
  domainRetryBudgets: Map<string, number>
  cityCoolingPenalties: Map<string, number>
  claimTypeScoreAdjustments: Map<string, number>
  suppressedTaskTypesByClaimType: Map<string, string[]>
}

function getEffectiveMetricTrust(row: {
  manualTrustScore: number | null
  autoTrustScore: number | null
  trustScore: number | null
}) {
  return row.manualTrustScore ?? row.autoTrustScore ?? row.trustScore ?? 0.5
}

function getEffectiveDomainBlocked(row: {
  manualBlocked: boolean | null
  autoBlocked: boolean
  blocked: boolean
}) {
  if (typeof row.manualBlocked === 'boolean') {
    return row.manualBlocked
  }
  return row.autoBlocked || row.blocked
}

async function upsertPolicyMetric(
  db: DbClient,
  scope: AutomationMetricScope,
  key: string,
  metric: AuditMetricSnapshot,
) {
  const existing = await db.automationPolicyMetric.findUnique({
    where: {
      scope_key: {
        scope,
        key,
      },
    },
  })
  const effectiveTrustScore = existing?.manualTrustScore ?? metric.trustScore

  await db.automationPolicyMetric.upsert({
    where: {
      scope_key: {
        scope,
        key,
      },
    },
    update: {
      reviewedCount: metric.reviewedCount,
      approvedCount: metric.approvedCount,
      rejectedCount: metric.rejectedCount,
      appliedCount: metric.appliedCount,
      revertedCount: metric.revertedCount,
      approvalRate: metric.approvalRate,
      rejectionRate: metric.rejectionRate,
      revertRate: metric.revertRate,
      trustScore: effectiveTrustScore,
      autoTrustScore: metric.trustScore,
      notes: buildAuditMetricNotes(metric),
    },
    create: {
      scope,
      key,
      reviewedCount: metric.reviewedCount,
      approvedCount: metric.approvedCount,
      rejectedCount: metric.rejectedCount,
      appliedCount: metric.appliedCount,
      revertedCount: metric.revertedCount,
      approvalRate: metric.approvalRate,
      rejectionRate: metric.rejectionRate,
      revertRate: metric.revertRate,
      trustScore: metric.trustScore,
      autoTrustScore: metric.trustScore,
      notes: buildAuditMetricNotes(metric),
    },
  })
}

async function refreshScopeMetrics(
  db: DbClient,
  scope: AutomationMetricScope,
  grouped: Map<string, CandidateAuditSnapshot[]>,
) {
  const keys = Array.from(grouped.keys())

  if (keys.length === 0) {
    await db.automationPolicyMetric.deleteMany({
      where: {
        scope,
        manualTrustScore: null,
        forcedLane: null,
        overrideReason: null,
      },
    })
    return new Map<string, AuditMetricSnapshot>()
  }

  const metrics = new Map<string, AuditMetricSnapshot>()
  for (const [key, items] of grouped.entries()) {
    const metric = calculateAutomationTrustScore(buildAuditCounters(items))
    metrics.set(key, metric)
    await upsertPolicyMetric(db, scope, key, metric)
  }

  await db.automationPolicyMetric.deleteMany({
    where: {
      scope,
      key: { notIn: keys },
      manualTrustScore: null,
      forcedLane: null,
      overrideReason: null,
    },
  })

  return metrics
}

export async function refreshAutomationAuditMetrics(db: DbClient = prisma) {
  const candidates = await db.automationCandidate.findMany({
    select: {
      id: true,
      citySlug: true,
      type: true,
      status: true,
      reviewedAt: true,
      appliedAt: true,
      run: {
        select: {
          revertedAt: true,
        },
      },
    },
  })

  const cityGrouped = new Map<string, CandidateAuditSnapshot[]>()
  const claimTypeGrouped = new Map<string, CandidateAuditSnapshot[]>()
  const candidateSnapshotById = new Map<string, CandidateAuditSnapshot>()

  for (const candidate of candidates) {
    const snapshot: CandidateAuditSnapshot = {
      status: candidate.status,
      reviewedAt: candidate.reviewedAt,
      appliedAt: candidate.appliedAt,
      reverted: Boolean(candidate.appliedAt && candidate.run.revertedAt),
    }
    candidateSnapshotById.set(candidate.id, snapshot)

    const cityItems = cityGrouped.get(candidate.citySlug) || []
    cityItems.push(snapshot)
    cityGrouped.set(candidate.citySlug, cityItems)

    const claimTypeItems = claimTypeGrouped.get(candidate.type) || []
    claimTypeItems.push(snapshot)
    claimTypeGrouped.set(candidate.type, claimTypeItems)
  }

  const sources = await db.automationSource.findMany({
    select: {
      candidateId: true,
      url: true,
    },
  })

  const domainGrouped = new Map<string, Map<string, CandidateAuditSnapshot>>()
  for (const source of sources) {
    if (!source.url) continue
    let domain: string | null = null
    try {
      domain = new URL(source.url).hostname.replace(/^www\./, '')
    } catch {
      domain = null
    }
    if (!domain) continue

    const candidateSnapshot = candidateSnapshotById.get(source.candidateId)
    if (!candidateSnapshot) continue

    const domainItems = domainGrouped.get(domain) || new Map<string, CandidateAuditSnapshot>()
    domainItems.set(source.candidateId, candidateSnapshot)
    domainGrouped.set(domain, domainItems)
  }

  const cityMetrics = await refreshScopeMetrics(db, AutomationMetricScope.CITY, cityGrouped)
  const claimTypeMetrics = await refreshScopeMetrics(
    db,
    AutomationMetricScope.CLAIM_TYPE,
    claimTypeGrouped,
  )
  const domainMetrics = await refreshScopeMetrics(
    db,
    AutomationMetricScope.DOMAIN,
    new Map(
      Array.from(domainGrouped.entries()).map(([domain, items]) => [
        domain,
        Array.from(items.values()),
      ]),
    ),
  )

  for (const [domain, metric] of domainMetrics.entries()) {
    const autoBlocked = metric.reviewedCount >= 6 && metric.trustScore <= 0.24
    const existing = await db.automationSourceDomain.findUnique({
      where: { domain },
    })
    const blocked =
      typeof existing?.manualBlocked === 'boolean' ? existing.manualBlocked : autoBlocked
    const trustScore = existing?.manualTrustScore ?? metric.trustScore
    await db.automationSourceDomain.upsert({
      where: { domain },
      update: {
        trustScore,
        autoTrustScore: metric.trustScore,
        blocked,
        autoBlocked,
        notes: `Auto-derived audit metric: ${buildAuditMetricNotes(metric)}`,
      },
      create: {
        domain,
        trustScore,
        autoTrustScore: metric.trustScore,
        blocked,
        autoBlocked,
        notes: `Auto-derived audit metric: ${buildAuditMetricNotes(metric)}`,
      },
    })
  }

  await applyAutomationPlannerLearning(db).catch(() => null)

  return {
    domainMetrics,
    cityMetrics,
    claimTypeMetrics,
  }
}

export async function loadAutomationPolicyMetricContext(
  db: DbClient,
  input: {
    domains: string[]
    cities: string[]
    claimTypes: string[]
  },
): Promise<PolicyMetricContext> {
  const uniqueDomains = Array.from(new Set(input.domains.filter(Boolean)))
  const uniqueCities = Array.from(new Set(input.cities.filter(Boolean)))
  const uniqueClaimTypes = Array.from(new Set(input.claimTypes.filter(Boolean)))

  const [domainMetricRows, cityMetricRows, claimTypeRows, sourceDomains] = await Promise.all([
    uniqueDomains.length
      ? db.automationPolicyMetric.findMany({
          where: {
            scope: AutomationMetricScope.DOMAIN,
            key: { in: uniqueDomains },
          },
        })
      : Promise.resolve([]),
    uniqueCities.length
      ? db.automationPolicyMetric.findMany({
          where: {
            scope: AutomationMetricScope.CITY,
            key: { in: uniqueCities },
          },
        })
      : Promise.resolve([]),
    uniqueClaimTypes.length
      ? db.automationPolicyMetric.findMany({
          where: {
            scope: AutomationMetricScope.CLAIM_TYPE,
            key: { in: uniqueClaimTypes },
          },
        })
      : Promise.resolve([]),
    uniqueDomains.length
      ? db.automationSourceDomain.findMany({
          where: {
            domain: { in: uniqueDomains },
          },
        })
      : Promise.resolve([]),
  ])

  const sourceDomainByKey = new Map(sourceDomains.map((row) => [row.domain, row]))
  const domainMetricByKey = new Map(domainMetricRows.map((row) => [row.key, row]))
  const domainKeys = Array.from(
    new Set([...domainMetricByKey.keys(), ...sourceDomainByKey.keys()]),
  )

  return {
    domainMetrics: new Map(
      domainKeys.map((key) => {
        const metric = domainMetricByKey.get(key)
        const domain = sourceDomainByKey.get(key)
        return [
          key,
          {
            trustScore:
              domain?.manualTrustScore ??
              domain?.autoTrustScore ??
              metric?.manualTrustScore ??
              metric?.autoTrustScore ??
              metric?.trustScore ??
              domain?.trustScore ??
              0.5,
            blocked: domain
              ? getEffectiveDomainBlocked(domain)
              : false,
          },
        ] as const
      }),
    ),
    cityMetrics: new Map(
      cityMetricRows.map((row) => [
        row.key,
        {
          trustScore: getEffectiveMetricTrust(row),
          forcedLane: row.forcedLane,
        },
      ]),
    ),
    claimTypeMetrics: new Map(
      claimTypeRows.map((row) => [
        row.key,
        {
          trustScore: getEffectiveMetricTrust(row),
          forcedLane: row.forcedLane,
        },
      ]),
    ),
  }
}

export async function updateAutomationDomainOverride(
  input: {
    domain: string
    manualBlocked?: boolean | null
    manualTrustScore?: number | null
    overrideReason?: string | null
  },
  db: DbClient = prisma,
) {
  const normalizedDomain = input.domain.trim().toLowerCase()
  const existing = await db.automationSourceDomain.findUnique({
    where: { domain: normalizedDomain },
  })
  const autoBlocked = existing?.autoBlocked ?? false
  const autoTrustScore = existing?.autoTrustScore ?? existing?.trustScore ?? 0.5
  const trustScore = input.manualTrustScore ?? autoTrustScore
  const blocked =
    typeof input.manualBlocked === 'boolean' ? input.manualBlocked : autoBlocked

  return db.automationSourceDomain.upsert({
    where: { domain: normalizedDomain },
    update: {
      manualBlocked:
        typeof input.manualBlocked === 'boolean' ? input.manualBlocked : null,
      manualTrustScore: input.manualTrustScore ?? null,
      trustScore,
      blocked,
      overrideReason: input.overrideReason?.trim() || null,
    },
    create: {
      domain: normalizedDomain,
      manualBlocked:
        typeof input.manualBlocked === 'boolean' ? input.manualBlocked : null,
      manualTrustScore: input.manualTrustScore ?? null,
      trustScore,
      blocked,
      autoBlocked,
      autoTrustScore,
      overrideReason: input.overrideReason?.trim() || null,
    },
  })
}

export async function updateAutomationPolicyMetricOverride(
  input: {
    scope: AutomationMetricScope
    key: string
    manualTrustScore?: number | null
    forcedLane?: AutomationLane | null
    overrideReason?: string | null
  },
  db: DbClient = prisma,
) {
  const normalizedKey = input.key.trim()
  const existing = await db.automationPolicyMetric.findUnique({
    where: {
      scope_key: {
        scope: input.scope,
        key: normalizedKey,
      },
    },
  })
  const autoTrustScore = existing?.autoTrustScore ?? existing?.trustScore ?? 0.5
  const trustScore = input.manualTrustScore ?? autoTrustScore

  return db.automationPolicyMetric.upsert({
    where: {
      scope_key: {
        scope: input.scope,
        key: normalizedKey,
      },
    },
    update: {
      manualTrustScore: input.manualTrustScore ?? null,
      trustScore,
      forcedLane: input.forcedLane ?? null,
      overrideReason: input.overrideReason?.trim() || null,
    },
    create: {
      scope: input.scope,
      key: normalizedKey,
      manualTrustScore: input.manualTrustScore ?? null,
      autoTrustScore,
      trustScore,
      forcedLane: input.forcedLane ?? null,
      overrideReason: input.overrideReason?.trim() || null,
    },
  })
}

export async function getAutomationResearchAuditOverview(limit = 5) {
  const [runs, tasks] = await Promise.all([
    prisma.automationResearchRun.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 500,
      select: {
        status: true,
        claim: {
          select: {
            claimType: true,
            lane: true,
          },
        },
      },
    }),
    prisma.automationResearchTask.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 1000,
      select: {
        taskType: true,
        status: true,
        retryCount: true,
        resultJson: true,
      },
    }),
  ])

  const completedRuns = runs.filter((run) => run.status === 'COMPLETED').length
  const finalRuns = runs.filter((run) =>
    run.status === 'COMPLETED' || run.status === 'EXHAUSTED' || run.status === 'BLOCKED',
  ).length
  const taskTypeStats = new Map<string, { total: number; resolved: number }>()
  const wastefulDomains = new Map<string, number>()
  const stubbornClaimTypes = new Map<string, number>()

  tasks.forEach((task) => {
    const stats = taskTypeStats.get(task.taskType) || { total: 0, resolved: 0 }
    stats.total += 1
    if (task.status === 'SATISFIED') {
      stats.resolved += 1
    }
    taskTypeStats.set(task.taskType, stats)

    const failedUrls =
      task.resultJson && typeof task.resultJson === 'object' && 'failedUrls' in task.resultJson
        ? Array.isArray(task.resultJson.failedUrls)
          ? task.resultJson.failedUrls.map((value: unknown) => String(value))
          : []
        : []
    if (task.retryCount > 0 || task.status === 'EXHAUSTED') {
      failedUrls.forEach((url) => {
        try {
          const domain = new URL(url).hostname.replace(/^www\./, '')
          wastefulDomains.set(domain, (wastefulDomains.get(domain) || 0) + 1)
        } catch {
          // ignore invalid urls
        }
      })
    }
  })

  runs.forEach((run) => {
    if (run.claim && run.claim.lane !== 'GREEN') {
      stubbornClaimTypes.set(
        run.claim.claimType,
        (stubbornClaimTypes.get(run.claim.claimType) || 0) + 1,
      )
    }
  })

  return {
    summary: {
      runCount: runs.length,
      finalRunCount: finalRuns,
      completedRunCount: completedRuns,
      pendingRunCount: runs.filter((run) => run.status === 'PENDING' || run.status === 'RUNNING').length,
      followUpSuccessRate: finalRuns > 0 ? completedRuns / finalRuns : 0,
    },
    taskTypes: Array.from(taskTypeStats.entries())
      .sort((left, right) => right[1].resolved - left[1].resolved || right[1].total - left[1].total)
      .slice(0, limit)
      .map(([taskType, stats]) => ({
        taskType,
        total: stats.total,
        resolved: stats.resolved,
        resolutionRate: stats.total > 0 ? stats.resolved / stats.total : 0,
      })),
    wastefulDomains: Array.from(wastefulDomains.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count })),
    stubbornClaimTypes: Array.from(stubbornClaimTypes.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, limit)
      .map(([claimType, count]) => ({ claimType, count })),
  }
}

function getFailedUrlsFromResultJson(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || !('failedUrls' in value)) return [] as string[]
  return Array.isArray(value.failedUrls)
    ? value.failedUrls.map((entry: unknown) => String(entry)).filter(Boolean)
    : []
}

function getFetchedUrlsFromResultJson(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== 'object' || !('fetchedUrls' in value)) return [] as string[]
  return Array.isArray(value.fetchedUrls)
    ? value.fetchedUrls.map((entry: unknown) => String(entry)).filter(Boolean)
    : []
}

function inferCoolingPenalty(finalCount: number, completionCount: number) {
  if (finalCount < 4) return 0
  const completionRate = finalCount > 0 ? completionCount / finalCount : 0
  if (completionRate < 0.2) return 0.08
  if (completionRate < 0.35) return 0.05
  if (completionRate < 0.5) return 0.03
  return 0
}

export async function applyAutomationPlannerLearning(
  db: DbClient = prisma,
  input?: {
    lookbackDays?: number
  },
) {
  const since = new Date(
    Date.now() - (Number.isFinite(input?.lookbackDays) ? Number(input?.lookbackDays) : 180) * 24 * 60 * 60 * 1000,
  )
  const [tasks, outcomes] = await Promise.all([
    db.automationResearchTask.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        taskType: true,
        status: true,
        resultJson: true,
        claim: {
          select: {
            claimType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
    db.automationAgentOutcome.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        outcomeType: true,
        summaryJson: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
  ])

  const domainStats = new Map<string, { successes: number; failures: number }>()
  const claimTypeTaskStats = new Map<string, Map<string, { total: number; resolved: number }>>()

  const collectUrls = (value: Prisma.JsonValue | null, key: 'fetchedUrls' | 'failedUrls') => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !(key in value)) {
      return [] as string[]
    }
    const record = value as Record<string, unknown>
    const entries = record[key]
    return Array.isArray(entries) ? entries.map((entry: unknown) => String(entry)).filter(Boolean) : []
  }

  for (const task of tasks) {
    for (const url of collectUrls(task.resultJson, 'fetchedUrls')) {
      try {
        const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
        const stats = domainStats.get(domain) || { successes: 0, failures: 0 }
        stats.successes += 1
        domainStats.set(domain, stats)
      } catch {
        // ignore invalid urls
      }
    }
    for (const url of collectUrls(task.resultJson, 'failedUrls')) {
      try {
        const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
        const stats = domainStats.get(domain) || { successes: 0, failures: 0 }
        stats.failures += 1
        domainStats.set(domain, stats)
      } catch {
        // ignore invalid urls
      }
    }

    const claimType = String(task.claim?.claimType || '').trim().toUpperCase()
    if (!claimType) continue
    const taskStats = claimTypeTaskStats.get(claimType) || new Map<string, { total: number; resolved: number }>()
    const current = taskStats.get(task.taskType) || { total: 0, resolved: 0 }
    current.total += 1
    if (task.status === 'SATISFIED') {
      current.resolved += 1
    }
    taskStats.set(task.taskType, current)
    claimTypeTaskStats.set(claimType, taskStats)
  }

  for (const [domain, stats] of domainStats.entries()) {
    const retryBudget =
      stats.failures >= 8 && stats.successes === 0
        ? 0
        : stats.failures >= 5 && stats.successes <= 1
          ? 1
          : 2
    const preferred = stats.successes >= 3 && stats.failures <= 1
    const demoted = retryBudget < 2

    await rememberAutomationResearchMemory(
      {
        kind: AutomationResearchMemoryKind.DOMAIN_RECIPE,
        key: `auto-domain:${domain}`,
        domain,
        valueJson: {
          source: 'planner-learning',
          retryBudget,
          preferred,
          demoted,
          successes: stats.successes,
          failures: stats.failures,
        },
        trustScore: preferred ? 0.9 : demoted ? 0.2 : 0.5,
      },
      db,
    )

    const existing = await db.automationSourceDomain.findUnique({
      where: { domain },
    })
    const nextAutoTrustScore = preferred ? 0.9 : demoted ? 0.22 : existing?.autoTrustScore ?? 0.5
    await db.automationSourceDomain.upsert({
      where: { domain },
      update: {
        autoTrustScore: nextAutoTrustScore,
        trustScore: existing?.manualTrustScore ?? nextAutoTrustScore,
        blocked:
          typeof existing?.manualBlocked === 'boolean'
            ? existing.manualBlocked
            : retryBudget === 0,
        autoBlocked: retryBudget === 0,
        notes: `Planner learning: retryBudget=${retryBudget}, successes=${stats.successes}, failures=${stats.failures}`,
      },
      create: {
        domain,
        autoTrustScore: nextAutoTrustScore,
        trustScore: nextAutoTrustScore,
        blocked: retryBudget === 0,
        autoBlocked: retryBudget === 0,
        notes: `Planner learning: retryBudget=${retryBudget}, successes=${stats.successes}, failures=${stats.failures}`,
      },
    })
  }

  for (const [claimType, taskStats] of claimTypeTaskStats.entries()) {
    const suppressedTaskTypes = Array.from(taskStats.entries())
      .filter(([, stats]) => stats.total >= 4 && stats.resolved / stats.total < 0.2)
      .map(([taskType]) => taskType)
    const helpfulTaskTypes = Array.from(taskStats.entries())
      .filter(([, stats]) => stats.total >= 3 && stats.resolved / stats.total >= 0.6)
      .map(([taskType]) => taskType)
    const improvementCount = outcomes.filter((outcome) => {
      if (outcome.outcomeType !== 'FOLLOW_UP_IMPROVEMENT') return false
      if (!outcome.summaryJson || typeof outcome.summaryJson !== 'object' || Array.isArray(outcome.summaryJson)) {
        return false
      }
      const summary = outcome.summaryJson as Record<string, unknown>
      return String(summary.claimType || '').toUpperCase() === claimType
    }).length
    const scoreAdjustment =
      suppressedTaskTypes.length > 0 && improvementCount === 0
        ? -0.05
        : improvementCount >= 3
          ? 0.03
          : 0
    await rememberAutomationResearchMemory(
      {
        kind: AutomationResearchMemoryKind.HISTORICAL_FACT,
        key: `auto-claimtype:${claimType}`,
        valueJson: {
          source: 'planner-learning',
          claimType,
          suppressedTaskTypes,
          helpfulTaskTypes,
          scoreAdjustment,
          improvementCount,
        },
        trustScore: scoreAdjustment > 0 ? 0.8 : suppressedTaskTypes.length > 0 ? 0.25 : 0.5,
      },
      db,
    )
  }

  return {
    domainCount: domainStats.size,
    claimTypeCount: claimTypeTaskStats.size,
  }
}

export async function loadAutomationAdaptiveResearchContext(
  db: DbClient,
  input: {
    domains?: string[]
    cities?: string[]
    claimTypes?: string[]
    lookbackDays?: number
  },
): Promise<AdaptiveResearchContext> {
  const uniqueDomains = Array.from(
    new Set((input.domains || []).map((value) => value.trim().toLowerCase()).filter(Boolean)),
  )
  const uniqueCities = Array.from(
    new Set((input.cities || []).map((value) => value.trim().toLowerCase()).filter(Boolean)),
  )
  const uniqueClaimTypes = Array.from(
    new Set((input.claimTypes || []).map((value) => value.trim().toUpperCase()).filter(Boolean)),
  )
  const since = new Date(
    Date.now() - (Number.isFinite(input.lookbackDays) ? Number(input.lookbackDays) : 180) * 24 * 60 * 60 * 1000,
  )

  const runWhere: Prisma.AutomationResearchRunWhereInput = {
    createdAt: { gte: since },
  }
  if (uniqueCities.length > 0 || uniqueClaimTypes.length > 0) {
    runWhere.OR = [
      ...(uniqueCities.length > 0 ? [{ citySlug: { in: uniqueCities } }] : []),
      ...(uniqueClaimTypes.length > 0
        ? [{ claim: { is: { claimType: { in: uniqueClaimTypes } } } }]
        : []),
    ]
  }

  const taskWhere: Prisma.AutomationResearchTaskWhereInput = {
    createdAt: { gte: since },
  }
  if (uniqueCities.length > 0 || uniqueClaimTypes.length > 0) {
    taskWhere.OR = [
      ...(uniqueCities.length > 0 ? [{ citySlug: { in: uniqueCities } }] : []),
      ...(uniqueClaimTypes.length > 0
        ? [{ claim: { is: { claimType: { in: uniqueClaimTypes } } } }]
        : []),
    ]
  }

  const [runs, tasks] = await Promise.all([
    db.automationResearchRun.findMany({
      where: runWhere,
      select: {
        status: true,
        citySlug: true,
        claim: {
          select: {
            claimType: true,
          },
        },
      },
      take: 800,
      orderBy: { createdAt: 'desc' },
    }),
    db.automationResearchTask.findMany({
      where: taskWhere,
      select: {
        taskType: true,
        status: true,
        retryCount: true,
        resultJson: true,
        claim: {
          select: {
            claimType: true,
            citySlug: true,
          },
        },
      },
      take: 1600,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const domainStats = new Map<string, { failures: number; successes: number }>()
  const cityRunStats = new Map<string, { finalCount: number; completionCount: number }>()
  const claimTypeRunStats = new Map<string, { finalCount: number; completionCount: number }>()
  const claimTypeTaskStats = new Map<string, Map<string, { total: number; resolved: number }>>()

  for (const run of runs) {
    const isFinal =
      run.status === 'COMPLETED' ||
      run.status === 'EXHAUSTED' ||
      run.status === 'BLOCKED' ||
      run.status === 'FAILED'
    if (!isFinal) continue

    const cityKey = String(run.citySlug || '').trim().toLowerCase()
    if (cityKey) {
      const stats = cityRunStats.get(cityKey) || { finalCount: 0, completionCount: 0 }
      stats.finalCount += 1
      if (run.status === 'COMPLETED') {
        stats.completionCount += 1
      }
      cityRunStats.set(cityKey, stats)
    }

    const claimTypeKey = String(run.claim?.claimType || '').trim().toUpperCase()
    if (claimTypeKey) {
      const stats = claimTypeRunStats.get(claimTypeKey) || {
        finalCount: 0,
        completionCount: 0,
      }
      stats.finalCount += 1
      if (run.status === 'COMPLETED') {
        stats.completionCount += 1
      }
      claimTypeRunStats.set(claimTypeKey, stats)
    }
  }

  for (const task of tasks) {
    const fetchedUrls = getFetchedUrlsFromResultJson(task.resultJson)
    const failedUrls = getFailedUrlsFromResultJson(task.resultJson)
    for (const url of fetchedUrls) {
      try {
        const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
        const stats = domainStats.get(domain) || { failures: 0, successes: 0 }
        stats.successes += 1
        domainStats.set(domain, stats)
      } catch {
        // ignore invalid url
      }
    }
    for (const url of failedUrls) {
      try {
        const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
        const stats = domainStats.get(domain) || { failures: 0, successes: 0 }
        stats.failures += 1
        domainStats.set(domain, stats)
      } catch {
        // ignore invalid url
      }
    }

    const claimTypeKey = String(task.claim?.claimType || '').trim().toUpperCase()
    if (!claimTypeKey) continue
    const taskStats = claimTypeTaskStats.get(claimTypeKey) || new Map<string, { total: number; resolved: number }>()
    const current = taskStats.get(task.taskType) || { total: 0, resolved: 0 }
    current.total += 1
    if (task.status === 'SATISFIED') {
      current.resolved += 1
    }
    taskStats.set(task.taskType, current)
    claimTypeTaskStats.set(claimTypeKey, taskStats)
  }

  const domainRetryBudgets = new Map<string, number>()
  for (const domain of uniqueDomains) {
    const stats = domainStats.get(domain)
    if (!stats) {
      domainRetryBudgets.set(domain, 2)
      continue
    }
    if (stats.failures >= 8 && stats.successes === 0) {
      domainRetryBudgets.set(domain, 0)
    } else if (stats.failures >= 5 && stats.successes <= 1) {
      domainRetryBudgets.set(domain, 1)
    } else {
      domainRetryBudgets.set(domain, 2)
    }
  }

  const cityCoolingPenalties = new Map<string, number>()
  for (const city of uniqueCities) {
    const stats = cityRunStats.get(city)
    cityCoolingPenalties.set(
      city,
      stats ? inferCoolingPenalty(stats.finalCount, stats.completionCount) : 0,
    )
  }

  const claimTypeScoreAdjustments = new Map<string, number>()
  const suppressedTaskTypesByClaimType = new Map<string, string[]>()
  for (const claimType of uniqueClaimTypes) {
    const stats = claimTypeRunStats.get(claimType)
    const penalty = stats ? inferCoolingPenalty(stats.finalCount, stats.completionCount) : 0
    claimTypeScoreAdjustments.set(claimType, -penalty)

    const taskStats = claimTypeTaskStats.get(claimType)
    const suppressed = taskStats
      ? Array.from(taskStats.entries())
          .filter(([, taskStat]) => taskStat.total >= 4 && taskStat.resolved / taskStat.total < 0.2)
          .map(([taskType]) => taskType)
      : []
    suppressedTaskTypesByClaimType.set(claimType, suppressed)
  }

  const learnedMemories = await db.automationResearchMemory.findMany({
    where: {
      OR: [
        ...(uniqueDomains.length > 0 ? [{ domain: { in: uniqueDomains } }] : []),
        ...(uniqueClaimTypes.length > 0
          ? [{ key: { in: uniqueClaimTypes.map((claimType) => `auto-claimtype:${claimType}`) } }]
          : []),
      ],
    },
  })

  for (const memory of learnedMemories) {
    const value = memory.valueJson && typeof memory.valueJson === 'object'
      ? (memory.valueJson as Record<string, any>)
      : {}
    if (memory.kind === AutomationResearchMemoryKind.DOMAIN_RECIPE && memory.domain) {
      if (typeof value.retryBudget === 'number') {
        domainRetryBudgets.set(memory.domain, Math.max(0, Math.min(2, Math.trunc(value.retryBudget))))
      }
    }
    if (memory.kind === AutomationResearchMemoryKind.HISTORICAL_FACT) {
      const claimType = String(value.claimType || '').trim().toUpperCase()
      if (!claimType) continue
      if (typeof value.scoreAdjustment === 'number') {
        claimTypeScoreAdjustments.set(claimType, value.scoreAdjustment)
      }
      if (Array.isArray(value.suppressedTaskTypes)) {
        suppressedTaskTypesByClaimType.set(
          claimType,
          value.suppressedTaskTypes.map((entry: unknown) => String(entry)).filter(Boolean),
        )
      }
    }
  }

  return {
    domainRetryBudgets,
    cityCoolingPenalties,
    claimTypeScoreAdjustments,
    suppressedTaskTypesByClaimType,
  }
}

export async function getAutomationHistoricalAnalytics(months = 6) {
  const since = new Date(Date.now() - months * 31 * 24 * 60 * 60 * 1000)
  const [candidates, researchRuns, researchTasks] = await Promise.all([
    prisma.automationCandidate.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        reviewedAt: true,
        status: true,
        type: true,
        reviewNote: true,
        applyNote: true,
        appliedAt: true,
        run: {
          select: {
            revertedAt: true,
          },
        },
        claim: {
          select: {
            lane: true,
            autoApplyEligible: true,
          },
        },
        citySlug: true,
        sources: {
          select: {
            url: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.automationResearchRun.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        status: true,
        claim: {
          select: {
            claimType: true,
            lane: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.automationResearchTask.findMany({
      where: {
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        taskType: true,
        status: true,
        retryCount: true,
        resultJson: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const monthMap = new Map<
    string,
    {
      createdCount: number
      reviewedCount: number
      approvedCount: number
      appliedCount: number
      revertedCount: number
      greenLaneCount: number
      greenLaneApplied: number
      greenLaneReverted: number
      autoAppliedCount: number
      reviewRequiredCount: number
      changedCities: Set<string>
      worseningDomains: Map<string, number>
      falsePositiveCities: Map<string, number>
      falsePositiveClaimTypes: Map<string, number>
      claimTypePrecision: Map<string, { reviewed: number; accepted: number }>
      revertCauses: Map<string, number>
      researchRunCount: number
      researchResolvedCount: number
      researchPendingCount: number
      researchTaskResolution: Map<string, { total: number; resolved: number }>
      researchWasteDomains: Map<string, number>
      stubbornClaimTypes: Map<string, number>
    }
  >()

  const ensureBucket = (monthKey: string) => {
    const existing = monthMap.get(monthKey)
    if (existing) return existing
    const bucket = {
      createdCount: 0,
      reviewedCount: 0,
      approvedCount: 0,
      appliedCount: 0,
      revertedCount: 0,
      greenLaneCount: 0,
      greenLaneApplied: 0,
      greenLaneReverted: 0,
      autoAppliedCount: 0,
      reviewRequiredCount: 0,
      changedCities: new Set<string>(),
      worseningDomains: new Map<string, number>(),
      falsePositiveCities: new Map<string, number>(),
      falsePositiveClaimTypes: new Map<string, number>(),
      claimTypePrecision: new Map<string, { reviewed: number; accepted: number }>(),
      revertCauses: new Map<string, number>(),
      researchRunCount: 0,
      researchResolvedCount: 0,
      researchPendingCount: 0,
      researchTaskResolution: new Map<string, { total: number; resolved: number }>(),
      researchWasteDomains: new Map<string, number>(),
      stubbornClaimTypes: new Map<string, number>(),
    }
    monthMap.set(monthKey, bucket)
    return bucket
  }

  for (const candidate of candidates) {
    const monthKey = candidate.createdAt.toISOString().slice(0, 7)
    const bucket = ensureBucket(monthKey)
    bucket.createdCount += 1
    bucket.changedCities.add(candidate.citySlug)
    if (candidate.reviewedAt || candidate.status !== 'PENDING') bucket.reviewedCount += 1
    if (candidate.status === 'APPROVED') bucket.approvedCount += 1
    if (candidate.appliedAt) bucket.appliedCount += 1
    if (candidate.appliedAt && candidate.run.revertedAt) bucket.revertedCount += 1
    if (candidate.claim?.lane === 'GREEN' && candidate.claim.autoApplyEligible && candidate.appliedAt) {
      bucket.autoAppliedCount += 1
    }
    if (!(candidate.claim?.lane === 'GREEN' && candidate.claim.autoApplyEligible)) {
      bucket.reviewRequiredCount += 1
    }
    if (candidate.claim?.lane === 'GREEN' && candidate.claim.autoApplyEligible) {
      bucket.greenLaneCount += 1
      if (candidate.appliedAt) bucket.greenLaneApplied += 1
      if (candidate.appliedAt && candidate.run.revertedAt) bucket.greenLaneReverted += 1
    }
    if (candidate.reviewedAt || candidate.status !== 'PENDING') {
      const currentPrecision = bucket.claimTypePrecision.get(candidate.type) || {
        reviewed: 0,
        accepted: 0,
      }
      currentPrecision.reviewed += 1
      if (candidate.status === 'APPROVED' && !(candidate.appliedAt && candidate.run.revertedAt)) {
        currentPrecision.accepted += 1
      }
      bucket.claimTypePrecision.set(candidate.type, currentPrecision)
    }
    if (candidate.status === 'REJECTED' || (candidate.appliedAt && candidate.run.revertedAt)) {
      bucket.falsePositiveCities.set(
        candidate.citySlug,
        (bucket.falsePositiveCities.get(candidate.citySlug) || 0) + 1,
      )
      bucket.falsePositiveClaimTypes.set(
        candidate.type,
        (bucket.falsePositiveClaimTypes.get(candidate.type) || 0) + 1,
      )

      const revertCause =
        candidate.applyNote?.trim() ||
        candidate.reviewNote?.trim() ||
        (candidate.appliedAt && candidate.run.revertedAt ? 'run reverted after apply' : 'manual rejection')
      bucket.revertCauses.set(revertCause, (bucket.revertCauses.get(revertCause) || 0) + 1)

      candidate.sources.forEach((source) => {
        if (!source.url) return
        try {
          const domain = new URL(source.url).hostname.replace(/^www\./, '')
          bucket.worseningDomains.set(domain, (bucket.worseningDomains.get(domain) || 0) + 1)
        } catch {
          // ignore invalid source urls
        }
      })
    }
  }

  for (const researchRun of researchRuns) {
    const monthKey = researchRun.createdAt.toISOString().slice(0, 7)
    const bucket = ensureBucket(monthKey)
    bucket.researchRunCount += 1
    if (researchRun.status === 'COMPLETED') {
      bucket.researchResolvedCount += 1
    }
    if (researchRun.status === 'PENDING' || researchRun.status === 'RUNNING') {
      bucket.researchPendingCount += 1
    }
    if (researchRun.claim && researchRun.claim.lane !== 'GREEN') {
      bucket.stubbornClaimTypes.set(
        researchRun.claim.claimType,
        (bucket.stubbornClaimTypes.get(researchRun.claim.claimType) || 0) + 1,
      )
    }
  }

  for (const task of researchTasks) {
    const monthKey = task.createdAt.toISOString().slice(0, 7)
    const bucket = ensureBucket(monthKey)
    const taskStats = bucket.researchTaskResolution.get(task.taskType) || {
      total: 0,
      resolved: 0,
    }
    taskStats.total += 1
    if (task.status === 'SATISFIED') {
      taskStats.resolved += 1
    }
    bucket.researchTaskResolution.set(task.taskType, taskStats)

    const failedUrls =
      task.resultJson && typeof task.resultJson === 'object' && 'failedUrls' in task.resultJson
        ? Array.isArray(task.resultJson.failedUrls)
          ? task.resultJson.failedUrls.map((value: unknown) => String(value))
          : []
        : []
    if (task.retryCount > 0 || task.status === 'EXHAUSTED') {
      failedUrls.forEach((url) => {
        try {
          const domain = new URL(url).hostname.replace(/^www\./, '')
          bucket.researchWasteDomains.set(
            domain,
            (bucket.researchWasteDomains.get(domain) || 0) + 1,
          )
        } catch {
          // ignore invalid urls
        }
      })
    }
  }

  return Array.from(monthMap.entries()).map(([month, bucket]) => ({
    month,
    approvalRate:
      bucket.reviewedCount > 0 ? bucket.approvedCount / bucket.reviewedCount : 0,
    revertRate:
      bucket.appliedCount > 0 ? bucket.revertedCount / bucket.appliedCount : 0,
    greenLaneSuccessRate:
      bucket.greenLaneApplied > 0
        ? (bucket.greenLaneApplied - bucket.greenLaneReverted) / bucket.greenLaneApplied
        : 0,
    followUpSuccessRate:
      bucket.researchRunCount > 0 ? bucket.researchResolvedCount / bucket.researchRunCount : 0,
    changedCityCount: bucket.changedCities.size,
    claimTypePrecision: Array.from(bucket.claimTypePrecision.entries())
      .sort((left, right) => {
        const leftPrecision = left[1].reviewed > 0 ? left[1].accepted / left[1].reviewed : 0
        const rightPrecision = right[1].reviewed > 0 ? right[1].accepted / right[1].reviewed : 0
        return right[1].reviewed - left[1].reviewed || rightPrecision - leftPrecision || left[0].localeCompare(right[0])
      })
      .slice(0, 3)
      .map(([claimType, stats]) => {
        const precision = stats.reviewed > 0 ? Math.round((stats.accepted / stats.reviewed) * 100) : 0
        return `${claimType.toLowerCase().replaceAll('_', ' ')} ${precision}%`
      }),
    worseningDomains: Array.from(bucket.worseningDomains.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([domain]) => domain),
    falsePositiveCities: Array.from(bucket.falsePositiveCities.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([city]) => city),
    falsePositiveClaimTypes: Array.from(bucket.falsePositiveClaimTypes.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([claimType]) => claimType),
    revertCauses: Array.from(bucket.revertCauses.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([cause]) => cause),
    researchTaskResolution: Array.from(bucket.researchTaskResolution.entries())
      .sort((left, right) => right[1].resolved - left[1].resolved || right[1].total - left[1].total)
      .slice(0, 3)
      .map(([taskType, stats]) => {
        const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
        return `${taskType.toLowerCase().replaceAll('_', ' ')} ${resolutionRate}%`
      }),
    researchWasteDomains: Array.from(bucket.researchWasteDomains.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([domain]) => domain),
    stubbornClaimTypes: Array.from(bucket.stubbornClaimTypes.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([claimType]) => claimType),
    createdCount: bucket.createdCount,
    reviewedCount: bucket.reviewedCount,
    approvedCount: bucket.approvedCount,
    appliedCount: bucket.appliedCount,
    revertedCount: bucket.revertedCount,
    greenLaneCount: bucket.greenLaneCount,
    greenLaneApplied: bucket.greenLaneApplied,
    greenLaneReverted: bucket.greenLaneReverted,
    autoAppliedCount: bucket.autoAppliedCount,
    reviewRequiredCount: bucket.reviewRequiredCount,
    researchRunCount: bucket.researchRunCount,
    researchResolvedCount: bucket.researchResolvedCount,
    researchPendingCount: bucket.researchPendingCount,
  }))
}

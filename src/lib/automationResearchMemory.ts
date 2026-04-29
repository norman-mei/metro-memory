import { AutomationResearchMemoryKind, Prisma, PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/prisma'

type DbClient = PrismaClient | Prisma.TransactionClient

function collectMemoryStrings(value: unknown, output = new Set<string>()) {
  if (typeof value === 'string' && value.trim()) {
    output.add(value.trim())
    return output
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMemoryStrings(entry, output))
    return output
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectMemoryStrings(entry, output))
  }
  return output
}

export async function getResearchMemoryHints(
  input: {
    citySlug?: string
    domain?: string
  },
  db: DbClient = prisma,
) {
  const rows = await db.automationResearchMemory.findMany({
    where: {
      OR: [
        ...(input.citySlug ? [{ citySlug: input.citySlug }] : []),
        ...(input.domain ? [{ domain: input.domain }] : []),
      ],
    },
    orderBy: [{ trustScore: 'desc' }, { updatedAt: 'desc' }],
    take: 20,
  })

  return {
    recipes: rows.filter((row) => row.kind === AutomationResearchMemoryKind.DOMAIN_RECIPE),
    operatorSources: rows.filter((row) => row.kind === AutomationResearchMemoryKind.OPERATOR_SOURCE),
    aliases: rows.filter((row) => row.kind === AutomationResearchMemoryKind.CITY_ALIAS),
    historicalFacts: rows.filter((row) => row.kind === AutomationResearchMemoryKind.HISTORICAL_FACT),
  }
}

export async function rememberAutomationResearchMemory(
  input: {
    kind: AutomationResearchMemoryKind
    key: string
    citySlug?: string | null
    operatorKey?: string | null
    domain?: string | null
    valueJson?: Prisma.InputJsonValue | null
    trustScore?: number | null
  },
  db: DbClient = prisma,
) {
  return db.automationResearchMemory.upsert({
    where: {
      kind_key: {
        kind: input.kind,
        key: input.key,
      },
    },
    update: {
      citySlug: input.citySlug ?? undefined,
      operatorKey: input.operatorKey ?? undefined,
      domain: input.domain ?? undefined,
      valueJson: input.valueJson ?? undefined,
      trustScore: typeof input.trustScore === 'number' ? input.trustScore : undefined,
      lastSeenAt: new Date(),
    },
    create: {
      kind: input.kind,
      key: input.key,
      citySlug: input.citySlug ?? undefined,
      operatorKey: input.operatorKey ?? undefined,
      domain: input.domain ?? undefined,
      valueJson: input.valueJson ?? undefined,
      trustScore: typeof input.trustScore === 'number' ? input.trustScore : undefined,
      lastSeenAt: new Date(),
    },
  })
}

export async function rememberArtifactSourceForCity(
  input: {
    citySlug: string
    domain?: string | null
    sourceUrl?: string | null
    artifactType?: string | null
    title?: string | null
  },
  db: DbClient = prisma,
) {
  const domain = input.domain?.trim()
  if (!domain) return null

  return rememberAutomationResearchMemory(
    {
      kind: AutomationResearchMemoryKind.OPERATOR_SOURCE,
      key: `${input.citySlug}:${domain}`,
      citySlug: input.citySlug,
      domain,
      valueJson: {
        sourceUrl: input.sourceUrl || null,
        artifactType: input.artifactType || null,
        title: input.title || null,
      },
    },
    db,
  )
}

export async function getResearchMemoryPlannerContext(
  input: {
    citySlug: string
    candidateTitle?: string | null
    entityKey?: string | null
  },
  db: DbClient = prisma,
) {
  const hints = await getResearchMemoryHints({ citySlug: input.citySlug }, db)
  const aliases = hints.aliases.flatMap((row) =>
    Array.from(collectMemoryStrings(row.valueJson)).filter((value) => value.length <= 80),
  )
  const historicalKeywords = hints.historicalFacts.flatMap((row) =>
    Array.from(collectMemoryStrings(row.valueJson)).filter((value) => value.length <= 80),
  )
  const preferredDomains = Array.from(
    new Set(
      [
        ...hints.operatorSources.map((row) => row.domain || ''),
        ...hints.recipes.map((row) => row.domain || ''),
      ]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
  const preferredQueryFragments = hints.recipes.flatMap((row) => {
    const value = row.valueJson && typeof row.valueJson === 'object' ? row.valueJson : {}
    const queryTemplate =
      'queryTemplate' in value && typeof value.queryTemplate === 'string'
        ? value.queryTemplate.trim()
        : ''
    const keywords =
      'keywords' in value ? Array.from(collectMemoryStrings((value as Record<string, unknown>).keywords)) : []
    return [queryTemplate, ...keywords].filter((entry) => entry && entry.length <= 120)
  })

  const candidateHints = Array.from(
    new Set(
      historicalKeywords.filter((value) => {
        const lower = value.toLowerCase()
        if (input.candidateTitle && lower.includes(input.candidateTitle.toLowerCase())) return true
        if (input.entityKey && lower.includes(String(input.entityKey).toLowerCase())) return true
        return false
      }),
    ),
  )

  return {
    aliases: Array.from(new Set(aliases)).slice(0, 8),
    historicalKeywords: Array.from(new Set(historicalKeywords)).slice(0, 12),
    candidateHints: candidateHints.slice(0, 6),
    preferredDomains,
    preferredQueryFragments: Array.from(new Set(preferredQueryFragments)).slice(0, 8),
  }
}

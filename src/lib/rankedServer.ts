import { createHash } from 'node:crypto'

import { prisma } from '@/lib/prisma'
import {
  DEFAULT_RANKED_RULESET,
  type RankedRulesetId,
  fromPrismaRankedRuleset,
  fromPrismaRankedRunSource,
  toPrismaRankedRuleset,
} from '@/lib/ranked'
import { cities, getSlugFromLink, isCityDisabled } from '@/lib/citiesConfig'

type RankedCity = {
  slug: string
  name: string
  path: string
  continent: string
}

type PublicUser = {
  email?: string | null
}

const rankedCities: RankedCity[] = cities
  .filter((city) => !isCityDisabled(city))
  .map((city) => {
    const slug = getSlugFromLink(city.link)
    const path = city.link.startsWith('/') ? city.link : null
    if (!slug || !path) {
      return null
    }
    return {
      slug,
      name: city.name,
      path,
      continent: city.continent,
    } satisfies RankedCity
  })
  .filter((entry): entry is RankedCity => Boolean(entry))
  .sort((a, b) => a.slug.localeCompare(b.slug))

export function getRankedCities() {
  return rankedCities
}

export function findRankedCity(slug: string) {
  return rankedCities.find((city) => city.slug === slug) ?? null
}

export function getTodayDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

function getDeterministicIndex(dateKey: string, size: number) {
  const digest = createHash('sha256').update(dateKey).digest('hex').slice(0, 8)
  const numeric = Number.parseInt(digest, 16)
  return Number.isFinite(numeric) && size > 0 ? numeric % size : 0
}

export async function ensureDailyChallenge(dateKey = getTodayDateKey()) {
  const existing = await prisma.dailyChallenge.findUnique({
    where: { dateKey },
  })
  if (existing) {
    return existing
  }

  const city = rankedCities[getDeterministicIndex(dateKey, rankedCities.length)]
  const seed = createHash('sha256')
    .update(`daily:${dateKey}:${city.slug}:${DEFAULT_RANKED_RULESET}`)
    .digest('hex')
    .slice(0, 16)

  return prisma.dailyChallenge.create({
    data: {
      dateKey,
      citySlug: city.slug,
      cityPath: city.path,
      ruleset: toPrismaRankedRuleset(DEFAULT_RANKED_RULESET),
      seed,
    },
  })
}

export function buildPublicDisplayName(user: PublicUser) {
  const email = user.email?.trim().toLowerCase()
  if (!email) {
    return 'Metro Player'
  }
  const local = email.split('@')[0]?.replace(/[^a-z0-9]+/gi, ' ').trim()
  if (!local) {
    return 'Metro Player'
  }
  return local
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getRunAccuracy(run: {
  correctGuessCount: number
  wrongGuessCount: number
  repeatedGuessCount: number
}) {
  const totalAttempts =
    run.correctGuessCount + run.wrongGuessCount + run.repeatedGuessCount
  if (totalAttempts <= 0) {
    return 0
  }
  return run.correctGuessCount / totalAttempts
}

export function serializeLeaderboardRun(
  run: {
    id: string
    citySlug: string
    cityPath: string
    ruleset: string
    sourceType: string
    completionMs: number | null
    first50Ms: number | null
    correctGuessCount: number
    wrongGuessCount: number
    repeatedGuessCount: number
    hintCount: number
    revealUsed: boolean
    rankedEligible: boolean
    disqualificationReason: string | null
    createdAt: Date
    user: PublicUser
  },
) {
  return {
    id: run.id,
    citySlug: run.citySlug,
    cityPath: run.cityPath,
    ruleset: fromPrismaRankedRuleset(run.ruleset as any),
    sourceType: fromPrismaRankedRunSource(run.sourceType as any),
    completionMs: run.completionMs,
    first50Ms: run.first50Ms,
    accuracy: getRunAccuracy(run),
    hintCount: run.hintCount,
    revealUsed: run.revealUsed,
    rankedEligible: run.rankedEligible,
    disqualificationReason: run.disqualificationReason,
    createdAt: run.createdAt.toISOString(),
    playerName: buildPublicDisplayName(run.user),
  }
}

export async function getChallengeLeaderboardRows(params: {
  citySlug?: string
  ruleset?: RankedRulesetId
  dailyChallengeId?: string
  challengeId?: string
  battleId?: string
  limit?: number
}) {
  const limit = Math.max(1, Math.min(params.limit ?? 25, 100))
  const runs = await prisma.runSession.findMany({
    where: {
      status: 'COMPLETED',
      rankedEligible: true,
      completionMs: { not: null },
      ...(params.citySlug ? { citySlug: params.citySlug } : {}),
      ...(params.ruleset ? { ruleset: toPrismaRankedRuleset(params.ruleset) } : {}),
      ...(params.dailyChallengeId ? { dailyChallengeId: params.dailyChallengeId } : {}),
      ...(params.challengeId ? { challengeId: params.challengeId } : {}),
      ...(params.battleId ? { battleId: params.battleId } : {}),
    },
    orderBy: [{ completionMs: 'asc' }, { createdAt: 'asc' }],
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    take: limit * 6,
  })

  const bestByUser = new Map<string, (typeof runs)[number]>()
  for (const run of runs) {
    const existing = bestByUser.get(run.userId)
    if (!existing) {
      bestByUser.set(run.userId, run)
      continue
    }
    const existingCompletion = existing.completionMs ?? Number.MAX_SAFE_INTEGER
    const nextCompletion = run.completionMs ?? Number.MAX_SAFE_INTEGER
    if (nextCompletion < existingCompletion) {
      bestByUser.set(run.userId, run)
    }
  }

  return Array.from(bestByUser.values())
    .sort((a, b) => {
      const aMs = a.completionMs ?? Number.MAX_SAFE_INTEGER
      const bMs = b.completionMs ?? Number.MAX_SAFE_INTEGER
      if (aMs !== bMs) {
        return aMs - bMs
      }
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
    .slice(0, limit)
    .map((run, index) => ({
      rank: index + 1,
      ...serializeLeaderboardRun(run),
    }))
}

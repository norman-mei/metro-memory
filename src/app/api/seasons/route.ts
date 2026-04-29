import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { ensureCurrentSeason } from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'
import { fromPrismaRankedRuleset } from '@/lib/ranked'

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export async function GET() {
  const user = await getCurrentUser()
  const currentSeason = await ensureCurrentSeason()
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
    take: 6,
  })

  const progress = user
    ? await prisma.seasonProgress.findMany({
        where: { userId: user.id },
      })
    : []

  const progressBySeason = new Map(progress.map((entry) => [entry.seasonId, entry]))

  return NextResponse.json({
    currentSeasonId: currentSeason.id,
    seasons: seasons.map((season) => {
      const userProgress = progressBySeason.get(season.id)
      return {
        id: season.id,
        slug: season.slug,
        title: season.title,
        description: season.description,
        themeColor: season.themeColor,
        startDate: season.startDate.toISOString(),
        endDate: season.endDate.toISOString(),
        active: season.active,
        events: season.events.map((event) => ({
          slug: event.slug,
          title: event.title,
          description: event.description,
          eventType: event.eventType,
          citySlug: event.citySlug,
          cityPath: event.cityPath,
          ruleset: event.ruleset ? fromPrismaRankedRuleset(event.ruleset) : null,
          targetCount: event.targetCount,
          rewardXp: event.rewardXp,
        })),
        progress: user
          ? {
              seasonXp: userProgress?.seasonXp ?? 0,
              dailyParticipationCount: userProgress?.dailyParticipationCount ?? 0,
              battleWinCount: userProgress?.battleWinCount ?? 0,
              completedEventSlugs: normalizeStringArray(userProgress?.completedEventSlugs),
            }
          : null,
      }
    }),
  })
}

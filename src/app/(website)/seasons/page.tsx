import { Suspense } from 'react'

import SeasonCatalogBrowser from '@/components/SeasonCatalogBrowser'
import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import XpProgressCard from '@/components/XpProgressCard'
import { getCurrentUser } from '@/lib/auth'
import { ensureCurrentSeason } from '@/lib/liveOps'
import { prisma } from '@/lib/prisma'
import { formatRankedRuleset, fromPrismaRankedRuleset } from '@/lib/ranked'

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export const dynamic = 'force-dynamic'

export default async function SeasonsPage() {
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
  const seasonCards = seasons.map((season) => {
    const userProgress = progressBySeason.get(season.id)
    const completedEventSlugs = normalizeStringArray(userProgress?.completedEventSlugs)
    return {
      id: season.id,
      slug: season.slug,
      title: season.title,
      description: season.description ?? '',
      themeColor: season.themeColor,
      current: season.id === currentSeason.id,
      startDateMs: season.startDate.getTime(),
      startDateLabel: season.startDate.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      seasonXp: userProgress?.seasonXp ?? 0,
      completedEventCount: completedEventSlugs.length,
      eventCount: season.events.length,
      completed: completedEventSlugs.length === season.events.length && season.events.length > 0,
      events: season.events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description ?? '',
        rewardXp: event.rewardXp,
        completed: completedEventSlugs.includes(event.slug),
        rulesetLabel: event.ruleset
          ? formatRankedRuleset(fromPrismaRankedRuleset(event.ruleset))
          : null,
        citySlug: event.citySlug,
      })),
    }
  })
  const currentSeasonProgress = progressBySeason.get(currentSeason.id)
  const currentSeasonCompletedEvents = normalizeStringArray(
    currentSeasonProgress?.completedEventSlugs,
  )
  const currentSeasonTargetXp = Math.max(
    1,
    currentSeason.events.reduce((total, event) => total + event.rewardXp, 0),
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Seasonal Events
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Monthly live ops
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Seasons reset monthly. Lifetime XP, licenses, and playlists persist.
          </p>
        </div>

        <XpProgressCard
          eyebrow="Season XP"
          title={user ? currentSeason.title : 'Current season progression'}
          description={
            user
              ? `${(currentSeasonProgress?.seasonXp ?? 0).toLocaleString()} XP earned this month. ${currentSeasonCompletedEvents.length} / ${currentSeason.events.length} events complete.`
              : 'Sign in to track your monthly season XP and event completion.'
          }
          valueLabel={
            user
              ? `${Math.min(currentSeasonProgress?.seasonXp ?? 0, currentSeasonTargetXp).toLocaleString()} / ${currentSeasonTargetXp.toLocaleString()}`
              : 'Sign in required'
          }
          progress={
            user
              ? Math.min((currentSeasonProgress?.seasonXp ?? 0) / currentSeasonTargetXp, 1)
              : 0
          }
          disabled={!user}
        />

        <SeasonCatalogBrowser seasons={seasonCards} hasUser={Boolean(user)} />
      </div>
    </div>
  )
}

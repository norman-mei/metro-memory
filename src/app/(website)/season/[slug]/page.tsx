import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Container } from '@/components/Container'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRankedRuleset, fromPrismaRankedRuleset } from '@/lib/ranked'
import { getXpRewardColor } from '@/lib/xpColors'

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value.filter((entry): entry is string => typeof entry === 'string')
}

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function SeasonPage({ params }: PageProps) {
  const { slug } = await params
  const user = await getCurrentUser()
  const season = await prisma.season.findUnique({
    where: { slug },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!season) {
    notFound()
  }

  const progress = user
    ? await prisma.seasonProgress.findUnique({
        where: {
          userId_seasonId: {
            userId: user.id,
            seasonId: season.id,
          },
        },
      })
    : null
  const completedEventSlugs = normalizeStringArray(progress?.completedEventSlugs)

  return (
    <Container>
      <div className="mx-auto max-w-4xl space-y-8 py-12">
        <div className="space-y-4">
          <Link href="/seasons" className="text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400">
            Back to seasons
          </Link>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: season.themeColor ?? 'var(--accent-600)' }}>
              Season
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">{season.title}</h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400">{season.description}</p>
            {user ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {progress?.seasonXp ?? 0} season XP • {completedEventSlugs.length}/{season.events.length} events complete
              </p>
            ) : null}
          </div>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Season events</h2>
          <div className="mt-4 space-y-3">
            {season.events.map((event) => (
              <div
                key={event.id}
                className={`rounded-2xl border px-4 py-3 ${completedEventSlugs.includes(event.slug) ? 'border-[var(--accent-600)] bg-[var(--accent-50)] dark:bg-[rgba(255,255,255,0.03)]' : 'border-zinc-100 dark:border-zinc-800'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{event.title}</h3>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: getXpRewardColor(event.rewardXp) }}
                  >
                    +{event.rewardXp} XP
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{event.description}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Target: {event.targetCount}</span>
                  {event.ruleset ? <span>Ruleset: {formatRankedRuleset(fromPrismaRankedRuleset(event.ruleset))}</span> : null}
                  {event.citySlug ? <span>City: {event.citySlug}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Container>
  )
}

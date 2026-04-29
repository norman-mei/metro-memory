import Link from 'next/link'
import { Suspense } from 'react'

import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import { buildRankedHref, formatRankedRuleset } from '@/lib/ranked'
import { buildPublicDisplayName } from '@/lib/rankedServer'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function ChallengesPage() {
  const challenges = await prisma.challengeDefinition.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      creator: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Challenge Runs
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Shared ranked seeds
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Challenges pin a city, ruleset, and seed into one shareable ranked run.
          </p>
        </div>

        <div className="grid gap-4">
          {challenges.length > 0 ? (
            challenges.map((challenge) => {
              const ruleset = challenge.ruleset.toLowerCase().replace(/_/g, '-') as Parameters<
                typeof formatRankedRuleset
              >[0]
              return (
                <article
                  key={challenge.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        <span>{formatRankedRuleset(ruleset)}</span>
                        <span>&#8226;</span>
                        <span>{challenge.citySlug}</span>
                      </div>
                      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        <Link href={`/challenge/${challenge.slug}`} className="hover:underline">
                          {challenge.title}
                        </Link>
                      </h2>
                      {challenge.description ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {challenge.description}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Created by{' '}
                        {challenge.creator
                          ? buildPublicDisplayName(challenge.creator)
                          : 'Metro Memory'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/challenge/${challenge.slug}`}
                        className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        View
                      </Link>
                      <Link
                        href={buildRankedHref(challenge.cityPath, {
                          source: 'challenge',
                          ruleset,
                          seed: challenge.seed,
                          challengeId: challenge.id,
                        })}
                        className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Play
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              No public challenges yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

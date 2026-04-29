import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Container } from '@/components/Container'
import {
  buildRankedHref,
  formatDuration,
  formatPercent,
  formatRankedRuleset,
} from '@/lib/ranked'
import { buildPublicDisplayName, getChallengeLeaderboardRows } from '@/lib/rankedServer'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function ChallengePage({ params }: PageProps) {
  const { slug } = await params
  const challenge = await prisma.challengeDefinition.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  })

  if (!challenge || !challenge.active) {
    notFound()
  }

  const leaderboard = await getChallengeLeaderboardRows({
    challengeId: challenge.id,
    limit: 25,
  })
  const ruleset = challenge.ruleset.toLowerCase().replace(/_/g, '-') as Parameters<
    typeof formatRankedRuleset
  >[0]

  return (
    <Container>
      <div className="mx-auto max-w-4xl space-y-8 py-12">
        <div className="space-y-4">
          <Link href="/challenges" className="text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400">
            Back to challenges
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              <span>{formatRankedRuleset(ruleset)}</span>
              <span>•</span>
              <span>{challenge.citySlug}</span>
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              {challenge.title}
            </h1>
            {challenge.description ? (
              <p className="text-base text-zinc-600 dark:text-zinc-400">
                {challenge.description}
              </p>
            ) : null}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Created by{' '}
              {challenge.creator
                ? buildPublicDisplayName(challenge.creator)
                : 'Metro Memory'}
            </p>
          </div>
          <Link
            href={buildRankedHref(challenge.cityPath, {
              source: 'challenge',
              ruleset,
              seed: challenge.seed,
              challengeId: challenge.id,
            })}
            className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Play ranked challenge
          </Link>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Leaderboard</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Accuracy</th>
                  <th className="py-2 pr-4">First 50</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        #{entry.rank}
                      </td>
                      <td className="py-3 pr-4">{entry.playerName}</td>
                      <td className="py-3 pr-4">{formatDuration(entry.completionMs)}</td>
                      <td className="py-3 pr-4">{formatPercent(entry.accuracy)}</td>
                      <td className="py-3 pr-4">{formatDuration(entry.first50Ms)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-zinc-500 dark:text-zinc-400">
                      No ranked completions yet for this challenge.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Container>
  )
}

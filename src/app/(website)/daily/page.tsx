import Link from 'next/link'
import { Suspense } from 'react'

import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import {
  buildRankedHref,
  formatDuration,
  formatPercent,
  formatRankedRuleset,
} from '@/lib/ranked'
import { ensureDailyChallenge, getChallengeLeaderboardRows } from '@/lib/rankedServer'

export const dynamic = 'force-dynamic'

export default async function DailyChallengePage() {
  const daily = await ensureDailyChallenge()
  const leaderboard = await getChallengeLeaderboardRows({
    dailyChallengeId: daily.id,
    limit: 25,
  })
  const ruleset = daily.ruleset.toLowerCase().replace(/_/g, '-') as Parameters<
    typeof formatRankedRuleset
  >[0]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Daily Challenge
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            {daily.citySlug}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Everyone gets the same city and seed each UTC day. The first unrevealed ranked run is
            the only attempt that can place.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span>Date: {daily.dateKey}</span>
            <span>Ruleset: {formatRankedRuleset(ruleset)}</span>
          </div>
          <Link
            href={buildRankedHref(daily.cityPath, {
              source: 'daily',
              ruleset,
              seed: daily.seed,
              dailyChallengeId: daily.id,
            })}
            className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Play today&apos;s challenge
          </Link>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Today&apos;s leaderboard
          </h2>
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
                      No ranked completions yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

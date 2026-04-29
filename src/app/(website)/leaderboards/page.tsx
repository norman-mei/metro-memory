import Link from 'next/link'
import { Suspense } from 'react'

import LeaderboardCityPicker from '@/components/LeaderboardCityPicker'
import StandaloneSidebarNav from '@/components/StandaloneSidebarNav'
import {
  buildRankedHref,
  formatDuration,
  formatPercent,
  formatRankedRuleset,
  parseRankedRuleset,
} from '@/lib/ranked'
import {
  findRankedCity,
  getChallengeLeaderboardRows,
  getRankedCities,
} from '@/lib/rankedServer'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<{
    city?: string
    ruleset?: string
  }>
}

export default async function LeaderboardsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedCity = params.city ? findRankedCity(params.city) : null
  const selectedRuleset = params.ruleset ? parseRankedRuleset(params.ruleset) : undefined
  const leaderboard = await getChallengeLeaderboardRows({
    citySlug: selectedCity?.slug,
    ruleset: selectedRuleset,
    limit: 25,
  })
  const cities = getRankedCities()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pl-24">
      <Suspense fallback={null}>
        <StandaloneSidebarNav />
      </Suspense>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Leaderboards
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            {selectedCity ? selectedCity.name : 'Global best ranked runs'}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Ranked boards only include signed-in runs that never used answer reveal or map-name
            assists.
          </p>
          {selectedCity ? (
            <Link
              href={buildRankedHref(selectedCity.path, {
                source: 'free-play',
                ruleset: selectedRuleset ?? 'classic',
              })}
              className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Play this city ranked
            </Link>
          ) : null}
        </div>

        <LeaderboardCityPicker
          cities={cities}
          selectedCitySlug={selectedCity?.slug ?? null}
          selectedRuleset={selectedRuleset ?? null}
        />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedRuleset ? formatRankedRuleset(selectedRuleset) : 'All ranked rulesets'}
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 pr-4">City</th>
                  <th className="py-2 pr-4">Ruleset</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry) => {
                    const city = findRankedCity(entry.citySlug)
                    return (
                      <tr key={entry.id}>
                        <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                          #{entry.rank}
                        </td>
                        <td className="py-3 pr-4">{entry.playerName}</td>
                        <td className="py-3 pr-4">
                          {city ? (
                            <Link
                              href={`/leaderboards?city=${city.slug}`}
                              className="hover:underline"
                            >
                              {city.name}
                            </Link>
                          ) : (
                            entry.citySlug
                          )}
                        </td>
                        <td className="py-3 pr-4">{formatRankedRuleset(entry.ruleset)}</td>
                        <td className="py-3 pr-4">{formatDuration(entry.completionMs)}</td>
                        <td className="py-3 pr-4">{formatPercent(entry.accuracy)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-zinc-500 dark:text-zinc-400">
                      No ranked completions yet for this board.
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

import Link from 'next/link'

import { getCurrentUser } from '@/lib/auth'
import { getAnalyticsSnapshot, getProgressionSnapshot } from '@/lib/progression'
import { formatDuration, formatPercent } from '@/lib/ranked'

export default async function CompetitiveOverview() {
  const user = await getCurrentUser()
  if (!user) {
    return null
  }

  const [progression, analytics] = await Promise.all([
    getProgressionSnapshot(user.id),
    getAnalyticsSnapshot(user.id),
  ])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Career
          </p>
          <h2 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Level {progression.career.level}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {progression.career.lifetimeXp.toLocaleString()} XP total. {progression.career.xpIntoLevel.toLocaleString()} /{' '}
            {progression.career.xpForNextLevel.toLocaleString()} into this level.
          </p>
        </article>
        <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Streak
          </p>
          <h2 className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {progression.streak.current} days
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Best streak: {progression.streak.best} days. Freeze tokens: {progression.streak.freezeTokens}.
          </p>
        </article>
        <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Current Season
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {progression.currentSeason.title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {progression.currentSeason.progress.seasonXp.toLocaleString()} season XP,{' '}
            {progression.currentSeason.progress.completedEventSlugs.length} / {progression.currentSeason.events.length} events complete.
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
                Recent XP
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Progression ledger
              </h2>
            </div>
            <Link href="/seasons" className="text-sm font-semibold text-zinc-500 hover:underline dark:text-zinc-400">
              View seasons
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {progression.recentXp.length > 0 ? (
              progression.recentXp.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{entry.summary}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(entry.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>
                  </div>
                  <div className="text-sm font-semibold text-[var(--accent-600)]">+{entry.amount} XP</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No XP events recorded yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Analytics
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Competitive summary
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Ranked clears</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{analytics.totals.rankedClears}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Disqualified runs</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{analytics.totals.disqualifiedRuns}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Reveal disqualifications</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{analytics.totals.revealDisqualifications}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">Battle record</dt>
              <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                {analytics.totals.battleWins}-{analytics.totals.battleLosses}-{analytics.totals.noContestBattles}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top cities</h3>
            <div className="mt-3 space-y-2">
              {analytics.cityBreakdown.slice(0, 5).map((entry) => (
                <div key={entry.citySlug} className="rounded-2xl border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{entry.cityName}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{entry.clears} clears</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Best {formatDuration(entry.bestMs)}</span>
                    <span>{formatPercent(entry.averageAccuracy)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Campaigns</h2>
            <Link href="/campaigns" className="text-sm font-semibold text-zinc-500 hover:underline dark:text-zinc-400">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {progression.campaigns.slice(0, 4).map((campaign) => (
              <div key={campaign.slug} className="rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/campaign/${campaign.slug}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                    {campaign.title}
                  </Link>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {campaign.progressCount}/{campaign.totalCities}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{campaign.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Licenses & badges</h2>
            <Link href="/leaderboards" className="text-sm font-semibold text-zinc-500 hover:underline dark:text-zinc-400">
              Leaderboards
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {progression.licenses.slice(0, 4).map((entry) => (
              <div key={entry.key} className="rounded-2xl border border-zinc-100 px-4 py-3 text-sm dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{entry.title}</p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">{entry.description}</p>
              </div>
            ))}
            {progression.badges.slice(0, 4).map((entry) => (
              <div key={entry.key} className="rounded-2xl border border-zinc-100 px-4 py-3 text-sm dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{entry.title}</p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">{entry.description}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

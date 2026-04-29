import Link from 'next/link'
import { notFound } from 'next/navigation'

import BattleActions from '@/app/(website)/battle/[slug]/BattleActions'
import { Container } from '@/components/Container'
import { getCurrentUser } from '@/lib/auth'
import { getBattleSnapshotBySlug } from '@/lib/battles'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function BattlePage({ params }: PageProps) {
  const user = await getCurrentUser()
  const { slug } = await params
  const battle = await getBattleSnapshotBySlug(slug)

  if (!battle) {
    notFound()
  }

  const viewerWon = user && battle.winnerUserId === user.id

  return (
    <Container>
      <div className="mx-auto max-w-4xl space-y-8 py-12">
        <div className="space-y-4">
          <Link href="/battles/new" className="text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400">
            Back to battle creator
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
              <span>{battle.status}</span>
              <span>•</span>
              <span>{battle.citySlug}</span>
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              {battle.creator.name} vs {battle.opponent?.name ?? 'Open invite'}
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400">
              Share this link to invite an opponent. Battle attempts are ranked-only and answer reveals disqualify the run.
            </p>
          </div>
          <BattleActions battle={battle} currentUserId={user?.id ?? null} />
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            Invite link: <span className="font-mono">{`/battle/${battle.slug}`}</span>
          </div>
          {battle.winnerUserId ? (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${viewerWon ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>
              Winner: {battle.winnerUserId === battle.creator.id ? battle.creator.name : battle.opponent?.name ?? 'Opponent'}
            </div>
          ) : null}
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Creator
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{battle.creator.name}</h2>
            {battle.creatorSession ? (
              <div className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <p>Status: {battle.creatorSession.status}</p>
                <p>Time: {battle.creatorSession.completionLabel}</p>
                <p>Accuracy: {battle.creatorSession.accuracy}</p>
                <p>Hints: {battle.creatorSession.hintCount}</p>
                {!battle.creatorSession.rankedEligible ? (
                  <p>Result: practice only ({battle.creatorSession.disqualificationReason})</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No attempt recorded yet.</p>
            )}
          </article>

          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              Opponent
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {battle.opponent?.name ?? 'Waiting for join'}
            </h2>
            {battle.opponentSession ? (
              <div className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <p>Status: {battle.opponentSession.status}</p>
                <p>Time: {battle.opponentSession.completionLabel}</p>
                <p>Accuracy: {battle.opponentSession.accuracy}</p>
                <p>Hints: {battle.opponentSession.hintCount}</p>
                {!battle.opponentSession.rankedEligible ? (
                  <p>Result: practice only ({battle.opponentSession.disqualificationReason})</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No attempt recorded yet.</p>
            )}
          </article>
        </section>
      </div>
    </Container>
  )
}

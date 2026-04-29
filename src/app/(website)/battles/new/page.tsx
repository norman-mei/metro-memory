import Link from 'next/link'

import BattleCreateForm from '@/app/(website)/battles/BattleCreateForm'
import { Container } from '@/components/Container'
import { getCurrentUser } from '@/lib/auth'
import { getRankedCities } from '@/lib/rankedServer'

export const dynamic = 'force-dynamic'

export default async function NewBattlePage() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <Container>
        <div className="mx-auto max-w-3xl space-y-4 py-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">Create a battle</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Sign in to create invite-only async battles.
          </p>
          <Link href="/account" className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            Open account
          </Link>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="mx-auto max-w-3xl space-y-8 py-12">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Async Battles
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Create a share-link battle
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Both players race the same city, ruleset, and seed. Reveals and map-name assists forfeit competitiveness.
          </p>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <BattleCreateForm cities={getRankedCities().map((city) => ({ slug: city.slug, name: city.name }))} />
        </section>
      </div>
    </Container>
  )
}

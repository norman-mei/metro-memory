import { Container } from '@/components/Container'
import { getCurrentUser } from '@/lib/auth'
import PlaylistManager from '@/app/(website)/playlists/PlaylistManager'
import { getProgressionSnapshot } from '@/lib/progression'
import { getRankedCities } from '@/lib/rankedServer'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PlaylistsPage() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <Container>
        <div className="mx-auto max-w-3xl space-y-4 py-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">Playlists</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Sign in to save private city playlists and launch sequential runs.
          </p>
          <Link href="/account" className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            Open account
          </Link>
        </div>
      </Container>
    )
  }

  const progression = await getProgressionSnapshot(user.id)
  const cities = getRankedCities().map((city) => ({
    slug: city.slug,
    name: city.name,
  }))

  return (
    <Container>
      <div className="mx-auto max-w-5xl space-y-8 py-12">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            Playlists
          </p>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
            Queue city tours
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Save private playlists, then launch them as casual tours or ranked progression runs.
          </p>
        </div>
        <PlaylistManager cities={cities} playlists={progression.playlists} />
      </div>
    </Container>
  )
}

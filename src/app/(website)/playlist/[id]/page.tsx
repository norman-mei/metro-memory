import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Container } from '@/components/Container'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function PlaylistPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user) {
    notFound()
  }
  const { id } = await params
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { orderIndex: 'asc' },
      },
      runs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!playlist || playlist.userId !== user.id) {
    notFound()
  }

  return (
    <Container>
      <div className="mx-auto max-w-4xl space-y-8 py-12">
        <div className="space-y-4">
          <Link href="/playlists" className="text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400">
            Back to playlists
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">{playlist.name}</h1>
            {playlist.description ? (
              <p className="text-base text-zinc-600 dark:text-zinc-400">{playlist.description}</p>
            ) : null}
          </div>
        </div>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Legs</h2>
          <div className="mt-4 grid gap-3">
            {playlist.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Leg {item.orderIndex + 1}
                </p>
                <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{item.citySlug}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Run history</h2>
          <div className="mt-4 space-y-3">
            {playlist.runs.length > 0 ? (
              playlist.runs.map((run) => (
                <div key={run.id} className="rounded-2xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>{run.mode.toLowerCase().replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>{run.completedLegs}/{run.totalLegs} legs</span>
                    <span>•</span>
                    <span>{run.status.toLowerCase()}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No runs yet.</p>
            )}
          </div>
        </section>
      </div>
    </Container>
  )
}

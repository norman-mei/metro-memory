'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { RANKED_RULESETS, formatRankedRuleset } from '@/lib/ranked'

type PlaylistSummary = {
  id: string
  name: string
  description?: string | null
  items: Array<{
    citySlug: string
    cityPath: string
    orderIndex: number
  }>
  runs: Array<{
    id: string
    mode: string
    status: string
    completedLegs: number
    totalLegs: number
    aggregateCompletionMs: number
    aggregateAccuracy: number
    createdAt: string
  }>
}

export default function PlaylistManager({
  cities,
  playlists,
}: {
  cities: Array<{ slug: string; name: string }>
  playlists: PlaylistSummary[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCitySlugs, setSelectedCitySlugs] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [rulesetByPlaylist, setRulesetByPlaylist] = useState<Record<string, string>>({})

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)

    const response = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        citySlugs: selectedCitySlugs,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to create playlist.')
      return
    }
    setName('')
    setDescription('')
    setSelectedCitySlugs([])
    setStatus('Playlist created.')
    startTransition(() => {
      router.refresh()
    })
  }

  const launchPlaylist = async (playlistId: string, mode: 'casual' | 'ranked-classic' | 'ranked-ruleset') => {
    setStatus(null)
    const response = await fetch(`/api/playlists/${playlistId}/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        ruleset: rulesetByPlaylist[playlistId] ?? 'strict-spelling',
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to launch playlist.')
      return
    }
    if (payload?.run?.href) {
      router.push(payload.run.href)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-600)]">
            New playlist
          </p>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Save a city tour
          </h2>
        </div>
        <form className="mt-4 space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Playlist name"
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cities
            <select
              multiple
              value={selectedCitySlugs}
              onChange={(event) =>
                setSelectedCitySlugs(Array.from(event.target.selectedOptions).map((option) => option.value))
              }
              className="mt-2 h-56 w-full rounded-2xl border border-zinc-300 px-3 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || selectedCitySlugs.length === 0}
              className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create playlist
            </button>
            {status ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p> : null}
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        {playlists.length > 0 ? (
          playlists.map((playlist) => (
            <article
              key={playlist.id}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{playlist.name}</h2>
                  {playlist.description ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{playlist.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {playlist.items.map((item) => (
                      <span key={`${playlist.id}-${item.citySlug}-${item.orderIndex}`} className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
                        {item.orderIndex + 1}. {item.citySlug}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <select
                    value={rulesetByPlaylist[playlist.id] ?? 'strict-spelling'}
                    onChange={(event) =>
                      setRulesetByPlaylist((prev) => ({
                        ...prev,
                        [playlist.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {RANKED_RULESETS.map((ruleset) => (
                      <option key={ruleset} value={ruleset}>
                        {formatRankedRuleset(ruleset)}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => launchPlaylist(playlist.id, 'casual')}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Casual
                    </button>
                    <button
                      type="button"
                      onClick={() => launchPlaylist(playlist.id, 'ranked-classic')}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Ranked classic
                    </button>
                    <button
                      type="button"
                      onClick={() => launchPlaylist(playlist.id, 'ranked-ruleset')}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Ranked ruleset
                    </button>
                  </div>
                </div>
              </div>
              {playlist.runs.length > 0 ? (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent runs</p>
                  <div className="mt-2 space-y-2">
                    {playlist.runs.map((run) => (
                      <div key={run.id} className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                        <span>{run.mode.toLowerCase().replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{run.completedLegs}/{run.totalLegs} legs</span>
                        <span>•</span>
                        <span>{run.status.toLowerCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No playlists yet.
          </div>
        )}
      </section>
    </div>
  )
}

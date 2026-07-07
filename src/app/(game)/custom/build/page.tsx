'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'
import {
  countSelectedLines,
  encodeWorldSelection,
  type WorldMapSelection,
} from '@/lib/customWorldMapSelection'

type CityLine = { id: string; name: string; color: string; order: number }

const prettifyCityName = (slug: string): string =>
  slug
    .split('-')
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(' ')

const ALL_CITIES = Array.from(AVAILABLE_CITY_SLUGS)
  .map((slug) => ({ slug, name: prettifyCityName(slug) }))
  .sort((a, b) => a.name.localeCompare(b.name))

export default function CustomWorldMapBuilder() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [title, setTitle] = useState('My World Map')
  // Selected line ids per city, in insertion order of cities.
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  const [addedCities, setAddedCities] = useState<string[]>([])
  const [cityLines, setCityLines] = useState<Record<string, CityLine[]>>({})
  const [loadingCity, setLoadingCity] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)

  const filteredCities = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return ALL_CITIES
    return ALL_CITIES.filter(
      (city) => city.name.toLowerCase().includes(query) || city.slug.includes(query),
    )
  }, [search])

  const loadCity = useCallback(
    async (slug: string) => {
      if (cityLines[slug]) return
      setLoadingCity(slug)
      try {
        const response = await fetch(`/api/custom/city-lines/${slug}`)
        if (!response.ok) return
        const data = await response.json()
        setCityLines((prev) => ({ ...prev, [slug]: data.lines ?? [] }))
      } catch {
        // ignore — city stays without lines and can be re-added
      } finally {
        setLoadingCity((current) => (current === slug ? null : current))
      }
    },
    [cityLines],
  )

  const addCity = useCallback(
    (slug: string) => {
      setAddedCities((prev) => (prev.includes(slug) ? prev : [...prev, slug]))
      void loadCity(slug)
    },
    [loadCity],
  )

  const removeCity = useCallback((slug: string) => {
    setAddedCities((prev) => prev.filter((entry) => entry !== slug))
    setSelected((prev) => {
      const next = { ...prev }
      delete next[slug]
      return next
    })
  }, [])

  const toggleLine = useCallback((slug: string, lineId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[slug] ?? [])
      if (next.has(lineId)) next.delete(lineId)
      else next.add(lineId)
      return { ...prev, [slug]: next }
    })
  }, [])

  const setCitySelection = useCallback(
    (slug: string, lineIds: string[], shouldSelect: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev[slug] ?? [])
        lineIds.forEach((id) => (shouldSelect ? next.add(id) : next.delete(id)))
        return { ...prev, [slug]: next }
      })
    },
    [],
  )

  const selection: WorldMapSelection = useMemo(
    () =>
      addedCities
        .map((city) => ({ city, lines: Array.from(selected[city] ?? []) }))
        .filter((entry) => entry.lines.length > 0),
    [addedCities, selected],
  )

  const totalSelected = countSelectedLines(selection)

  const handlePlay = useCallback(() => {
    if (totalSelected === 0) return
    setLaunching(true)
    const sel = encodeWorldSelection(selection)
    const params = new URLSearchParams({ world: '1', sel, title: title.trim() || 'My World Map' })
    router.push(`/custom?${params.toString()}`)
  }, [router, selection, title, totalSelected])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Custom World Map
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Mix lines from any cities around the world into a single map, then test how many
          stations you can name across all of them.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Add cities
          </label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cities"
            className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[var(--accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <div className="max-h-[52vh] overflow-y-auto pr-1">
            <ul className="space-y-1">
              {filteredCities.map((city) => {
                const isAdded = addedCities.includes(city.slug)
                return (
                  <li key={city.slug}>
                    <button
                      type="button"
                      onClick={() => (isAdded ? removeCity(city.slug) : addCity(city.slug))}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                        isAdded
                          ? 'bg-[var(--accent-600)] text-white'
                          : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="truncate">{city.name}</span>
                      <span className="ml-2 shrink-0 text-xs opacity-80">
                        {isAdded ? 'Remove' : 'Add'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Selected lines
          </label>
          {addedCities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Add a city on the left to choose its lines.
            </div>
          ) : (
            <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
              {addedCities.map((slug) => {
                const lines = cityLines[slug]
                const citySelected = selected[slug] ?? new Set<string>()
                return (
                  <div
                    key={slug}
                    className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {prettifyCityName(slug)}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {citySelected.size}/{lines?.length ?? 0} lines
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {lines && lines.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCitySelection(slug, lines.map((l) => l.id), true)}
                              className="rounded-full border border-zinc-300 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => setCitySelection(slug, lines.map((l) => l.id), false)}
                              className="rounded-full border border-zinc-300 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              None
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCity(slug)}
                          className="rounded-full border border-zinc-300 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {!lines ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {loadingCity === slug ? 'Loading lines…' : 'No line data.'}
                      </p>
                    ) : (
                      <div className="grid gap-1 sm:grid-cols-2">
                        {lines.map((line) => (
                          <label
                            key={line.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                          >
                            <input
                              type="checkbox"
                              checked={citySelected.has(line.id)}
                              onChange={() => toggleLine(slug, line.id)}
                              className="h-4 w-4 rounded border-zinc-300 text-[var(--accent-600)] focus:ring-[var(--accent-500)]"
                            />
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: line.color }}
                            />
                            <span className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                              {line.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:flex-row sm:items-center">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Map title"
          className="w-full flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 focus:border-[var(--accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <span className="shrink-0 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {totalSelected} line{totalSelected === 1 ? '' : 's'} selected
        </span>
        <button
          type="button"
          onClick={handlePlay}
          disabled={totalSelected === 0 || launching}
          className="shrink-0 rounded-xl bg-[var(--accent-600)] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--accent-700)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {launching ? 'Loading…' : 'Play World Map'}
        </button>
      </div>
    </div>
  )
}

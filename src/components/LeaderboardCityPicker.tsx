'use client'

import classNames from 'classnames'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MdCheck,
  MdExpandMore,
  MdHistory,
  MdLanguage,
  MdPublic,
  MdSearch,
  MdShuffle,
  MdSortByAlpha,
} from 'react-icons/md'

import { getCityFlagEmojiFromPath } from '@/lib/countryFlags'
import { readLastPlayedCities } from '@/lib/lastPlayedCities'

type LeaderboardCity = {
  slug: string
  name: string
  path: string
  continent: string
}

type SortMode =
  | 'name-asc'
  | 'name-desc'
  | 'country-asc'
  | 'country-desc'
  | 'last-played'

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'name-asc', label: 'City A-Z' },
  { value: 'name-desc', label: 'City Z-A' },
  { value: 'country-asc', label: 'Country A-Z' },
  { value: 'country-desc', label: 'Country Z-A' },
  { value: 'last-played', label: 'Last played' },
]

function getCityFlagEmoji(city: LeaderboardCity) {
  return getCityFlagEmojiFromPath(city.path)
}

function getCountryLabel(city: LeaderboardCity) {
  const segments = city.name.split(',').map((segment) => segment.trim()).filter(Boolean)
  if (segments.length > 1) {
    return segments[segments.length - 1]
  }
  return city.continent
}

function getBoardMetaLabel(city: LeaderboardCity) {
  const segments = city.name.split(',').map((segment) => segment.trim()).filter(Boolean)
  if (segments.length > 1) {
    return null
  }
  return city.continent
}

function buildLeaderboardHref(citySlug: string | null, ruleset?: string | null) {
  const params = new URLSearchParams()
  if (citySlug) {
    params.set('city', citySlug)
  }
  if (ruleset) {
    params.set('ruleset', ruleset)
  }
  const query = params.toString()
  return query ? `/leaderboards?${query}` : '/leaderboards'
}

export default function LeaderboardCityPicker({
  cities,
  selectedCitySlug,
  selectedRuleset,
}: {
  cities: LeaderboardCity[]
  selectedCitySlug?: string | null
  selectedRuleset?: string | null
}) {
  const router = useRouter()
  const boardMenuRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [selectedSlug, setSelectedSlug] = useState(selectedCitySlug ?? '')
  const [boardMenuOpen, setBoardMenuOpen] = useState(false)
  const [lastPlayedSlugs, setLastPlayedSlugs] = useState<string[]>([])

  useEffect(() => {
    setSelectedSlug(selectedCitySlug ?? '')
  }, [selectedCitySlug])

  useEffect(() => {
    setLastPlayedSlugs(readLastPlayedCities().map((entry) => entry.slug))
  }, [])

  useEffect(() => {
    if (!boardMenuOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!boardMenuRef.current?.contains(event.target as Node)) {
        setBoardMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [boardMenuOpen])

  const lastPlayedLookup = useMemo(
    () => new Map(lastPlayedSlugs.map((slug, index) => [slug, index])),
    [lastPlayedSlugs],
  )

  const filteredCities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const nextCities =
      normalizedQuery.length > 0
        ? cities.filter((city) => {
            const country = getCountryLabel(city).toLowerCase()
            return (
              city.name.toLowerCase().includes(normalizedQuery) ||
              city.slug.toLowerCase().includes(normalizedQuery) ||
              city.continent.toLowerCase().includes(normalizedQuery) ||
              country.includes(normalizedQuery)
            )
          })
        : [...cities]

    nextCities.sort((left, right) => {
      if (sortMode === 'last-played') {
        const leftRank = lastPlayedLookup.get(left.slug) ?? Number.POSITIVE_INFINITY
        const rightRank = lastPlayedLookup.get(right.slug) ?? Number.POSITIVE_INFINITY
        if (leftRank !== rightRank) {
          return leftRank - rightRank
        }
      }

      if (sortMode === 'country-asc' || sortMode === 'country-desc') {
        const countryCompare = getCountryLabel(left).localeCompare(getCountryLabel(right))
        if (countryCompare !== 0) {
          return sortMode === 'country-asc' ? countryCompare : -countryCompare
        }
      }

      const nameCompare = left.name.localeCompare(right.name)
      return sortMode === 'name-desc' ? -nameCompare : nameCompare
    })

    return nextCities
  }, [cities, lastPlayedLookup, query, sortMode])

  const lastPlayedCity = useMemo(() => {
    if (lastPlayedSlugs.length === 0) {
      return null
    }
    return cities.find((city) => city.slug === lastPlayedSlugs[0]) ?? null
  }, [cities, lastPlayedSlugs])

  const activeCity = useMemo(
    () => cities.find((city) => city.slug === selectedCitySlug) ?? null,
    [cities, selectedCitySlug],
  )

  const handleNavigate = (citySlug: string | null) => {
    router.push(buildLeaderboardHref(citySlug, selectedRuleset))
  }

  const handleRandomBoard = () => {
    const source = filteredCities.length > 0 ? filteredCities : cities
    if (source.length === 0) {
      return
    }
    const randomCity = source[Math.floor(Math.random() * source.length)]
    setSelectedSlug(randomCity.slug)
    setBoardMenuOpen(false)
    handleNavigate(randomCity.slug)
  }

  const handleChooseBoard = (citySlug: string | null) => {
    setSelectedSlug(citySlug ?? '')
    setBoardMenuOpen(false)
    handleNavigate(citySlug)
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Find a leaderboard
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Search cities, sort by name or country, jump back to your last city, or open a
              random board.
            </p>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredCities.length} of {cities.length} cities
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)]">
          <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 focus-within:border-[var(--accent-500)] focus-within:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus-within:bg-zinc-900">
            <MdSearch className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search city, country, or slug"
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 focus-within:border-[var(--accent-500)] focus-within:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus-within:bg-zinc-900">
            <MdSortByAlpha className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="w-full bg-transparent text-sm font-medium outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-white dark:bg-zinc-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div ref={boardMenuRef} className="relative space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Board
            </span>
            <button
              type="button"
              onClick={() => setBoardMenuOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left dark:border-zinc-700 dark:bg-zinc-950"
            >
              <MdLanguage className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {activeCity ? `${getCityFlagEmoji(activeCity)} ${activeCity.name}` : 'Global board'}
                </span>
                {activeCity ? (
                  getBoardMetaLabel(activeCity) ? (
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {getBoardMetaLabel(activeCity)}
                    </span>
                  ) : null
                ) : (
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    All cities combined
                  </span>
                )}
              </span>
              <MdExpandMore
                className={classNames(
                  'h-5 w-5 shrink-0 text-zinc-400 transition dark:text-zinc-500',
                  boardMenuOpen && 'rotate-180',
                )}
              />
            </button>

            {boardMenuOpen ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950">
                <div className="max-h-80 overflow-y-auto p-2">
                  <button
                    type="button"
                    onClick={() => handleChooseBoard(null)}
                    className={classNames(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                      !selectedSlug && 'bg-zinc-100 dark:bg-zinc-800',
                    )}
                  >
                    <MdPublic className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Global board
                      </span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        All cities combined
                      </span>
                    </span>
                    {!selectedSlug ? (
                      <MdCheck className="h-4 w-4 shrink-0 text-[var(--accent-600)]" />
                    ) : null}
                  </button>

                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => {
                      const isSelected = city.slug === selectedSlug
                      return (
                        <button
                          key={city.slug}
                          type="button"
                          onClick={() => handleChooseBoard(city.slug)}
                          className={classNames(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                            isSelected && 'bg-zinc-100 dark:bg-zinc-800',
                          )}
                        >
                          <span className="shrink-0 text-base leading-none" aria-hidden="true">
                            {getCityFlagEmoji(city)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {city.name}
                            </span>
                            {getBoardMetaLabel(city) ? (
                              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {getBoardMetaLabel(city)}
                              </span>
                            ) : null}
                          </span>
                          {isSelected ? (
                            <MdCheck className="h-4 w-4 shrink-0 text-[var(--accent-600)]" />
                          ) : null}
                        </button>
                      )
                    })
                  ) : (
                    <div className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      No cities match your search.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => handleChooseBoard(null)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <MdPublic className="h-4 w-4" />
              Global
            </button>
            <button
              type="button"
              onClick={() => {
                if (!lastPlayedCity) {
                  return
                }
                handleChooseBoard(lastPlayedCity.slug)
              }}
              disabled={!lastPlayedCity}
              className={classNames(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition',
                lastPlayedCity
                  ? 'border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'
                  : 'cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600',
              )}
            >
              <MdHistory className="h-4 w-4" />
              Last played
            </button>
            <button
              type="button"
              onClick={handleRandomBoard}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-700)]"
            >
              <MdShuffle className="h-4 w-4" />
              Random city
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span>
            Active board:{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {activeCity ? activeCity.name : 'Global'}
            </span>
          </span>
          {lastPlayedCity ? (
            <span>
              Last played:{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {lastPlayedCity.name}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}

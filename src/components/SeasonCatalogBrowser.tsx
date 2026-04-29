'use client'

import classNames from 'classnames'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  MdCheck,
  MdExpandMore,
  MdFilterList,
  MdPublic,
  MdSearch,
  MdShuffle,
  MdSortByAlpha,
  MdTimeline,
} from 'react-icons/md'

import { getXpRewardColor } from '@/lib/xpColors'

type SeasonCard = {
  id: string
  slug: string
  title: string
  description: string
  themeColor: string | null
  current: boolean
  startDateMs: number
  startDateLabel: string
  seasonXp: number
  completedEventCount: number
  eventCount: number
  completed: boolean
  events: Array<{
    id: string
    title: string
    description: string
    rewardXp: number
    completed: boolean
    rulesetLabel: string | null
    citySlug: string | null
  }>
}

type SortMode =
  | 'title-asc'
  | 'title-desc'
  | 'latest'
  | 'oldest'
  | 'xp-desc'
  | 'event-count-desc'

type StatusFilter = 'all' | 'current' | 'archive' | 'completed'

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'latest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'xp-desc', label: 'Most XP' },
  { value: 'event-count-desc', label: 'Most events' },
]

function DropdownButton({
  icon,
  label,
  value,
  open,
  onToggle,
}: {
  icon: ReactNode
  label: string
  value: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left dark:border-zinc-700 dark:bg-zinc-950"
    >
      <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
      </span>
      <MdExpandMore
        className={classNames(
          'h-5 w-5 shrink-0 text-zinc-400 transition dark:text-zinc-500',
          open && 'rotate-180',
        )}
      />
    </button>
  )
}

export default function SeasonCatalogBrowser({
  seasons,
  hasUser,
}: {
  seasons: SeasonCard[]
  hasUser: boolean
}) {
  const sortMenuRef = useRef<HTMLDivElement | null>(null)
  const seasonMenuRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('latest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [seasonMenuOpen, setSeasonMenuOpen] = useState(false)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!sortMenuRef.current?.contains(target)) {
        setSortMenuOpen(false)
      }
      if (!seasonMenuRef.current?.contains(target)) {
        setSeasonMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const filteredSeasons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const nextSeasons = seasons.filter((season) => {
      if (selectedSlug && season.slug !== selectedSlug) {
        return false
      }

      if (statusFilter === 'current' && !season.current) {
        return false
      }

      if (statusFilter === 'archive' && season.current) {
        return false
      }

      if (statusFilter === 'completed' && !season.completed) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        season.title.toLowerCase().includes(normalizedQuery) ||
        season.description.toLowerCase().includes(normalizedQuery) ||
        season.slug.toLowerCase().includes(normalizedQuery) ||
        season.events.some(
          (event) =>
            event.title.toLowerCase().includes(normalizedQuery) ||
            event.description.toLowerCase().includes(normalizedQuery) ||
            (event.citySlug ?? '').toLowerCase().includes(normalizedQuery) ||
            (event.rulesetLabel ?? '').toLowerCase().includes(normalizedQuery),
        )
      )
    })

    nextSeasons.sort((left, right) => {
      switch (sortMode) {
        case 'oldest':
          return left.startDateMs - right.startDateMs
        case 'title-asc':
          return left.title.localeCompare(right.title)
        case 'title-desc':
          return right.title.localeCompare(left.title)
        case 'xp-desc':
          if (right.seasonXp !== left.seasonXp) {
            return right.seasonXp - left.seasonXp
          }
          return right.startDateMs - left.startDateMs
        case 'event-count-desc':
          if (right.eventCount !== left.eventCount) {
            return right.eventCount - left.eventCount
          }
          return right.startDateMs - left.startDateMs
        case 'latest':
        default:
          return right.startDateMs - left.startDateMs
      }
    })

    return nextSeasons
  }, [query, seasons, selectedSlug, sortMode, statusFilter])

  const activeSeason = useMemo(
    () => seasons.find((season) => season.slug === selectedSlug) ?? null,
    [seasons, selectedSlug],
  )

  const activeSortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? 'Newest first'

  const chooseRandomSeason = () => {
    const source = filteredSeasons.length > 0 ? filteredSeasons : seasons
    if (source.length === 0) {
      return
    }
    const randomSeason = source[Math.floor(Math.random() * source.length)]
    setSelectedSlug(randomSeason.slug)
    setSeasonMenuOpen(false)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Find a season
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Search season names or event goals, filter current versus archive, and sort the
                schedule the same way as the other catalog pages.
              </p>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredSeasons.length} of {seasons.length} seasons
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 focus-within:border-[var(--accent-500)] focus-within:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus-within:bg-zinc-900">
              <MdSearch className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search season, event, city, or ruleset"
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </label>

            <div ref={sortMenuRef} className="relative">
              <DropdownButton
                icon={<MdSortByAlpha className="h-5 w-5" />}
                label="Sort"
                value={activeSortLabel}
                open={sortMenuOpen}
                onToggle={() => setSortMenuOpen((open) => !open)}
              />
              {sortMenuOpen ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="max-h-72 overflow-y-auto p-2">
                    {SORT_OPTIONS.map((option) => {
                      const isSelected = option.value === sortMode
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSortMode(option.value)
                            setSortMenuOpen(false)
                          }}
                          className={classNames(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                            isSelected && 'bg-zinc-100 dark:bg-zinc-800',
                          )}
                        >
                          <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {option.label}
                          </span>
                          {isSelected ? (
                            <MdCheck className="h-4 w-4 shrink-0 text-[var(--accent-600)]" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div ref={seasonMenuRef} className="relative">
              <DropdownButton
                icon={<MdFilterList className="h-5 w-5" />}
                label="Season"
                value={activeSeason ? activeSeason.title : 'All seasons'}
                open={seasonMenuOpen}
                onToggle={() => setSeasonMenuOpen((open) => !open)}
              />
              {seasonMenuOpen ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="max-h-80 overflow-y-auto p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlug('')
                        setSeasonMenuOpen(false)
                      }}
                      className={classNames(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        !selectedSlug && 'bg-zinc-100 dark:bg-zinc-800',
                      )}
                    >
                      <MdPublic className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          All seasons
                        </span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          Current month plus archive
                        </span>
                      </span>
                      {!selectedSlug ? (
                        <MdCheck className="h-4 w-4 shrink-0 text-[var(--accent-600)]" />
                      ) : null}
                    </button>
                    {seasons.map((season) => {
                      const isSelected = season.slug === selectedSlug
                      return (
                        <button
                          key={season.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlug(season.slug)
                            setSeasonMenuOpen(false)
                          }}
                          className={classNames(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                            isSelected && 'bg-zinc-100 dark:bg-zinc-800',
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: season.themeColor ?? 'var(--accent-600)' }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {season.title}
                            </span>
                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {season.current ? 'Current season' : season.startDateLabel}
                            </span>
                          </span>
                          {isSelected ? (
                            <MdCheck className="h-4 w-4 shrink-0 text-[var(--accent-600)]" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 self-center lg:justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedSlug('')
                  setStatusFilter('all')
                }}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <MdPublic className="h-4 w-4" />
                All seasons
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('current')}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <MdTimeline className="h-4 w-4" />
                Current
              </button>
              <button
                type="button"
                onClick={chooseRandomSeason}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-700)]"
              >
                <MdShuffle className="h-4 w-4" />
                Random season
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'current', 'archive', 'completed'] as StatusFilter[]).map((value) => {
              const label =
                value === 'all'
                  ? 'All'
                  : value === 'current'
                    ? 'Current'
                    : value === 'archive'
                      ? 'Archive'
                      : 'Completed'
              const disabled = !hasUser && value === 'completed'
              const active = statusFilter === value
              return (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setStatusFilter(value)}
                  className={classNames(
                    'rounded-full px-3 py-1.5 text-sm font-semibold transition',
                    active
                      ? 'bg-[var(--accent-600)] text-white'
                      : disabled
                        ? 'cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        {filteredSeasons.length > 0 ? (
          filteredSeasons.map((season) => (
            <article
              key={season.id}
              className={classNames(
                'rounded-3xl border bg-white p-6 shadow-sm dark:bg-zinc-900',
                season.current
                  ? 'border-[var(--accent-600)] dark:border-[var(--accent-500)]'
                  : 'border-zinc-200 dark:border-zinc-800',
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div
                    className="text-xs font-semibold uppercase tracking-[0.24em]"
                    style={{ color: season.themeColor ?? 'var(--accent-600)' }}
                  >
                    {season.current ? 'Current season' : `Season archive - ${season.startDateLabel}`}
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    <Link href={`/season/${season.slug}`} className="hover:underline">
                      {season.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{season.description}</p>
                  {hasUser ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {season.seasonXp} season XP - {season.completedEventCount}/{season.eventCount}{' '}
                      events complete
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2 text-sm">
                  {season.events.map((event) => (
                    <div
                      key={event.id}
                      className={classNames(
                        'rounded-2xl border px-4 py-3',
                        event.completed
                          ? 'border-[var(--accent-600)] bg-[var(--accent-50)] dark:bg-[rgba(255,255,255,0.03)]'
                          : 'border-zinc-100 dark:border-zinc-800',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {event.title}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          <span style={{ color: getXpRewardColor(event.rewardXp) }}>
                            +{event.rewardXp} XP
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {event.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No seasons match the current search and filters.
          </div>
        )}
      </div>
    </div>
  )
}

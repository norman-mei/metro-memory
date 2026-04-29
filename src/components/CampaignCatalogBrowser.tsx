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

type CampaignCard = {
  id: string
  slug: string
  title: string
  description: string
  themeColor: string | null
  cityCount: number
  completedCount: number
  completed: boolean
  cities: Array<{
    id: string
    citySlug: string
    cityPath: string
    completed: boolean
  }>
}

type SortMode =
  | 'title-asc'
  | 'title-desc'
  | 'city-count-desc'
  | 'city-count-asc'
  | 'progress-desc'

type StatusFilter = 'all' | 'in-progress' | 'completed'

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'city-count-desc', label: 'Most cities' },
  { value: 'city-count-asc', label: 'Fewest cities' },
  { value: 'progress-desc', label: 'Most progress' },
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

export default function CampaignCatalogBrowser({
  campaigns,
  hasUser,
}: {
  campaigns: CampaignCard[]
  hasUser: boolean
}) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('title-asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSlug, setSelectedSlug] = useState<string>('')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement | null>(null)
  const campaignMenuRef = useRef<HTMLDivElement | null>(null)

  const filteredCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const nextCampaigns = campaigns.filter((campaign) => {
      if (selectedSlug && campaign.slug !== selectedSlug) {
        return false
      }

      if (statusFilter === 'in-progress' && !(campaign.completedCount > 0 && !campaign.completed)) {
        return false
      }

      if (statusFilter === 'completed' && !campaign.completed) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        campaign.title.toLowerCase().includes(normalizedQuery) ||
        campaign.description.toLowerCase().includes(normalizedQuery) ||
        campaign.slug.toLowerCase().includes(normalizedQuery) ||
        campaign.cities.some((city) => city.citySlug.toLowerCase().includes(normalizedQuery))
      )
    })

    nextCampaigns.sort((left, right) => {
      switch (sortMode) {
        case 'title-desc':
          return right.title.localeCompare(left.title)
        case 'city-count-desc':
          if (right.cityCount !== left.cityCount) {
            return right.cityCount - left.cityCount
          }
          return left.title.localeCompare(right.title)
        case 'city-count-asc':
          if (left.cityCount !== right.cityCount) {
            return left.cityCount - right.cityCount
          }
          return left.title.localeCompare(right.title)
        case 'progress-desc':
          if (right.completedCount !== left.completedCount) {
            return right.completedCount - left.completedCount
          }
          return left.title.localeCompare(right.title)
        case 'title-asc':
        default:
          return left.title.localeCompare(right.title)
      }
    })

    return nextCampaigns
  }, [campaigns, query, selectedSlug, sortMode, statusFilter])

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.slug === selectedSlug) ?? null,
    [campaigns, selectedSlug],
  )

  const activeSortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? 'Title A-Z'

  const chooseRandomCampaign = () => {
    const source = filteredCampaigns.length > 0 ? filteredCampaigns : campaigns
    if (source.length === 0) {
      return
    }
    const randomCampaign = source[Math.floor(Math.random() * source.length)]
    setSelectedSlug(randomCampaign.slug)
    setCampaignMenuOpen(false)
  }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!sortMenuRef.current?.contains(target)) {
        setSortMenuOpen(false)
      }
      if (!campaignMenuRef.current?.contains(target)) {
        setCampaignMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Find a campaign
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Search pack names or city slugs, filter by status, and sort the catalog however
                you want to browse it.
              </p>
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredCampaigns.length} of {campaigns.length} packs
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 focus-within:border-[var(--accent-500)] focus-within:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus-within:bg-zinc-900">
              <MdSearch className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search campaign, description, or city slug"
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
            <div ref={campaignMenuRef} className="relative">
              <DropdownButton
                icon={<MdFilterList className="h-5 w-5" />}
                label="Campaign"
                value={activeCampaign ? activeCampaign.title : 'All campaigns'}
                open={campaignMenuOpen}
                onToggle={() => setCampaignMenuOpen((open) => !open)}
              />
              {campaignMenuOpen ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950">
                  <div className="max-h-80 overflow-y-auto p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlug('')
                        setCampaignMenuOpen(false)
                      }}
                      className={classNames(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                        !selectedSlug && 'bg-zinc-100 dark:bg-zinc-800',
                      )}
                    >
                      <MdPublic className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          All campaigns
                        </span>
                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          Browse the full pack catalog
                        </span>
                      </span>
                      {!selectedSlug ? (
                        <MdCheck className="h-4 w-4 shrink-0 text-[var(--accent-600)]" />
                      ) : null}
                    </button>
                    {campaigns.map((campaign) => {
                      const isSelected = campaign.slug === selectedSlug
                      return (
                        <button
                          key={campaign.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlug(campaign.slug)
                            setCampaignMenuOpen(false)
                          }}
                          className={classNames(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800',
                            isSelected && 'bg-zinc-100 dark:bg-zinc-800',
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: campaign.themeColor ?? 'var(--accent-600)' }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {campaign.title}
                            </span>
                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {campaign.cityCount} cities
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

            <div className="flex flex-wrap items-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedSlug('')
                  setStatusFilter('all')
                }}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <MdPublic className="h-4 w-4" />
                All packs
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in-progress')}
                disabled={!hasUser}
                className={classNames(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition',
                  hasUser
                    ? 'border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'
                    : 'cursor-not-allowed border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600',
                )}
              >
                <MdTimeline className="h-4 w-4" />
                In progress
              </button>
              <button
                type="button"
                onClick={chooseRandomCampaign}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-600)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-700)]"
              >
                <MdShuffle className="h-4 w-4" />
                Random pack
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'in-progress', 'completed'] as StatusFilter[]).map((value) => {
              const label =
                value === 'all' ? 'All' : value === 'in-progress' ? 'In progress' : 'Completed'
              const disabled = !hasUser && value !== 'all'
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
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em]"
                    style={{ color: campaign.themeColor ?? 'var(--accent-600)' }}
                  >
                    <span>{campaign.title}</span>
                    <span>&#8226;</span>
                    <span>{campaign.cityCount} cities</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    <Link href={`/campaign/${campaign.slug}`} className="hover:underline">
                      {campaign.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{campaign.description}</p>
                  {hasUser ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Progress: {campaign.completedCount}/{campaign.cityCount}
                      {campaign.completed ? ' completed' : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {campaign.cities.slice(0, 6).map((city) => (
                    <span
                      key={city.id}
                      className={classNames(
                        'rounded-full border px-3 py-1',
                        city.completed
                          ? 'border-[var(--accent-600)] text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                          : 'border-zinc-200 dark:border-zinc-700',
                      )}
                    >
                      {city.citySlug}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            No campaigns match the current search and filters.
          </div>
        )}
      </div>
    </div>
  )
}

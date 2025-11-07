'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import Fuse from 'fuse.js'
import { Transition } from '@headlessui/react'

import { cities, ICity } from '@/lib/citiesConfig'
import { getAchievementForCity } from '@/lib/achievements'
import CityCard from '@/components/CityCard'
import CreditsContent from '@/components/CreditsContent'

type CitySortOption = 'default' | 'name-asc' | 'name-desc' | 'continent-asc' | 'continent-desc'
type AchievementSortOption =
  | 'default'
  | 'name-asc'
  | 'name-desc'
  | 'continent-asc'
  | 'continent-desc'
  | 'not-achieved-asc'
  | 'not-achieved-desc'
  | 'achieved-asc'
  | 'achieved-desc'

const CITY_SORT_OPTIONS: Array<{ value: CitySortOption; label: string }> = [
  { value: 'default', label: 'Default order' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'continent-asc', label: 'Continent (A-Z)' },
  { value: 'continent-desc', label: 'Continent (Z-A)' },
]

const ACHIEVEMENT_SORT_OPTIONS: Array<{ value: AchievementSortOption; label: string }> = [
  { value: 'default', label: 'Default order' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'continent-asc', label: 'Continent (A-Z)' },
  { value: 'continent-desc', label: 'Continent (Z-A)' },
  { value: 'not-achieved-asc', label: 'Not achieved (A-Z)' },
  { value: 'not-achieved-desc', label: 'Not achieved (Z-A)' },
  { value: 'achieved-asc', label: 'Achieved (A-Z)' },
  { value: 'achieved-desc', label: 'Achieved (Z-A)' },
]

const TAB_OPTIONS: Array<{ id: TabOption; label: string }> = [
  { id: 'cities', label: 'Cities' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'updateLog', label: 'Update Log' },
  { id: 'credits', label: 'Credits' },
]

type TabOption = 'cities' | 'achievements' | 'updateLog' | 'credits'

type UpdateLogStatus = 'idle' | 'loading' | 'success' | 'error'

type UpdateLogEntry = {
  sha: string
  message: string
  author: string
  date?: string
  url: string
}

type UpdateLogState = {
  status: UpdateLogStatus
  entries: UpdateLogEntry[]
  errorMessage?: string
  lastUpdated?: string
}

type GithubCommitResponse = {
  sha?: string
  html_url?: string
  commit?: {
    message?: string
    author?: { name?: string; date?: string | null }
    committer?: { date?: string | null }
  }
  author?: { login?: string | null }
}

const UPDATE_LOG_ENDPOINT =
  'https://api.github.com/repos/norman-mei/metro-memory/commits?per_page=20'

const UPDATE_LOG_HEADERS: HeadersInit = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

const UPDATE_LOG_LIMIT = 15

const formatCommitMessage = (message?: string | null) => {
  if (!message) {
    return 'No commit message'
  }
  const firstLine = message.split('\n')[0]?.trim()
  return firstLine && firstLine.length > 0 ? firstLine : 'No commit message'
}

const REGION_KEYWORDS: Record<string, string[]> = {
  AL: ['Alabama', 'AL'],
  AK: ['Alaska', 'AK'],
  AZ: ['Arizona', 'AZ'],
  AR: ['Arkansas', 'AR'],
  CA: ['California', 'CA'],
  CO: ['Colorado', 'CO'],
  CT: ['Connecticut', 'CT'],
  DE: ['Delaware', 'DE'],
  FL: ['Florida', 'FL'],
  GA: ['Georgia', 'GA'],
  HI: ['Hawaii', 'HI'],
  ID: ['Idaho', 'ID'],
  IL: ['Illinois', 'IL'],
  IN: ['Indiana', 'IN'],
  IA: ['Iowa', 'IA'],
  KS: ['Kansas', 'KS'],
  KY: ['Kentucky', 'KY'],
  LA: ['Louisiana', 'LA'],
  ME: ['Maine', 'ME'],
  MD: ['Maryland', 'MD'],
  MA: ['Massachusetts', 'MA'],
  MI: ['Michigan', 'MI'],
  MN: ['Minnesota', 'MN'],
  MS: ['Mississippi', 'MS'],
  MO: ['Missouri', 'MO'],
  MT: ['Montana', 'MT'],
  NE: ['Nebraska', 'NE'],
  NV: ['Nevada', 'NV'],
  NH: ['New Hampshire', 'NH'],
  NJ: ['New Jersey', 'NJ'],
  NM: ['New Mexico', 'NM'],
  NY: ['New York', 'NY'],
  NC: ['North Carolina', 'NC'],
  ND: ['North Dakota', 'ND'],
  OH: ['Ohio', 'OH'],
  OK: ['Oklahoma', 'OK'],
  OR: ['Oregon', 'OR'],
  PA: ['Pennsylvania', 'PA'],
  RI: ['Rhode Island', 'RI'],
  SC: ['South Carolina', 'SC'],
  SD: ['South Dakota', 'SD'],
  TN: ['Tennessee', 'TN'],
  TX: ['Texas', 'TX'],
  UT: ['Utah', 'UT'],
  VT: ['Vermont', 'VT'],
  VA: ['Virginia', 'VA'],
  WA: ['Washington', 'WA'],
  WV: ['West Virginia', 'WV'],
  WI: ['Wisconsin', 'WI'],
  WY: ['Wyoming', 'WY'],
  DC: ['District of Columbia', 'DC', 'Washington DC'],
  PR: ['Puerto Rico', 'PR'],
  MX: ['Mexico', 'MX'],
  CAN: ['Canada', 'CAN'],
  AB: ['Alberta', 'AB'],
  BC: ['British Columbia', 'BC'],
  MB: ['Manitoba', 'MB'],
  NB: ['New Brunswick', 'NB'],
  NL: ['Newfoundland and Labrador', 'NL'],
  NS: ['Nova Scotia', 'NS'],
  NT: ['Northwest Territories', 'NT'],
  NU: ['Nunavut', 'NU'],
  ON: ['Ontario', 'ON'],
  PE: ['Prince Edward Island', 'PE'],
  QC: ['Quebec', 'QC'],
  SK: ['Saskatchewan', 'SK'],
  YT: ['Yukon', 'YT'],
  USA: ['United States', 'USA', 'US', 'America'],
}

const extractRegionKeywords = (name: string): string[] | undefined => {
  const match = name.match(/,\s*([A-Z]{2,3}(?:\/[A-Z]{2,3})*)/)
  if (!match) return undefined
  const codes = match[1].split('/')
  const keywords = new Set<string>()
  for (const code of codes) {
    const list = REGION_KEYWORDS[code]
    if (list) {
      list.forEach((word) => {
        keywords.add(word)
        keywords.add(word.toLowerCase())
      })
    }
  }
  return keywords.size > 0 ? Array.from(keywords) : undefined
}

const enrichCities = (cityList: ICity[]): ICity[] =>
  cityList.map((city) => {
    if (city.keywords && city.keywords.length > 0) {
      return city
    }
    const keywords = extractRegionKeywords(city.name)
    return keywords ? { ...city, keywords } : city
  })

const getSlugFromLink = (link: string) => {
  if (!link.startsWith('/')) {
    return null
  }
  return link.replace(/^\//, '').split(/[?#]/)[0]
}

interface AchievementMeta {
  slug: string
  cityName: string
  title: string
  description: string
  continent: string
  order: number
}

const SearcheableCitiesList = () => {
  const [activeTab, setActiveTab] = useState<TabOption>('cities')
  const [search, setSearch] = useState('')
  const [citySort, setCitySort] = useState<CitySortOption>('default')
  const [achievementSearch, setAchievementSearch] = useState('')
  const [achievementSort, setAchievementSort] = useState<AchievementSortOption>('default')
  const [unlockedSlugs, setUnlockedSlugs] = useState<string[]>([])
  const [updateLogState, setUpdateLogState] = useState<UpdateLogState>({
    status: 'idle',
    entries: [],
  })

  const enrichedCities = useMemo(() => enrichCities(cities), [])
  const achievementCatalog = useMemo(() => {
    return enrichedCities
      .map((city, index) => {
        const slug = getSlugFromLink(city.link)
        if (!slug) return null
        const baseName = city.name.split(',')[0]
        const meta = getAchievementForCity(slug, baseName)
        return {
          slug,
          cityName: baseName,
          title: meta.title,
          description: meta.description,
          continent: city.continent,
          order: index,
        }
      })
      .filter((entry): entry is AchievementMeta => entry !== null)
  }, [enrichedCities])

  const fuse = useMemo(
    () =>
      new Fuse(enrichedCities, {
        keys: ['name', 'keywords'],
        minMatchCharLength: 1,
        threshold: 0.3,
        distance: 100,
        ignoreLocation: true,
      }),
    [enrichedCities],
  )

  const achievementFuse = useMemo(
    () =>
      new Fuse(achievementCatalog, {
        keys: ['cityName', 'title', 'description', 'slug', 'continent'],
        minMatchCharLength: 1,
        threshold: 0.35,
        distance: 100,
        ignoreLocation: true,
      }),
    [achievementCatalog],
  )

  const sortedCities = useMemo(() => {
    const compareName = (a: ICity, b: ICity) => a.name.localeCompare(b.name)
    const compareContinent = (a: ICity, b: ICity) => {
      const result = a.continent.localeCompare(b.continent)
      return result !== 0 ? result : compareName(a, b)
    }
    const baseline = [...enrichedCities]
    switch (citySort) {
      case 'name-asc':
        return baseline.sort(compareName)
      case 'name-desc':
        return baseline.sort((a, b) => compareName(b, a))
      case 'continent-asc':
        return baseline.sort(compareContinent)
      case 'continent-desc':
        return baseline.sort((a, b) => compareContinent(b, a))
      case 'default':
      default:
        return baseline.sort(compareName)
    }
  }, [enrichedCities, citySort])

  const continentOrder = useMemo(
    () => ['North America', 'South America', 'Europe', 'Asia', 'Australia', 'Africa', 'Oceania', 'Antarctica'],
    [],
  )

  const groupedCities = useMemo(() => {
    const continentMap = new Map<string, ICity[]>()
    sortedCities.forEach((city) => {
      if (!continentMap.has(city.continent)) {
        continentMap.set(city.continent, [])
      }
      continentMap.get(city.continent)!.push(city)
    })
    const entries = Array.from(continentMap.entries())
    const sortEntries = () => {
      if (citySort === 'continent-asc') return entries.sort((a, b) => a[0].localeCompare(b[0]))
      if (citySort === 'continent-desc') return entries.sort((a, b) => b[0].localeCompare(a[0]))
      return entries.sort((a, b) => {
        const aIndex = continentOrder.indexOf(a[0])
        const bIndex = continentOrder.indexOf(b[0])
        if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
    }
    return sortEntries().map(([continent, list]) => ({ continent, cities: list }))
  }, [sortedCities, continentOrder, citySort])

  const fullCitiesSet = useMemo(() => new Set(enrichedCities.map((city) => city.link)), [enrichedCities])

  const results = useMemo(() => {
    const normalized = search.trim()
    if (normalized.length === 0) {
      return fullCitiesSet
    }
    const res = fuse.search(normalized)
    return new Set(res.map((result) => result.item.link))
  }, [search, fuse, fullCitiesSet])

  const visibleGroups = useMemo(() => {
    return groupedCities
      .map(({ continent, cities }) => ({
        continent,
        cities: cities.filter((city) => results.has(city.link)),
      }))
      .filter((group) => group.cities.length > 0)
  }, [groupedCities, results])

  const unlockedSet = useMemo(() => new Set(unlockedSlugs), [unlockedSlugs])
  const allAchievementSlugs = useMemo(() => achievementCatalog.map((entry) => entry.slug), [achievementCatalog])

  const achievementSearchSet = useMemo(() => {
    const normalized = achievementSearch.trim()
    if (normalized.length === 0) {
      return new Set(allAchievementSlugs)
    }
    const res = achievementFuse.search(normalized)
    return new Set(res.map((result) => result.item.slug))
  }, [achievementSearch, achievementFuse, allAchievementSlugs])

  const visibleAchievements = useMemo(() => {
    const filtered = achievementCatalog.filter((entry) => achievementSearchSet.has(entry.slug))
    return sortAchievementEntries(filtered, achievementSort, unlockedSet)
  }, [achievementCatalog, achievementSearchSet, achievementSort, unlockedSet])

  const fetchUpdateLog = useCallback(
    async (signal?: AbortSignal) => {
      setUpdateLogState((prev) => ({
        ...prev,
        status: 'loading',
        errorMessage: undefined,
      }))

      try {
        const response = await fetch(UPDATE_LOG_ENDPOINT, {
          headers: UPDATE_LOG_HEADERS,
          signal,
        })

        if (!response.ok) {
          throw new Error(`GitHub responded with status ${response.status}`)
        }

        const payload = (await response.json()) as GithubCommitResponse[]
        if (signal?.aborted) {
          return
        }

        if (!Array.isArray(payload)) {
          throw new Error('Unexpected GitHub response')
        }

        const entries = payload
          .map<UpdateLogEntry | null>((item) => {
            const sha = item.sha ?? ''
            if (!sha) {
              return null
            }
            const message = formatCommitMessage(item.commit?.message)
            const author =
              item.commit?.author?.name ??
              item.author?.login ??
              'Unknown contributor'
            const date =
              item.commit?.author?.date ??
              item.commit?.committer?.date ??
              undefined
            const url =
              item.html_url ??
              `https://github.com/norman-mei/metro-memory/commit/${sha}`

            return {
              sha,
              message,
              author,
              date: typeof date === 'string' ? date : undefined,
              url,
            }
          })
          .filter((entry): entry is UpdateLogEntry => entry !== null)
          .slice(0, UPDATE_LOG_LIMIT)

        setUpdateLogState({
          status: 'success',
          entries,
          lastUpdated: new Date().toISOString(),
        })
      } catch (error) {
        if (signal?.aborted) {
          return
        }

        setUpdateLogState({
          status: 'error',
          entries: [],
          errorMessage:
            error instanceof Error ? error.message : 'Unable to fetch updates',
        })
      }
    },
    [],
  )

  useEffect(() => {
    if (activeTab !== 'updateLog' || updateLogState.status !== 'idle') {
      return
    }

    const controller = new AbortController()
    fetchUpdateLog(controller.signal)

    return () => {
      controller.abort()
    }
  }, [activeTab, fetchUpdateLog, updateLogState.status])

  const handleUpdateLogRetry = useCallback(() => {
    if (updateLogState.status === 'loading') {
      return
    }
    fetchUpdateLog()
  }, [fetchUpdateLog, updateLogState.status])

  useEffect(() => {
    const computeAchievements = () => {
      if (typeof window === 'undefined') return
      const unlocked: string[] = []
      achievementCatalog.forEach((entry) => {
        const { slug } = entry
        const totalRaw = window.localStorage.getItem(`${slug}-station-total`)
        const total = Number(totalRaw)
        if (!Number.isFinite(total) || total <= 0) {
          return
        }
        let foundCount = 0
        const stored = window.localStorage.getItem(`${slug}-stations`)
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) {
              foundCount = new Set(parsed.filter((value) => typeof value === 'number')).size
            } else if (typeof parsed === 'number') {
              foundCount = parsed
            }
          } catch {
            foundCount = 0
          }
        }
        if (foundCount >= total) {
          unlocked.push(slug)
        }
      })
      setUnlockedSlugs(unlocked)
    }

    computeAchievements()
    window.addEventListener('storage', computeAchievements)
    window.addEventListener('focus', computeAchievements)
    return () => {
      window.removeEventListener('storage', computeAchievements)
      window.removeEventListener('focus', computeAchievements)
    }
  }, [achievementCatalog])

  const hasResults = visibleGroups.length > 0
  let cardIndex = 0

  return (
    <div className="my-16 mt-16 sm:mt-20">
      <div className="mb-6 flex gap-3">
        {TAB_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={classNames(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              activeTab === id
                ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'cities' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="block w-full rounded-full border-0 px-10 py-4 pr-10 text-lg text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:leading-6 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-400"
                type="text"
                placeholder="Search for a city..."
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"
                  />
                </svg>
              </div>
            </div>
            <div className="w-full md:w-64">
              <label className="sr-only" htmlFor="city-sort">
                Sort cities
              </label>
              <select
                id="city-sort"
                value={citySort}
                onChange={(event) => setCitySort(event.target.value as CitySortOption)}
                className="w-full rounded-full border-0 bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:focus:ring-indigo-400"
              >
                {CITY_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {hasResults ? (
            <div className="space-y-10">
              {visibleGroups.map(({ continent, cities }, index) => (
                <section key={continent} className="space-y-6">
                  <div>
                    <h3 className="mb-4 text-xl font-semibold text-zinc-800 dark:text-zinc-100">{continent}</h3>
                    <div className="mx-auto grid max-w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {cities.map((city) => {
                        const rotationClass = ''
                        cardIndex += 1
                        return (
                          <Transition
                            key={city.link}
                            as="div"
                            appear
                            enterFrom="opacity-0 translate-y-4"
                            enter="transition-all ease-out duration-200"
                            leaveFrom="opacity-100 translate-y-0"
                            leave="transition-all ease-in duration-200"
                            show
                          >
                            <CityCard city={city} className={rotationClass} />
                          </Transition>
                        )
                      })}
                    </div>
                  </div>
                  {index < visibleGroups.length - 1 && (
                    <footer>
                      <hr className="border-t border-zinc-200 dark:border-[#18181b]" />
                    </footer>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
          {hasResults && <SuggestCity />}
        </>
      ) : activeTab === 'achievements' ? (
        <Achievements
          items={visibleAchievements}
          unlockedSlugs={unlockedSlugs}
          searchValue={achievementSearch}
          onSearchChange={setAchievementSearch}
          sortOption={achievementSort}
          onSortChange={setAchievementSort}
        />
      ) : activeTab === 'updateLog' ? (
        <UpdateLogPanel state={updateLogState} onRetry={handleUpdateLogRetry} />
      ) : (
        <div className="flex justify-center">
          <CreditsContent showBackLink={false} />
        </div>
      )}
    </div>
  )
}

const Achievements = ({
  items,
  unlockedSlugs,
  searchValue,
  onSearchChange,
  sortOption,
  onSortChange,
}: {
  items: AchievementMeta[]
  unlockedSlugs: string[]
  searchValue: string
  onSearchChange: (value: string) => void
  sortOption: AchievementSortOption
  onSortChange: (value: AchievementSortOption) => void
}) => {
  const unlockedSet = useMemo(() => new Set(unlockedSlugs), [unlockedSlugs])
  const hasResults = items.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            type="text"
            placeholder="Search achievements..."
            className="block w-full rounded-full border-0 px-10 py-3 text-base text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-400"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"
              />
            </svg>
          </div>
        </div>
        <div className="w-full md:w-64">
          <label className="sr-only" htmlFor="achievement-sort">
            Sort achievements
          </label>
          <select
            id="achievement-sort"
            value={sortOption}
            onChange={(event) => onSortChange(event.target.value as AchievementSortOption)}
            className="w-full rounded-full border-0 bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:focus:ring-indigo-400"
          >
            {ACHIEVEMENT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasResults ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-[#18181b] dark:text-zinc-400">
          No achievements found. Try a different search or sort option.
        </div>
      ) : (
        items.map((meta) => {
          const isUnlocked = unlockedSet.has(meta.slug)
          return (
            <div
              key={meta.slug}
              className={classNames(
                'flex items-start justify-between rounded-2xl border p-4 shadow-sm',
                isUnlocked
                  ? 'border-emerald-200 bg-white dark:border-emerald-600/60 dark:bg-zinc-900'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-[#18181b] dark:bg-zinc-900/40 dark:text-zinc-500',
              )}
            >
              <div>
                <h4
                  className={classNames('text-lg font-semibold', isUnlocked ? 'text-zinc-800 dark:text-zinc-100' : '')}
                >
                  {meta.title}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{meta.description}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {meta.cityName} • {meta.continent}
                </p>
              </div>
              <span
                className={classNames(
                  'text-sm font-semibold',
                  isUnlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500',
                )}
              >
                {isUnlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

const UpdateLogPanel = ({
  state,
  onRetry,
}: {
  state: UpdateLogState
  onRetry: () => void
}) => {
  const [showEmptyState, setShowEmptyState] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    if (state.status === 'success' && state.entries.length === 0) {
      setShowEmptyState(false)
      timer = setTimeout(() => setShowEmptyState(true), 60_000)
    } else {
      setShowEmptyState(false)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [state.entries.length, state.status])

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-[#18181b] dark:text-zinc-400">
        Fetching the latest updates…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <p className="mb-3">
          Unable to load the update log. {state.errorMessage ?? 'Please try again.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400"
        >
          Retry
        </button>
      </div>
    )
  }

  if (state.status === 'success' && state.entries.length === 0) {
    if (!showEmptyState) {
      return (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-[#18181b] dark:text-zinc-400">
          Checking for new updates…
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-[#18181b] dark:text-zinc-400">
        No update log(s) found.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {state.lastUpdated && (
        <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Last refreshed {formatUpdateDate(state.lastUpdated)}
        </p>
      )}
      {state.entries.map((entry) => (
        <article
          key={entry.sha}
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-[#18181b] dark:bg-zinc-900"
        >
          <div className="space-y-1">
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-4 transition hover:decoration-indigo-500 dark:text-indigo-300 dark:decoration-indigo-500 dark:hover:decoration-indigo-400"
            >
              {entry.message}
            </a>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {entry.author} • {formatUpdateDate(entry.date)}
            </p>
            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500">{entry.sha.slice(0, 7)}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

const EmptyState = () => (
  <div className="w-full rounded bg-indigo-700 px-12 py-6 text-white">
    <h3 className="mb-2 text-lg font-medium">No results!</h3>
    <p>
      Want to play in your city? Shoot me a message on 𝕏 <a href="https://x.com/_benjamintd">@_benjamintd</a>
    </p>
  </div>
)

const SuggestCity = () => (
  <p className="mt-6">
    If you want the game to be available in your city, send me a message on 𝕏{' '}
    <a className="font-medium hover:underline" href="https://twitter.com/_benjamintd">
      @_benjamintd
    </a>
    , or contribute on{' '}
    <a className="font-medium hover:underline" href="https://github.com/benjamintd/metro-memory.com">
      Github
    </a>
    .
  </p>
)

const sortAchievementEntries = (
  entries: AchievementMeta[],
  sort: AchievementSortOption,
  unlockedSet: Set<string>,
): AchievementMeta[] => {
  const compareName = (a: AchievementMeta, b: AchievementMeta) => a.cityName.localeCompare(b.cityName)
  const compareContinent = (a: AchievementMeta, b: AchievementMeta) => {
    const result = a.continent.localeCompare(b.continent)
    return result !== 0 ? result : compareName(a, b)
  }
  const base = [...entries]
  switch (sort) {
    case 'name-asc':
      return base.sort(compareName)
    case 'name-desc':
      return base.sort((a, b) => compareName(b, a))
    case 'continent-asc':
      return base.sort(compareContinent)
    case 'continent-desc':
      return base.sort((a, b) => compareContinent(b, a))
    case 'not-achieved-asc':
      return base.filter((entry) => !unlockedSet.has(entry.slug)).sort(compareName)
    case 'not-achieved-desc':
      return base.filter((entry) => !unlockedSet.has(entry.slug)).sort((a, b) => compareName(b, a))
    case 'achieved-asc':
      return base.filter((entry) => unlockedSet.has(entry.slug)).sort(compareName)
    case 'achieved-desc':
      return base.filter((entry) => unlockedSet.has(entry.slug)).sort((a, b) => compareName(b, a))
    case 'default':
    default:
      return base.sort((a, b) => a.order - b.order)
  }
}

const formatUpdateDate = (iso?: string) => {
  if (!iso) {
    return 'Unknown date'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default SearcheableCitiesList

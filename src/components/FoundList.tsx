'use client'

import SortMenu from '@/components/SortMenu'
import { useSettings } from '@/context/SettingsContext'
import useTranslation from '@/hooks/useTranslation'
import { useConfig } from '@/lib/configContext'
import { repairMojibakeString } from '@/lib/repairMojibake'
import { DataFeature, SortOption, SortOptionType } from '@/lib/types'
import classNames from 'classnames'
import { sortBy } from 'lodash'
import { useTheme } from 'next-themes'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdClose, MdHistory } from 'react-icons/md'
import { DateAddedIcon } from './DateAddedIcon'
import LineBadge from './LineBadge'

let isGlobalMouseDown = false
const EM_DASH = '\u2014'

type SearchHistoryEntry = {
  id: string
  value: string
  createdAt: string
}

const keepApostropheWordsTogether = (value: string) =>
  value.replace(/\u2019/g, "'")

const getStationKey = (feature: DataFeature) => {
  const nameCandidates: unknown[] = [
    feature.properties?.name,
    feature.properties?.long_name,
    feature.properties?.display_name,
    feature.properties?.short_name,
  ]

  for (const candidate of nameCandidates) {
    if (typeof candidate === 'string') {
      const normalized = candidate.trim().toLowerCase()
      if (normalized.length > 0) {
        return `name:${normalized}`
      }
    }
  }

  if (
    feature.geometry?.type === 'Point' &&
    Array.isArray(feature.geometry.coordinates)
  ) {
    const [lng, lat] = feature.geometry.coordinates as number[]
    const formattedLng =
      typeof lng === 'number' ? lng.toFixed(6) : String(lng)
    const formattedLat =
      typeof lat === 'number' ? lat.toFixed(6) : String(lat)
    return `point:${formattedLng}|${formattedLat}`
  }

  const idCandidate =
    feature.id ??
    (typeof feature.properties?.id === 'number' ||
    typeof feature.properties?.id === 'string'
      ? feature.properties?.id
      : undefined)

  if (idCandidate !== undefined && idCandidate !== null) {
    return `id:${String(idCandidate)}`
  }

  return `feature:${JSON.stringify(feature.geometry ?? {})}`
}

const getDisplayName = (feature: DataFeature) => {
  if (!feature || !feature.properties) {
    return EM_DASH
  }

  const { display_name, short_name, long_name, name, id: propertyId } =
    feature.properties as typeof feature.properties & {
      display_name?: unknown
      short_name?: unknown
      long_name?: unknown
      id?: unknown
    }

  const candidates = [
    display_name,
    name,
    long_name,
    short_name,
    propertyId,
    feature.id,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      const value = repairMojibakeString(String(candidate)).trim()
      if (value.length > 0) {
        return keepApostropheWordsTogether(value)
      }
    }
  }

  return EM_DASH
}

const getFeatureNumericId = (feature: DataFeature) => {
  if (typeof feature.id === 'number') {
    return feature.id
  }

  const propertyId = feature.properties?.id
  if (typeof propertyId === 'number') {
    return propertyId
  }

  return null
}
const FoundList = ({
  found,
  idMap,
  setHoveredId,
  hoveredId,
  hideLabels,
  zoomToFeature,
  foundTimestamps,
  onStationFocus,
  activeStationId,
  disabled = false,
  iconBasePath,
}: {
  found: number[]
  idMap: Map<number, DataFeature>
  setHoveredId: (id: number | null) => void
  hoveredId: number | null
  hideLabels?: boolean
  zoomToFeature: (id: number) => void
  foundTimestamps: Record<string, string>
  onStationFocus?: (id: number) => void
  activeStationId: number | null
  disabled?: boolean
  iconBasePath?: string | null
}) => {
  const { LINES, LINE_GROUPS = [] } = useConfig()
  const { t } = useTranslation()
  const { settings } = useSettings()

  const lineOrderMap = useMemo(() => {
    const orderMap = new Map<string, number>()
    let groupIndex = 0

    for (const group of LINE_GROUPS) {
      for (const item of group.items ?? []) {
        if (item.type === 'lines') {
          const lines = item.lines ?? []
          lines.forEach((line, idx) => {
            if (!orderMap.has(line)) {
              orderMap.set(line, groupIndex * 1000 + idx)
            }
          })
          groupIndex += 1
        } else if (item.type === 'separator') {
          groupIndex += 1
        }
      }
    }

    return orderMap
  }, [LINE_GROUPS])

  useEffect(() => {
    const handleMouseDown = () => {
      isGlobalMouseDown = true
    }
    const handleMouseUp = () => {
      isGlobalMouseDown = false
    }
    document.addEventListener('mousedown', handleMouseDown, { passive: true })
    document.addEventListener('mouseup', handleMouseUp, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])


  const sortOptions: SortOption[] = useMemo(
    () => [
      {
        name: t('sort.dateAdded'),
        id: 'order',
        shortName: <DateAddedIcon className="h-4 w-4" />,
      },
      { name: t('sort.nameAsc'), id: 'name', shortName: 'A-Z' },
      { name: t('sort.nameDesc'), id: 'name-desc', shortName: 'Z-A' },
      { name: t('sort.line'), id: 'line', shortName: 'Line' },
    ],
    [t],
  )

  const [sort, setSort] = useState<SortOptionType>('order')
  const [filter, setFilter] = useState<string>('')
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false)
  const [searchHistoryIndex, setSearchHistoryIndex] = useState<number | null>(null)
  const lastFilterRef = useRef('')

  const pushSearchHistory = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setSearchHistory((prev) => {
      const withoutDuplicate = prev.filter((item) => item.value !== trimmed)
      return [
        ...withoutDuplicate,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          value: trimmed,
          createdAt: new Date().toISOString(),
        },
      ].slice(-100)
    })
    setSearchHistoryIndex(null)
  }, [])

  const sorted = useMemo(() => {
    const ids = [...found]

    switch (sort) {
      case 'order':
        return ids.sort((a, b) => {
          const aKey = String(a)
          const bKey = String(b)
          const aTime = Date.parse(foundTimestamps[aKey] ?? '')
          const bTime = Date.parse(foundTimestamps[bKey] ?? '')
          const aValid = Number.isFinite(aTime)
          const bValid = Number.isFinite(bTime)

          if (aValid && bValid) {
            if (bTime === aTime) {
              return 0
            }
            return bTime - aTime
          }

          if (bValid) return 1
          if (aValid) return -1
          return found.indexOf(a) - found.indexOf(b)
        })

      case 'name': {
        return sortBy(ids, (id) => {
          const feature = idMap.get(id)
          const name =
            (feature?.properties as any)?.display_name ??
            feature?.properties.name
          return name ? String(name).toLowerCase() : ''
        })
      }

      case 'name-desc': {
        return sortBy(ids, (id) => {
          const feature = idMap.get(id)
          const name =
            (feature?.properties as any)?.display_name ??
            feature?.properties.name
          return name ? String(name).toLowerCase() : ''
        }).reverse()
      }

      case 'line':
        return sortBy(
          ids,
          (id) => {
            const feature = idMap.get(id)
            if (!feature) return Number.MAX_SAFE_INTEGER
            const line = feature.properties.line
            if (!line) return Number.MAX_SAFE_INTEGER
            const groupOrder = lineOrderMap.get(line)
            if (groupOrder !== undefined) return groupOrder
            return LINES[line]?.order ?? Number.MAX_SAFE_INTEGER
          },
          (id) => {
            const feature = idMap.get(id)
            if (!feature) return Number.MAX_SAFE_INTEGER
            if (feature.geometry.type === 'Point') {
              return (
                100 * feature.geometry.coordinates[0] +
                feature.geometry.coordinates[1]
              )
            }
            return feature.properties.name
          },
        )

      default:
        return ids
    }
  }, [found, sort, idMap, LINES, foundTimestamps, lineOrderMap])

  const normalizedFilter = filter.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!normalizedFilter) {
      return sorted
    }

    return sorted.filter((id) => {
      const feature = idMap.get(id)
      if (!feature) return false

      const name =
        feature.properties.display_name?.toLowerCase() ??
        feature.properties.name?.toLowerCase() ??
        ''
      if (name.includes(normalizedFilter)) return true

      const alternates = (
        feature.properties as typeof feature.properties & {
          alternate_names?: string[]
        }
      ).alternate_names
      if (Array.isArray(alternates)) {
        return alternates.some((alias) =>
          alias.toLowerCase().includes(normalizedFilter),
        )
      }

      return false
    })
  }, [sorted, normalizedFilter, idMap])

  useEffect(() => {
    if (activeStationId === null || !normalizedFilter) return
    if (filtered.includes(activeStationId)) return

    const activeFeature = idMap.get(activeStationId)
    if (!activeFeature) return

    pushSearchHistory(filter)
    setFilter('')
    lastFilterRef.current = ''
    setSearchHistoryIndex(null)
    setSearchHistoryOpen(false)
  }, [
    activeStationId,
    filter,
    filtered,
    idMap,
    normalizedFilter,
    pushSearchHistory,
  ])

  const grouped = useMemo(() => {
    const groups = new Map<string, DataFeature[]>()
    const order: string[] = []

    for (let id of filtered) {
      const feature = idMap.get(id)
      if (!feature) continue

      const key = getStationKey(feature)
      if (!groups.has(key)) {
        groups.set(key, [])
        order.push(key)
      }
      groups.get(key)!.push(feature)
    }

    return order
      .map((key) => groups.get(key))
      .filter((group): group is DataFeature[] => Array.isArray(group))
  }, [filtered, idMap])

  const timestampFormatter = useMemo(
    () =>
      (() => {
        const baseOptions: Intl.DateTimeFormatOptions = {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZoneName: 'short',
        }
        try {
          return new Intl.DateTimeFormat('en-US', {
            ...baseOptions,
            timeZone: settings.timezone || 'UTC',
            hour12: settings.hourFormat === '12h',
          })
        } catch {
          return new Intl.DateTimeFormat('en-US', {
            ...baseOptions,
            timeZone: 'UTC',
            hour12: settings.hourFormat === '12h',
          })
        }
      })(),
    [settings.timezone, settings.hourFormat],
  )

  const formatTimestamp = useCallback(
    (iso?: string) => {
      if (!iso) {
        return EM_DASH
      }

      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) {
        return EM_DASH
      }

      const formatted = timestampFormatter
        .format(date)
        .replace(',', '')
        .replace(/\s+/g, ' ')
        .trim()

      return formatted
    },
    [timestampFormatter],
  )

  const groupedWithTimestamp = useMemo(() => {
    return grouped.map((features) => {
      const candidateIds = features
        .map((feature) => {
          const propertyId = feature.properties.id
          if (propertyId !== undefined && propertyId !== null) {
            return String(propertyId)
          }
          const featureId = feature.id
          if (featureId !== undefined && featureId !== null) {
            return String(featureId)
          }
          return null
        })
        .filter((id): id is string => Boolean(id))

      let timestamp: string | undefined

      for (const key of candidateIds) {
        const iso = foundTimestamps[key]
        const formatted = formatTimestamp(iso)
        if (iso && formatted !== EM_DASH) {
          timestamp = formatted
          break
        }
      }

      if (!timestamp) {
        timestamp = formatTimestamp(undefined)
      }

      return {
        features,
        timestamp,
      }
    })
  }, [grouped, foundTimestamps, formatTimestamp])

  const hasResults = groupedWithTimestamp.length > 0
  const trimmedFilter = filter.trim()

  return (
    <div>
      <div className="sticky top-0 z-10 mb-4 space-y-3 bg-white pb-3 dark:bg-zinc-900">
        {grouped.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase text-zinc-900 dark:text-zinc-100">
              {t('stations', { count: grouped.length })}
            </p>

            <SortMenu
              sortOptions={sortOptions}
              sort={sort}
              setSort={setSort}
              disabled={disabled}
            />
          </div>
        )}

        <div className="relative">
          <label className="sr-only" htmlFor="found-stations-search">
            {t('searchFoundStations')}
          </label>
          <input
            id="found-stations-search"
            type="search"
            value={filter}
            onChange={(event) => {
              const value = event.target.value
              if (value === '' && lastFilterRef.current.trim().length > 0) {
                pushSearchHistory(lastFilterRef.current)
              }
              setSearchHistoryIndex(null)
              setFilter(value)
              lastFilterRef.current = value
            }}
            onKeyDown={(event) => {
              if (disabled) return

              if (event.key === 'ArrowUp') {
                if (searchHistory.length === 0) return
                event.preventDefault()
                setSearchHistoryIndex((prev) => {
                  const nextIndex =
                    prev === null ? searchHistory.length - 1 : Math.max(prev - 1, 0)
                  const nextValue = searchHistory[nextIndex]?.value ?? ''
                  setFilter(nextValue)
                  lastFilterRef.current = nextValue
                  return nextIndex
                })
                return
              }

              if (event.key === 'ArrowDown') {
                if (searchHistory.length === 0) return
                event.preventDefault()
                setSearchHistoryIndex((prev) => {
                  if (prev === null) return null
                  if (prev === searchHistory.length - 1) {
                    setFilter('')
                    lastFilterRef.current = ''
                    return null
                  }
                  const nextIndex = Math.min(prev + 1, searchHistory.length - 1)
                  const nextValue = searchHistory[nextIndex]?.value ?? ''
                  setFilter(nextValue)
                  lastFilterRef.current = nextValue
                  return nextIndex
                })
                return
              }

              if (event.key === 'Enter') {
                pushSearchHistory(filter)
                setSearchHistoryOpen(false)
              }
            }}
            disabled={disabled}
            className="w-full rounded-full border border-zinc-200 py-2 pl-3 pr-11 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-[#18181b] dark:bg-zinc-900/60 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            placeholder={t('searchFoundStations')}
          />
          <button
            type="button"
            aria-label="Show found station search history"
            title="Show found station search history"
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setSearchHistoryOpen((prev) => !prev)}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:text-zinc-300 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus:ring-zinc-600 dark:disabled:text-zinc-600"
          >
            <MdHistory className="h-5 w-5" aria-hidden="true" />
          </button>
          {searchHistoryOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm font-black text-zinc-950 dark:text-zinc-50">
                  Search history
                </p>
                <button
                  type="button"
                  onClick={() => setSearchHistoryOpen(false)}
                  aria-label="Close found station search history"
                  title="Close found station search history"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <MdClose className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div
                className="max-h-72 overflow-y-auto p-3"
                style={{ scrollbarGutter: 'stable' }}
              >
                {searchHistory.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                    No searches yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {[...searchHistory].reverse().map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setFilter(entry.value)
                          lastFilterRef.current = entry.value
                          setSearchHistoryIndex(null)
                          setSearchHistoryOpen(false)
                        }}
                        className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-left transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-800"
                      >
                        <span className="block truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">
                          {entry.value}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {formatTimestamp(entry.createdAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <ol className={classNames({ 'blur-md transition-all': hideLabels })}>
        {hasResults ? (
          groupedWithTimestamp.map(({ features, timestamp }) => (
            <GroupedLine
              key={getStationKey(features[0])}
              features={features}
              zoomToFeature={zoomToFeature}
              setHoveredId={setHoveredId}
              hoveredId={hoveredId}
              timestamp={timestamp}
              onStationFocus={onStationFocus}
              activeStationId={activeStationId}
              disabled={disabled}
              iconBasePath={iconBasePath}
            />
          ))
        ) : (
          <li className="rounded border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 dark:border-[#18181b] dark:text-zinc-300">
            {t('noStationsFound', {
              query: normalizedFilter ? trimmedFilter : undefined,
            })}
          </li>
        )}
      </ol>
    </div>
  )
}

const GroupedLine = memo(
  ({
    features,
    zoomToFeature,
    setHoveredId,
    hoveredId,
    timestamp,
    onStationFocus,
    activeStationId,
    disabled,
    iconBasePath,
  }: {
    features: DataFeature[]
    zoomToFeature: (id: number) => void
    setHoveredId: (id: number | null) => void
    hoveredId: number | null
    timestamp: string
    onStationFocus?: (id: number) => void
    activeStationId: number | null
    disabled?: boolean
    iconBasePath?: string | null
  } ) => {
    const { LINES, CITY_NAME, LINE_GROUPS = [] } = useConfig()
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'
    const buttonRef = useRef<HTMLDivElement | null>(null)
    const [nextIndex, setNextIndex] = useState(0)

    const lineOrderMap = useMemo(() => {
      const orderMap = new Map<string, number>()
      let groupIndex = 0

      for (const group of LINE_GROUPS) {
        for (const item of group.items ?? []) {
          if (item.type === 'lines') {
            const lines = item.lines ?? []
            lines.forEach((line, idx) => {
              if (!orderMap.has(line)) {
                orderMap.set(line, groupIndex * 1000 + idx)
              }
            })
            groupIndex += 1
          } else if (item.type === 'separator') {
            groupIndex += 1
          }
        }
      }

      return orderMap
    }, [LINE_GROUPS])

    const featureIds = useMemo(() => {
      return features
        .map((feature) => getFeatureNumericId(feature))
        .filter((id): id is number => typeof id === 'number')
    }, [features])

    const featureIdKey = featureIds.join('|')
    const nextId = featureIds[nextIndex] ?? featureIds[0] ?? null
    const lineIds = useMemo(() => {
      const ids = new Set<string>()

      for (const feature of features) {
        const rawLine = (
          feature?.properties as { line?: string | string[] | null } | undefined
        )?.line

        if (typeof rawLine === 'string') {
          const trimmed = rawLine.trim()
          if (trimmed) {
            ids.add(trimmed)
          }
        } else if (Array.isArray(rawLine)) {
          for (const maybeLine of rawLine) {
            if (typeof maybeLine === 'string') {
              const trimmed = maybeLine.trim()
              if (trimmed) {
                ids.add(trimmed)
              }
            }
          }
        }
      }

      return Array.from(ids).sort((a, b) => {
        const aOrder =
          LINES[a]?.order ??
          lineOrderMap.get(a) ??
          Number.MAX_SAFE_INTEGER
        const bOrder =
          LINES[b]?.order ??
          lineOrderMap.get(b) ??
          Number.MAX_SAFE_INTEGER
        if (aOrder !== bOrder) {
          return aOrder - bOrder
        }
        return a.localeCompare(b)
      })
    }, [features, LINES, lineOrderMap])

    useEffect(() => {
      // Reset cycling when the available feature set changes
      setNextIndex(0)
    }, [featureIdKey])

    const isHovered = hoveredId !== null && featureIds.includes(hoveredId)
    const isActive =
      activeStationId !== null && featureIds.includes(activeStationId)
    const displayName = getDisplayName(features[0])

    useEffect(() => {
      if (isActive && buttonRef.current) {
        buttonRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, [isActive])

    return (
      <li
        key={getStationKey(features[0])}
        className="transition-opacity duration-200 ease-out"
      >
        <div
          ref={buttonRef}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={displayName}
          aria-disabled={disabled}
          onClick={() => {
            const selection = window.getSelection()
            const hasSelection =
              selection &&
              selection.type === 'Range' &&
              selection.toString().length > 0
            if (hasSelection) {
              return
            }
            if (disabled) return
            if (typeof nextId !== 'number' || featureIds.length === 0) return
            zoomToFeature(nextId)
            onStationFocus?.(nextId)
            setHoveredId(nextId)
            setNextIndex((prev) => {
              const count = featureIds.length
              if (count === 0) return 0
              return (prev + 1) % count
            })
          }}
          onKeyDown={(event) => {
            if (disabled) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              if (typeof nextId !== 'number' || featureIds.length === 0) return
              zoomToFeature(nextId)
              onStationFocus?.(nextId)
              setHoveredId(nextId)
              setNextIndex((prev) => {
                const count = featureIds.length
                if (count === 0) return 0
                return (prev + 1) % count
              })
            }
          }}
          onMouseOver={() => {
            const selection = window.getSelection()
            const hasSelection =
              selection &&
              selection.type === 'Range' &&
              selection.toString().length > 0
            if (isGlobalMouseDown || hasSelection) return
            setHoveredId(nextId ?? null)
          }}
          onMouseOut={() => {
            const selection = window.getSelection()
            const hasSelection =
              selection &&
              selection.type === 'Range' &&
              selection.toString().length > 0
            if (isGlobalMouseDown || hasSelection) return
            setHoveredId(null)
          }}
          className={classNames(
            'flex w-full items-start gap-3 rounded border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors dark:border-[#18181b] dark:bg-zinc-900 dark:text-zinc-100 select-text',
            {
              'bg-yellow-200 shadow-sm dark:bg-amber-300/40': isHovered,
              'ring-2 ring-[var(--accent-ring)] shadow-lg dark:ring-[var(--accent-ring)]': isActive,
              'cursor-not-allowed opacity-60': disabled,
              'cursor-pointer': !disabled,
            },
          )}
          aria-pressed={isActive}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
            <div className="flex flex-wrap items-center gap-1">
              {lineIds.map((lineId) => {
                return (
                  <LineBadge
                    key={lineId}
                    lineId={lineId}
                    line={LINES[lineId]}
                    iconBasePath={iconBasePath}
                    defaultFit="cover"
                    className="flex-shrink-0"
                  />
                )
              })}
            </div>
            <span
              className={classNames(
                'min-w-0 text-sm font-medium leading-tight transition-colors',
                isDark && isHovered
                  ? 'text-white'
                  : 'text-zinc-900 dark:text-zinc-100',
              )}
            >
              {displayName}
            </span>
          </div>
          <div className="ml-auto flex items-baseline gap-2">
            <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-300 select-none">
              {timestamp}
            </span>
          </div>
        </div>
      </li>
    )
  },
)
GroupedLine.displayName = 'GroupedLine'

export default FoundList

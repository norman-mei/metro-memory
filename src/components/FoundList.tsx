'use client'

import { Transition } from '@headlessui/react'
import classNames from 'classnames'
import SortMenu from '@/components/SortMenu'
import { memo, useCallback, useMemo, useState } from 'react'
import { SortOption, DataFeature, SortOptionType } from '@/lib/types'
import { DateAddedIcon } from './DateAddedIcon'
import { sortBy } from 'lodash'
import Image from 'next/image'
import { useConfig } from '@/lib/configContext'
import useTranslation from '@/hooks/useTranslation'

const getStationKey = (feature: DataFeature) => {
  const propertiesWithCluster = feature.properties as typeof feature.properties & {
    cluster_key?: number | string
  }

  if (
    propertiesWithCluster?.cluster_key !== undefined &&
    propertiesWithCluster?.cluster_key !== null
  ) {
    return `cluster|${propertiesWithCluster.cluster_key}`
  }

  const name = (feature.properties.name ?? '').trim().toLowerCase()
  if (
    feature.geometry?.type === 'Point' &&
    Array.isArray(feature.geometry.coordinates)
  ) {
    const [lng, lat] = feature.geometry.coordinates as number[]
    const formattedLng =
      typeof lng === 'number' ? lng.toFixed(6) : String(lng)
    const formattedLat =
      typeof lat === 'number' ? lat.toFixed(6) : String(lat)
    return `${name}|${formattedLng}|${formattedLat}`
  }
  return `${name}|${feature.id ?? ''}`
}

const getDisplayName = (feature: DataFeature) => {
  const propertiesWithDisplay = feature.properties as typeof feature.properties & {
    display_name?: string
  }
  return (
    propertiesWithDisplay.display_name ??
    feature.properties.name ??
    ''
  )
}
const FoundList = ({
  found,
  idMap,
  setHoveredId,
  hoveredId,
  hideLabels,
  zoomToFeature,
  foundTimestamps,
}: {
  found: number[]
  idMap: Map<number, DataFeature>
  setHoveredId: (id: number | null) => void
  hoveredId: number | null
  hideLabels?: boolean
  zoomToFeature: (id: number) => void
  foundTimestamps: Record<string, string>
}) => {
  const { LINES } = useConfig()
  const { t } = useTranslation()

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

      case 'name':
        return sortBy(ids, (id) => {
          const feature = idMap.get(id)
          if (!feature) return ''
          return getDisplayName(feature).toLowerCase()
        })

      case 'name-desc':
        return sortBy(ids, (id) => {
          const feature = idMap.get(id)
          if (!feature) return ''
          return getDisplayName(feature).toLowerCase()
        }).reverse()

      case 'line':
        return sortBy(
          ids,
          (id) => {
            const feature = idMap.get(id)
            if (!feature) return Number.MAX_SAFE_INTEGER
            const line = feature.properties.line
            if (!line) return Number.MAX_SAFE_INTEGER
            return LINES[line]?.order ?? Number.MAX_SAFE_INTEGER
          },
          (id) => {
            const feature = idMap.get(id)
            if (!feature) return Number.MAX_SAFE_INTEGER
            const propertiesWithOrder = feature.properties as typeof feature.properties & {
              order?: number
            }
            if (typeof propertiesWithOrder.order === 'number') {
              return propertiesWithOrder.order
            }
            return getDisplayName(feature).toLowerCase()
          },
        )

      default:
        return ids
    }
  }, [found, sort, idMap, LINES, foundTimestamps])

  const normalizedFilter = filter.trim().toLowerCase()

  const directionAliases = new Map<string, string[]>([
    ['e', ['east', 'e']],
    ['east', ['east', 'e']],
    ['w', ['west', 'w']],
    ['west', ['west', 'w']],
    ['n', ['north', 'n']],
    ['north', ['north', 'n']],
    ['s', ['south', 's']],
    ['south', ['south', 's']],
  ])

  const activeDirectionAliases = directionAliases.get(normalizedFilter) ?? null

  const filtered = useMemo(() => {
    const tokenize = (value: string) =>
      value
        .split(/\s+/)
        .map((token) => token.replace(/[^a-z0-9]/g, ''))
        .filter(Boolean)

    if (!normalizedFilter) {
      return sorted
    }

    return sorted.filter((id) => {
      const feature = idMap.get(id)
      if (!feature) return false

      const displayName = getDisplayName(feature).toLowerCase()
      if (displayName.includes(normalizedFilter)) {
        return true
      }

      if (activeDirectionAliases) {
        const tokens = tokenize(displayName)
        if (tokens.some((token) => activeDirectionAliases.includes(token))) {
          return true
        }
      }

      const alternates = (
        feature.properties as typeof feature.properties & {
          alternate_names?: string[]
        }
      ).alternate_names
      if (Array.isArray(alternates)) {
        if (
          alternates.some((alias) =>
            alias.toLowerCase().includes(normalizedFilter),
          )
        ) {
          return true
        }

        if (activeDirectionAliases) {
          return alternates.some((alias) => {
            const tokens = tokenize(alias.toLowerCase())
            return tokens.some((token) =>
              activeDirectionAliases.includes(token),
            )
          })
        }
      }

      return false
    })
  }, [sorted, normalizedFilter, idMap, activeDirectionAliases])

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
      new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }),
    [],
  )

  const formatTimestamp = useCallback(
    (iso?: string) => {
      if (!iso) {
        return '—'
      }

      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) {
        return '—'
      }

      const formatted = timestampFormatter
        .format(date)
        .replace(',', '')
        .replace(/\s+/g, ' ')
        .trim()

      return `${formatted} UTC`
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
        if (iso && formatted !== '—') {
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

  const hasStations = groupedWithTimestamp.length > 0

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm uppercase text-zinc-900 text-opacity-75 dark:text-zinc-200 dark:text-opacity-90">
            {t('stations', { count: grouped.length })}
          </p>

          {grouped.length > 0 && (
            <SortMenu sortOptions={sortOptions} sort={sort} setSort={setSort} />
          )}
        </div>

        <div>
          <label className="sr-only" htmlFor="found-stations-search">
            {t('searchFoundStations')}
          </label>
          <input
            id="found-stations-search"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-300"
            placeholder={t('searchFoundStations')}
          />
        </div>
      </div>
      {hasStations ? (
        <ol className={classNames({ 'blur-md transition-all': hideLabels })}>
          {groupedWithTimestamp.map(({ features, timestamp }) => (
            <GroupedLine
              key={getStationKey(features[0])}
              features={features}
              zoomToFeature={zoomToFeature}
              setHoveredId={setHoveredId}
              hoveredId={hoveredId}
              timestamp={timestamp}
            />
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-300">
          {t('noStationsFound', { query: filter.trim() })}
        </div>
      )}
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
  }: {
    features: DataFeature[]
    zoomToFeature: (id: number) => void
    setHoveredId: (id: number | null) => void
    hoveredId: number | null
    timestamp: string
  }) => {
    const { LINES } = useConfig()
    const times = features.length

    const primaryFeature = features[0]
    const resolvedId =
      typeof primaryFeature.id === 'number'
        ? primaryFeature.id
        : typeof primaryFeature.properties.id === 'number'
        ? primaryFeature.properties.id
        : undefined

    const lineIds = Array.from(
      new Set(
        features
          .map((feature) => feature.properties.line)
          .filter((line): line is string => Boolean(line)),
      ),
    ).sort((a, b) => {
      const orderA = LINES[a]?.order ?? Number.MAX_SAFE_INTEGER
      const orderB = LINES[b]?.order ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.localeCompare(b)
    })

    const displayName = getDisplayName(primaryFeature)

    const isHovered = features.some((feature) => {
      const candidateId =
        typeof feature.id === 'number'
          ? feature.id
          : typeof feature.properties.id === 'number'
          ? feature.properties.id
          : undefined
      return candidateId === hoveredId
    })

    const handleClick = () => {
      if (resolvedId !== undefined) {
        zoomToFeature(resolvedId)
      }
    }

    const handleMouseOver = () => {
      if (resolvedId !== undefined) {
        setHoveredId(resolvedId)
      }
    }

    return (
      <Transition
        appear
        as="li"
        key={getStationKey(features[0])}
        show
        enter="transition duration-200 ease-out"
        enterFrom="opacity-0 -translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-150 ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <button
          onClick={handleClick}
          onMouseOver={handleMouseOver}
          onMouseOut={() => setHoveredId(null)}
          className={classNames(
            'flex w-full items-start gap-3 rounded border border-zinc-200 px-3 py-2 text-sm transition-colors bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
            {
              'bg-yellow-200 shadow-sm dark:bg-amber-300/40 dark:text-zinc-950':
                isHovered,
            },
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
            <div className="flex flex-wrap items-center gap-1">
              {lineIds.map((lineId) => (
                <Image
                  key={lineId}
                  alt={lineId}
                  src={`/images/${lineId}.svg`}
                  width={64}
                  height={64}
                  className="h-5 w-5 flex-shrink-0 object-contain"
                />
              ))}
            </div>
            <span className="min-w-0 text-sm font-medium leading-tight">
              {displayName}
            </span>
          </div>
          <div className="ml-4 flex flex-none items-baseline gap-2">
            {times > 1 && (
              <span className="text-xs font-light text-gray-500 dark:text-gray-300">
                ×{times}
              </span>
            )}
            <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-300">
              {timestamp}
            </span>
          </div>
        </button>
      </Transition>
    )
  },
)
GroupedLine.displayName = 'GroupedLine'

export default FoundList

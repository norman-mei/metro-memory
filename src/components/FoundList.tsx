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
          return feature?.properties.name?.toLowerCase() ?? ''
        })

      case 'name-desc':
        return sortBy(ids, (id) => {
          const feature = idMap.get(id)
          return feature?.properties.name?.toLowerCase() ?? ''
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
  }, [found, sort, idMap, LINES, foundTimestamps])

  const normalizedFilter = filter.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!normalizedFilter) {
      return sorted
    }

    return sorted.filter((id) => {
      const feature = idMap.get(id)
      if (!feature) return false

      const name = feature.properties.name?.toLowerCase() ?? ''
      if (name.includes(normalizedFilter)) {
        return true
      }

      const alternates = feature.properties.alternate_names
      if (Array.isArray(alternates)) {
        return alternates.some((alias) =>
          alias.toLowerCase().includes(normalizedFilter),
        )
      }

      return false
    })
  }, [sorted, normalizedFilter, idMap])

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

  return (
    <div>
      {grouped.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase text-zinc-900 text-opacity-75">
              {t('stations', { count: grouped.length })}
            </p>

            <SortMenu sortOptions={sortOptions} sort={sort} setSort={setSort} />
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
      )}
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
          onClick={() => zoomToFeature(features[0].properties.id!)}
          onMouseOver={() => setHoveredId(+features[0].id!)}
          onMouseOut={() => setHoveredId(null)}
          className={classNames(
            'flex w-full items-start gap-2 rounded px-2 py-2 text-sm',
            {
              'bg-yellow-200 shadow-sm': features.some(
                (f) => f.id === hoveredId,
              ),
            },
          )}
        >
          <div className="ml-2.5 flex min-w-0 flex-col items-start gap-1 text-left">
            <div className="flex flex-wrap items-center gap-0.5">
              {sortBy(
                features,
                (f) => LINES[f.properties.line || '']?.order,
              ).map((feature) => (
                <Image
                  key={feature.id!}
                  alt={feature.properties.line || ''}
                  src={`/images/${feature.properties.line}.svg`}
                  width={64}
                  height={64}
                  className="h-5 w-5 flex-shrink-0 object-contain"
                />
              ))}
            </div>
            <span className="text-sm font-medium leading-tight">
              {features[0].properties.name}
            </span>
          </div>
          <div className="ml-auto flex items-baseline gap-2">
            {times > 1 && (
              <span className="text-xs font-light text-gray-500">
                ×{times}
              </span>
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">
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

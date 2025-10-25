'use client'

import classNames from 'classnames'
import { useState, KeyboardEventHandler, useCallback } from 'react'
import Fuse from 'fuse.js'
import { DataFeature } from '@/lib/types'
import { Transition } from '@headlessui/react'
import { Feature, Point } from 'geojson'
import useTranslation from '@/hooks/useTranslation'
import useNormalizeString from '@/hooks/useNormalizeString'
import usePushEvent from '@/hooks/usePushEvent'

const Input = ({
  fuse,
  found,
  setFound,
  setFoundTimestamps,
  setIsNewPlayer,
  inputRef,
  map,
  idMap,
  clusterGroups,
  autoFocus = true,
}: {
  fuse: Fuse<DataFeature>
  found: number[]
  setFound: (found: number[]) => void
  setFoundTimestamps: (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => void
  setIsNewPlayer: (isNewPlayer: boolean) => void
  inputRef: React.RefObject<HTMLInputElement>
  map: mapboxgl.Map | null
  idMap: Map<number, DataFeature>
  clusterGroups: Map<number, number[]>
  autoFocus?: boolean
}) => {
  const { t } = useTranslation()
  const normalizeString = useNormalizeString()
  const [search, setSearch] = useState<string>('')
  const [wrong, setWrong] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const [alreadyFound, setAlreadyFound] = useState<boolean>(false)
  const pushEvent = usePushEvent()

  const zoomToStation = useCallback(
    (id: number) => {
      if (map) {
        const feature = idMap.get(id) as Feature<Point>

        if (!feature) return
        const [lng, lat] = feature.geometry.coordinates
        map.flyTo({
          center: [lng, lat],
          zoom: 13,
          duration: 200,
        })
      }
    },
    [map, idMap],
  )

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key !== 'Enter') return
      if (!search) return

      e.preventDefault()

      try {
        const sanitizedSearch = normalizeString(search)
        const results = fuse.search(sanitizedSearch)
        const foundSet = new Set(found || [])
        const candidateSet = new Set<number>()
        let hasCandidate = false

        for (let i = 0; i < results.length; i++) {
          const result = results[i]
          if (
            result.matches &&
            result.matches.length > 0 &&
            result.matches.some(
              (match) =>
                match.indices[0][0] === 0 &&
                match.value!.length - match.indices[match.indices.length - 1][1] <
                  2 &&
                Math.abs(match.value!.length - sanitizedSearch.length) < 4,
            )
          ) {
            const id = Number(result.item.id)
            if (Number.isFinite(id)) {
              hasCandidate = true
              candidateSet.add(id)
            }
          }
        }

        const expandedSet = new Set<number>()
        candidateSet.forEach((id) => {
          expandedSet.add(id)
          const feature = idMap.get(id)
          if (!feature) {
            return
          }

          const propertiesWithCluster = feature.properties as typeof feature.properties & {
            cluster_key?: number | string
          }
          const clusterKey = propertiesWithCluster?.cluster_key
          if (clusterKey !== undefined && clusterKey !== null) {
            const clusterMembers = clusterGroups.get(Number(clusterKey))
            if (clusterMembers && clusterMembers.length > 0) {
              clusterMembers.forEach((memberId) => expandedSet.add(memberId))
            }
          }
        })

        const finalMatches: number[] = []
        let someAlreadyFound = false

        expandedSet.forEach((id) => {
          if (foundSet.has(id)) {
            someAlreadyFound = true
          } else {
            finalMatches.push(id)
          }
        })

        if (finalMatches.length === 0) {
          if (someAlreadyFound || hasCandidate) {
            setAlreadyFound(true)
            setTimeout(() => setAlreadyFound(false), 1200)
          } else {
            setWrong(true)
            setTimeout(() => setWrong(false), 500)
          }
          return
        }

        setSuccess(true)
        setTimeout(() => setSuccess(false), 250)
        if (map && (map as any).style) {
          const hoveredSource = map.getSource('hovered') as
            | mapboxgl.GeoJSONSource
            | undefined

          if (hoveredSource) {
            hoveredSource.setData({
              type: 'FeatureCollection',
              features: Array.from(expandedSet)
                .map((id) => idMap.get(id))
                .filter((feature): feature is DataFeature => Boolean(feature)),
            })

            setTimeout(() => {
              if (!map || !(map as any).style) {
                return
              }

              const resetSource = map.getSource('hovered') as
                | mapboxgl.GeoJSONSource
                | undefined

              resetSource?.setData({
                type: 'FeatureCollection',
                features: [],
              })
            }, 1500)
          }
        }

        zoomToStation(finalMatches[0])
        const nextFound = Array.from(new Set([...foundSet, ...finalMatches]))
        setFound(nextFound)
        setFoundTimestamps((prev) => {
          const next = { ...prev }
          const timestamp = new Date().toISOString()
          for (const id of finalMatches) {
            const key = String(id)
            if (!next[key]) {
              next[key] = timestamp
            }
          }
          return next
        })
        setIsNewPlayer(false)
        setSearch('')
        pushEvent(finalMatches)
      } catch (error) {
        console.error(error)
        setWrong(true)
        setTimeout(() => setWrong(false), 500)
      }
    },
    [
      search,
      setSearch,
      fuse,
      found,
      setFound,
      setFoundTimestamps,
      setWrong,
      setIsNewPlayer,
      map,
      idMap,
      clusterGroups,
      zoomToStation,
      normalizeString,
      pushEvent,
    ],
  )

  return (
    <div className="relative grow">
      <input
        className={classNames(
          {
            'animate animate-shake': wrong,
            'shadow-md !shadow-yellow-500': success,
          },
          'relative z-40 w-full rounded-full border border-zinc-200 bg-white px-4 py-2 text-lg font-bold text-zinc-900 caret-current shadow-lg outline-none ring-zinc-800 transition-shadow duration-300 focus:ring-2 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400',
        )}
        ref={inputRef}
        placeholder={t('inputPlaceholder')}
        value={search}
        onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
        id="input"
        type="text"
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
      ></input>
      <Transition
        show={alreadyFound}
        as="div"
        className="pointer-events-none absolute right-0 top-0 z-50 my-auto mt-1 flex h-auto items-center"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-500"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="my-1 mr-2 flex items-center justify-center rounded-full border-green-400 bg-green-200 px-2 py-1 text-sm font-bold text-green-800">
          {t('alreadyFound')}
        </div>
      </Transition>
    </div>
  )
}

export default Input

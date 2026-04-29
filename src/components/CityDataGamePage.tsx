'use client'

import GamePage from '@/components/GamePage'
import { useConfig } from '@/lib/configContext'
import { DataFeatureCollection, RoutesFeatureCollection } from '@/lib/types'
import { useEffect, useMemo, useState } from 'react'

type CityDataPayload = {
  features: DataFeatureCollection
  routes: RoutesFeatureCollection
}

type LoadState =
  | { status: 'loading'; payload?: never; message?: never }
  | { status: 'loaded'; payload: CityDataPayload; message?: never }
  | { status: 'error'; payload?: never; message: string }

type CityDataGamePageProps = {
  excludeRouteLines?: string[]
  normalizeRouteColors?: boolean
  slug: string
}

export default function CityDataGamePage({
  excludeRouteLines = [],
  normalizeRouteColors = false,
  slug,
}: CityDataGamePageProps) {
  const config = useConfig()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    setState({ status: 'loading' })

    fetch(`/city-data/${slug}.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`City data request failed with ${response.status}`)
        }
        return response.json() as Promise<CityDataPayload>
      })
      .then((payload) => {
        setState({ status: 'loaded', payload })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        setState({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'City data could not load',
        })
      })

    return () => {
      controller.abort()
    }
  }, [slug])

  const filteredPayload = useMemo(() => {
    if (state.status !== 'loaded') {
      return null
    }

    return {
      features: {
        ...state.payload.features,
        features: state.payload.features.features.filter((feature) => {
          const line = feature.properties?.line
          return typeof line === 'string' && !!config.LINES[line]
        }),
      } as DataFeatureCollection,
      routes: {
        ...state.payload.routes,
        features: state.payload.routes.features
          .filter((feature) => {
            const line = feature.properties?.line
            return (
              !!line &&
              Boolean(config.LINES[line]) &&
              !excludeRouteLines.includes(line)
            )
          })
          .map((feature) => {
            if (!normalizeRouteColors) {
              return feature
            }

            const line = feature.properties.line
            if (typeof line !== 'string') {
              return feature
            }
            const defaultColor = config.LINES[line]?.color ?? '#1d2835'
            const rawColor = feature.properties.color
            const color =
              typeof rawColor === 'string' && rawColor.length > 0
                ? rawColor
                : defaultColor

            return {
              ...feature,
              properties: {
                ...feature.properties,
                color,
              },
            }
          }),
      } as RoutesFeatureCollection,
    }
  }, [config.LINES, excludeRouteLines, normalizeRouteColors, state])

  if (state.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-red-600 dark:text-red-300">
        {state.message}
      </div>
    )
  }

  if (!filteredPayload) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
        Loading map...
      </div>
    )
  }

  return (
    <GamePage fc={filteredPayload.features} routes={filteredPayload.routes} />
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'

import GamePage from '@/components/GamePage'
import { DataFeatureCollection, RoutesFeatureCollection } from '@/lib/types'

import config from './config'

const buildRoutesCollection = (data: RoutesFeatureCollection) => {
  return {
    ...data,
    features: data.features.filter((feature) => {
      const line = feature.properties?.line
      return line ? Boolean(config.LINES[line]) : false
    }),
  } as RoutesFeatureCollection
}

type AmtrakGameClientProps = {
  fc: DataFeatureCollection
}

export default function AmtrakGameClient({ fc }: AmtrakGameClientProps) {
  const [routes, setRoutes] = useState<RoutesFeatureCollection | undefined>(undefined)

  useEffect(() => {
    let active = true

    const loadRoutes = async () => {
      try {
        const response = await fetch('/api/amtrak-data/routes')
        if (!response.ok) {
          throw new Error(`Failed to load Amtrak routes: ${response.status}`)
        }

        const payload = (await response.json()) as RoutesFeatureCollection
        if (!active) return
        setRoutes(buildRoutesCollection(payload))
      } catch (error) {
        console.error(error)
      }
    }

    loadRoutes()

    return () => {
      active = false
    }
  }, [])

  const content = useMemo(
    () => <GamePage fc={fc} routes={routes} />,
    [fc, routes],
  )

  return content
}

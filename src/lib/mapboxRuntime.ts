'use client'

import type mapboxgl from 'mapbox-gl'

import { isNativeMobileRuntime } from '@/lib/capacitorMapboxOffline'

type MutableMapbox = typeof mapboxgl & {
  workerUrl?: string
}

let configured = false

export const configureMapboxRuntime = (mapbox: typeof mapboxgl) => {
  if (configured) {
    return
  }

  configured = true

  if (typeof window === 'undefined' || !isNativeMobileRuntime()) {
    return
  }

  ;(mapbox as MutableMapbox).workerUrl = '/mapbox-gl-csp-worker.js'
}

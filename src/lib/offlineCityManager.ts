'use client'

import { downloadNativeMapRegion } from '@/lib/capacitorMapboxOffline'

export type OfflineCityRecord = {
  citySlug: string
  downloadedAt: string
  assetCount: number
  mapDownloaded: boolean
  version: string
}

type OfflineManifest = {
  generatedAt?: string
  assets?: string[]
  cityAssets?: Record<string, string[]>
}

const OFFLINE_CITIES_KEY = 'mm-offline-cities-v1'

const readJson = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const listOfflineCities = (): OfflineCityRecord[] => {
  if (typeof window === 'undefined') {
    return []
  }
  return readJson<OfflineCityRecord[]>(
    window.localStorage.getItem(OFFLINE_CITIES_KEY),
  ) ?? []
}

const writeOfflineCities = (records: OfflineCityRecord[]) => {
  window.localStorage.setItem(OFFLINE_CITIES_KEY, JSON.stringify(records))
  window.dispatchEvent(new Event('metro-offline-cities-change'))
}

const getServiceWorkerController = async () => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return null
  }
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller
  }
  const registration = await navigator.serviceWorker.ready.catch(() => null)
  return registration?.active ?? null
}

const postToServiceWorker = async <T>(type: string, payload: unknown) => {
  const controller = await getServiceWorkerController()
  if (!controller) {
    throw new Error('Service worker is not ready')
  }
  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Service worker request timed out'))
    }, 30_000)
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeoutId)
      const data = event.data
      if (data?.ok) {
        resolve(data as T)
      } else {
        reject(new Error(data?.error ?? 'Service worker request failed'))
      }
    }
    controller.postMessage({ type, payload }, [channel.port2])
  })
}

export const fetchOfflineManifest = async () => {
  const response = await fetch('/offline-manifest.json', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Unable to load offline manifest')
  }
  return (await response.json()) as OfflineManifest
}

export const downloadCityForOffline = async (citySlug: string) => {
  const manifest = await fetchOfflineManifest()
  const cityAssets = manifest.cityAssets?.[citySlug] ?? [
    `/city-data/${citySlug}.json`,
    `/city-icons/${citySlug}.ico`,
    `/city-cards/${citySlug}.jpg`,
  ]
  const assets = Array.from(new Set(['/', '/manifest.webmanifest', ...cityAssets]))
  await postToServiceWorker('CACHE_CITY', { citySlug, assets })

  const nativeMap = await downloadNativeMapRegion({ citySlug })
  const record: OfflineCityRecord = {
    citySlug,
    downloadedAt: new Date().toISOString(),
    assetCount: assets.length,
    mapDownloaded: nativeMap.ok,
    version: manifest.generatedAt ?? 'unknown',
  }
  const next = [
    ...listOfflineCities().filter((entry) => entry.citySlug !== citySlug),
    record,
  ].sort((a, b) => a.citySlug.localeCompare(b.citySlug))
  writeOfflineCities(next)
  return record
}

export const deleteOfflineCity = async (citySlug: string) => {
  await postToServiceWorker('DELETE_CITY', { citySlug }).catch(() => null)
  writeOfflineCities(
    listOfflineCities().filter((entry) => entry.citySlug !== citySlug),
  )
}

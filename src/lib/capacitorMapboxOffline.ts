'use client'

import { Capacitor, registerPlugin } from '@capacitor/core'

type OfflineRegionOptions = {
  citySlug: string
  bounds?: [number, number, number, number]
  minZoom?: number
  maxZoom?: number
  styleUrl?: string
}

type MapboxOfflinePlugin = {
  downloadRegion: (options: OfflineRegionOptions) => Promise<{ ok: boolean }>
  deleteRegion: (options: { citySlug: string }) => Promise<{ ok: boolean }>
  getRegionStatus: (options: { citySlug: string }) => Promise<{
    downloaded: boolean
    completedResourceCount?: number
    completedResourceSize?: number
  }>
}

const MapboxOffline = registerPlugin<MapboxOfflinePlugin>('MapboxOffline')

export const isNativeMobileRuntime = () => Capacitor.isNativePlatform()

export const downloadNativeMapRegion = async (options: OfflineRegionOptions) => {
  if (!isNativeMobileRuntime()) {
    return { ok: false, reason: 'native-runtime-required' as const }
  }
  try {
    const result = await MapboxOffline.downloadRegion({
      minZoom: 8,
      maxZoom: 13,
      ...options,
    })
    return { ok: Boolean(result.ok), reason: null }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'native-plugin-error',
    }
  }
}

export const deleteNativeMapRegion = async (citySlug: string) => {
  if (!isNativeMobileRuntime()) {
    return { ok: false, reason: 'native-runtime-required' as const }
  }
  try {
    const result = await MapboxOffline.deleteRegion({ citySlug })
    return { ok: Boolean(result.ok), reason: null }
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'native-plugin-error',
    }
  }
}

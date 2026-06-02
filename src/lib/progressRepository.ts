'use client'

import { apiFetch } from '@/lib/apiClient'
import {
  mergeProgressPayloads,
  normalizeProgressIds,
  normalizeProgressTimestamps,
  type ProgressPayload,
} from '@/lib/progressMerge'

export type LocalProgressRecord = ProgressPayload & {
  citySlug: string
  updatedAt: string
  dirty: boolean
  deviceId: string
  lastSyncedAt: string | null
}

type SyncResult = {
  ok: boolean
  records: Array<{ citySlug: string; foundCount: number; lastSyncedAt: string }>
}

const PROGRESS_PREFIX = 'mm-progress-v1:'
const DEVICE_ID_KEY = 'mm-device-id'
const SYNC_STATUS_KEY = 'mm-progress-sync-status'
const PROGRESS_EVENT = 'local-progress-refresh'

const nowIso = () => new Date().toISOString()

const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const getProgressStorageKey = (citySlug: string) =>
  `${PROGRESS_PREFIX}${citySlug}`

export const getDeviceId = () => {
  if (typeof window === 'undefined') {
    return 'server'
  }
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) {
    return existing
  }
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`
  window.localStorage.setItem(DEVICE_ID_KEY, generated)
  return generated
}

export const readLegacyProgress = (citySlug: string): ProgressPayload | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const foundIds = normalizeProgressIds(
    safeJsonParse<unknown>(window.localStorage.getItem(`${citySlug}-stations`)),
  )
  const foundTimestamps = normalizeProgressTimestamps(
    safeJsonParse<unknown>(
      window.localStorage.getItem(`${citySlug}-stations-found-at`),
    ),
  )
  if (foundIds.length === 0 && Object.keys(foundTimestamps).length === 0) {
    return null
  }
  return { foundIds, foundTimestamps }
}

export const readLocalProgress = (
  citySlug: string,
): LocalProgressRecord | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = safeJsonParse<LocalProgressRecord>(
    window.localStorage.getItem(getProgressStorageKey(citySlug)),
  )
  const legacy = readLegacyProgress(citySlug)
  if (!stored && !legacy) {
    return null
  }

  const merged = mergeProgressPayloads(stored, legacy)
  return {
    citySlug,
    foundIds: merged.foundIds,
    foundTimestamps: merged.foundTimestamps,
    updatedAt: stored?.updatedAt ?? nowIso(),
    dirty: stored?.dirty ?? Boolean(legacy),
    deviceId: stored?.deviceId ?? getDeviceId(),
    lastSyncedAt: stored?.lastSyncedAt ?? null,
  }
}

export const writeLocalProgress = (
  citySlug: string,
  payload: ProgressPayload,
  options: { dirty?: boolean; lastSyncedAt?: string | null } = {},
) => {
  if (typeof window === 'undefined') {
    return null
  }

  const current = readLocalProgress(citySlug)
  const merged = mergeProgressPayloads(current, payload)
  const record: LocalProgressRecord = {
    citySlug,
    foundIds: merged.foundIds,
    foundTimestamps: merged.foundTimestamps,
    updatedAt: nowIso(),
    dirty: options.dirty ?? current?.dirty ?? true,
    deviceId: current?.deviceId ?? getDeviceId(),
    lastSyncedAt:
      options.lastSyncedAt === undefined
        ? current?.lastSyncedAt ?? null
        : options.lastSyncedAt,
  }

  window.localStorage.setItem(getProgressStorageKey(citySlug), JSON.stringify(record))
  window.localStorage.setItem(`${citySlug}-stations`, JSON.stringify(record.foundIds))
  window.localStorage.setItem(
    `${citySlug}-stations-found-at`,
    JSON.stringify(record.foundTimestamps ?? {}),
  )
  window.localStorage.setItem(
    `${citySlug}-stations-is-new-player`,
    record.foundIds.length > 0 ? 'false' : 'true',
  )
  window.dispatchEvent(new Event(PROGRESS_EVENT))
  return record
}

export const clearLocalProgressRecord = (citySlug: string) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(getProgressStorageKey(citySlug))
  window.localStorage.removeItem(`${citySlug}-stations`)
  window.localStorage.removeItem(`${citySlug}-stations-found-at`)
  window.localStorage.removeItem(`${citySlug}-stations-is-new-player`)
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}

export const listLocalProgressRecords = () => {
  if (typeof window === 'undefined') {
    return []
  }
  const records: LocalProgressRecord[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(PROGRESS_PREFIX)) {
      continue
    }
    const citySlug = key.slice(PROGRESS_PREFIX.length)
    const record = readLocalProgress(citySlug)
    if (record) {
      records.push(record)
    }
  }
  return records
}

export const getProgressSyncStatus = () => {
  if (typeof window === 'undefined') {
    return null
  }
  return safeJsonParse<{
    state: 'idle' | 'syncing' | 'synced' | 'error'
    lastSyncedAt: string | null
    error?: string
  }>(window.localStorage.getItem(SYNC_STATUS_KEY))
}

const setProgressSyncStatus = (
  status: NonNullable<ReturnType<typeof getProgressSyncStatus>>,
) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status))
  window.dispatchEvent(new Event('metro-progress-sync-status'))
}

export const fetchRemoteProgress = async (citySlug: string) => {
  const response = await apiFetch(`/api/progress/${citySlug}`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    return null
  }
  const data = await response.json().catch(() => null)
  if (!data?.progress) {
    return null
  }
  return {
    foundIds: normalizeProgressIds(data.progress.foundIds),
    foundTimestamps: normalizeProgressTimestamps(data.progress.foundTimestamps),
  }
}

export const syncProgressRecords = async (
  records: LocalProgressRecord[],
): Promise<SyncResult> => {
  if (records.length === 0) {
    return { ok: true, records: [] }
  }
  setProgressSyncStatus({ state: 'syncing', lastSyncedAt: null })
  const response = await apiFetch('/api/progress/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: getDeviceId(),
      records: records.map((record) => ({
        citySlug: record.citySlug,
        foundIds: record.foundIds,
        foundTimestamps: record.foundTimestamps ?? {},
        updatedAt: record.updatedAt,
        deviceId: record.deviceId,
      })),
    }),
  })
  if (!response.ok) {
    setProgressSyncStatus({
      state: 'error',
      lastSyncedAt: getProgressSyncStatus()?.lastSyncedAt ?? null,
      error: `HTTP ${response.status}`,
    })
    return { ok: false, records: [] }
  }

  const data = await response.json().catch(() => ({}))
  const syncedAt = typeof data.syncedAt === 'string' ? data.syncedAt : nowIso()
  const resultRecords = Array.isArray(data.records) ? data.records : []
  for (const result of resultRecords) {
    if (!result?.citySlug) {
      continue
    }
    writeLocalProgress(
      result.citySlug,
      {
        foundIds: normalizeProgressIds(result.foundIds),
        foundTimestamps: normalizeProgressTimestamps(result.foundTimestamps),
      },
      { dirty: false, lastSyncedAt: syncedAt },
    )
  }
  setProgressSyncStatus({ state: 'synced', lastSyncedAt: syncedAt })
  return {
    ok: true,
    records: resultRecords
      .filter((record: { citySlug?: unknown }) => typeof record.citySlug === 'string')
      .map((record: { citySlug: string; foundIds?: unknown }) => ({
        citySlug: record.citySlug,
        foundCount: normalizeProgressIds(record.foundIds).length,
        lastSyncedAt: syncedAt,
      })),
  }
}

export const syncDirtyProgressFromStorage = async (citySlugs?: string[]) => {
  const filter = citySlugs ? new Set(citySlugs) : null
  const records = listLocalProgressRecords().filter(
    (record) => record.dirty && (!filter || filter.has(record.citySlug)),
  )
  return syncProgressRecords(records)
}

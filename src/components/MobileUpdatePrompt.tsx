'use client'

import { useCallback, useEffect, useState } from 'react'

type MobileUpdateManifest = {
  latestVersion?: string
  minimumSupportedVersion?: string
  releaseNotesUrl?: string
  appStoreUrl?: string
  playStoreUrl?: string
}

const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
const UPDATE_MANIFEST_URL =
  process.env.NEXT_PUBLIC_UPDATE_MANIFEST_URL || '/mobile-update.json'
const DISMISSED_KEY = 'mm-mobile-update-dismissed'

const compareVersion = (left: string, right: string) => {
  const leftParts = left.split('.').map((part) => Number(part) || 0)
  const rightParts = right.split('.').map((part) => Number(part) || 0)
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

const getStoreUrl = (manifest: MobileUpdateManifest) => {
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) {
    return manifest.playStoreUrl || manifest.appStoreUrl || ''
  }
  return manifest.appStoreUrl || manifest.playStoreUrl || ''
}

export default function MobileUpdatePrompt() {
  const [manifest, setManifest] = useState<MobileUpdateManifest | null>(null)
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const checkForUpdates = useCallback(
    async (manual = false) => {
      setStatus(manual ? 'Checking for updates...' : null)
      try {
        const response = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Update manifest unavailable')
        }
        const payload = (await response.json()) as MobileUpdateManifest
        const latestVersion = payload.latestVersion || CURRENT_VERSION
        const dismissed = window.localStorage.getItem(DISMISSED_KEY)
        const hasUpdate = compareVersion(latestVersion, CURRENT_VERSION) > 0
        setManifest(payload)
        setVisible(hasUpdate && (manual || dismissed !== latestVersion))
        setStatus(
          manual
            ? hasUpdate
              ? `Version ${latestVersion} is available.`
              : 'Metro Memory is up to date.'
            : null,
        )
      } catch {
        setStatus(manual ? 'Unable to check for updates.' : null)
      }
    },
    [],
  )

  useEffect(() => {
    void checkForUpdates()
    const handleManualCheck = () => void checkForUpdates(true)
    window.addEventListener('metro-check-mobile-updates', handleManualCheck)
    window.addEventListener('online', handleManualCheck)
    return () => {
      window.removeEventListener('metro-check-mobile-updates', handleManualCheck)
      window.removeEventListener('online', handleManualCheck)
    }
  }, [checkForUpdates])

  useEffect(() => {
    if (!status) {
      return
    }
    const timeoutId = window.setTimeout(() => setStatus(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [status])

  if (!visible && !status) {
    return null
  }

  const storeUrl = manifest ? getStoreUrl(manifest) : ''
  const latestVersion = manifest?.latestVersion ?? CURRENT_VERSION

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      {visible ? (
        <div className="space-y-3">
          <div>
            <p className="font-semibold">Update available</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              Metro Memory {latestVersion} is available. Update through the store
              when you are online.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl px-3 py-2 font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              onClick={() => {
                window.localStorage.setItem(DISMISSED_KEY, latestVersion)
                setVisible(false)
              }}
            >
              Not now
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--accent-600)] px-3 py-2 font-semibold text-white"
              onClick={() => {
                if (storeUrl) {
                  window.open(storeUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              Update
            </button>
          </div>
        </div>
      ) : (
        <p aria-live="polite">{status}</p>
      )}
    </div>
  )
}

'use client'

import { Fragment, useEffect, useState } from 'react'
import { Transition } from '@headlessui/react'
import CloseButton from './CloseButton'

const POLL_INTERVAL_MS = 3000
const TOAST_DURATION_MS = 15000
const VERSION_STORAGE_KEY = 'metro-memory:dev-site-version'
const SOURCE_VERSION_STORAGE_KEY = 'metro-memory:dev-site-source-version'
const ASSET_VERSION_STORAGE_KEY = 'metro-memory:dev-site-asset-version'
const TOAST_STORAGE_KEY = 'metro-memory:dev-site-refresh-toast'

function readToastPayload(): { shownAt: number } | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.sessionStorage.getItem(TOAST_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as { shownAt?: number }
    if (typeof parsed?.shownAt !== 'number') {
      window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
      return null
    }
    return { shownAt: parsed.shownAt }
  } catch {
    window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
    return null
  }
}

function writeToastPayload() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    TOAST_STORAGE_KEY,
    JSON.stringify({ shownAt: Date.now() }),
  )
}

export default function DevSiteRefreshWatcher() {
  const [open, setOpen] = useState(false)
  const [visibleUntil, setVisibleUntil] = useState<number | null>(null)
  const [pendingRefresh, setPendingRefresh] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const payload = readToastPayload()
    if (!payload) {
      return
    }

    const nextVisibleUntil = payload.shownAt + TOAST_DURATION_MS
    if (nextVisibleUntil <= Date.now()) {
      window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
      return
    }

    setVisibleUntil(nextVisibleUntil)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open || !visibleUntil) {
      return
    }

    const remaining = Math.max(0, visibleUntil - Date.now())
    if (remaining === 0) {
      setOpen(false)
      window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
      return
    }

    const timeout = window.setTimeout(() => {
      setOpen(false)
      window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
    }, remaining)

    return () => window.clearTimeout(timeout)
  }, [open, visibleUntil])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    let disposed = false
    let requestInFlight = false

    const pollVersion = async () => {
      if (disposed || requestInFlight) {
        return
      }

      requestInFlight = true
      try {
        const response = await fetch('/api/dev/site-version', {
          cache: 'no-store',
          headers: { 'cache-control': 'no-store' },
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as {
          version?: string
          sourceVersion?: string
          assetVersion?: string
        }
        const nextVersion = String(payload.version ?? '')
        const nextSourceVersion = String(payload.sourceVersion ?? '')
        const nextAssetVersion = String(payload.assetVersion ?? '')
        if (!nextVersion) {
          return
        }

        const previousVersion = window.sessionStorage.getItem(VERSION_STORAGE_KEY)
        const previousSourceVersion = window.sessionStorage.getItem(SOURCE_VERSION_STORAGE_KEY)
        const previousAssetVersion = window.sessionStorage.getItem(ASSET_VERSION_STORAGE_KEY)
        if (!previousVersion) {
          window.sessionStorage.setItem(VERSION_STORAGE_KEY, nextVersion)
          if (nextSourceVersion) {
            window.sessionStorage.setItem(SOURCE_VERSION_STORAGE_KEY, nextSourceVersion)
          }
          if (nextAssetVersion) {
            window.sessionStorage.setItem(ASSET_VERSION_STORAGE_KEY, nextAssetVersion)
          }
          return
        }

        if (previousVersion !== nextVersion) {
          window.sessionStorage.setItem(VERSION_STORAGE_KEY, nextVersion)
          if (nextSourceVersion) {
            window.sessionStorage.setItem(SOURCE_VERSION_STORAGE_KEY, nextSourceVersion)
          }
          if (nextAssetVersion) {
            window.sessionStorage.setItem(ASSET_VERSION_STORAGE_KEY, nextAssetVersion)
          }

          const sourceChanged =
            !!nextSourceVersion &&
            !!previousSourceVersion &&
            previousSourceVersion !== nextSourceVersion
          const assetOnlyChanged =
            !sourceChanged &&
            !!nextAssetVersion &&
            !!previousAssetVersion &&
            previousAssetVersion !== nextAssetVersion

          if (sourceChanged) {
            writeToastPayload()
            setVisibleUntil(Date.now() + TOAST_DURATION_MS)
            setOpen(true)
            setPendingRefresh(true)
            return
          }

          if (!assetOnlyChanged) {
            writeToastPayload()
            setVisibleUntil(Date.now() + TOAST_DURATION_MS)
            setOpen(true)
            setPendingRefresh(true)
            return
          }

          writeToastPayload()
          setVisibleUntil(Date.now() + TOAST_DURATION_MS)
          setOpen(true)
          setPendingRefresh(true)
          return
        }
      } catch {
        return
      } finally {
        requestInFlight = false
      }
    }

    void pollVersion()
    const interval = window.setInterval(() => {
      void pollVersion()
    }, POLL_INTERVAL_MS)

    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [])

  if (process.env.NODE_ENV !== 'development' || !visibleUntil) {
    return null
  }

  return (
    <Transition
      show={open}
      as={Fragment}
      enter="transform transition ease-out duration-200"
      enterFrom="translate-y-4 opacity-0 scale-95"
      enterTo="translate-y-0 opacity-100 scale-100"
      leave="transform transition ease-in duration-150"
      leaveFrom="translate-y-0 opacity-100 scale-100"
      leaveTo="translate-y-4 opacity-0 scale-95"
    >
      <div className="pointer-events-auto fixed bottom-24 right-6 z-[65] w-full max-w-xs sm:max-w-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-white/95 p-4 text-left shadow-2xl backdrop-blur dark:border-sky-500/60 dark:bg-zinc-900/95">
          <div className="flex-1">
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Data updated</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {pendingRefresh
                ? 'A local file changed. Refresh when you are ready.'
                : 'The page refreshed automatically after a local file change.'}
            </p>
            {pendingRefresh && (
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
                  window.location.reload()
                }}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                Refresh now
              </button>
            )}
          </div>
          <CloseButton
            ariaLabel="Dismiss data changed notification"
            onClick={() => {
              setOpen(false)
              setPendingRefresh(false)
              window.sessionStorage.removeItem(TOAST_STORAGE_KEY)
            }}
            className="ml-2 h-7 w-7 text-zinc-500 hover:text-zinc-800 focus:ring-sky-400 dark:text-zinc-300 dark:hover:text-white"
            iconClassName="h-4 w-4"
          />
        </div>
      </div>
    </Transition>
  )
}

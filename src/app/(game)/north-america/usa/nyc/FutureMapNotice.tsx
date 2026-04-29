'use client'

import { useCallback, useEffect, useState } from 'react'

const NY_FUTURE_MAP_NOTICE_STORAGE_KEY = 'mm-ny-future-map-notice-dismissed-v1'

type NyFutureMapNoticeProps = {
  open: boolean
  onAcknowledge: () => void
  onAcknowledgePermanently: () => void
}

export const useNyFutureMapNotice = () => {
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(NY_FUTURE_MAP_NOTICE_STORAGE_KEY) === '1'
      setOpen(!dismissed)
    } catch {
      setOpen(true)
    } finally {
      setHydrated(true)
    }
  }, [])

  const acknowledge = useCallback(() => {
    setOpen(false)
  }, [])

  const acknowledgeAndDontShowAgain = useCallback(() => {
    try {
      window.localStorage.setItem(NY_FUTURE_MAP_NOTICE_STORAGE_KEY, '1')
    } catch {
      // ignore write failures
    }
    setOpen(false)
  }, [])

  return {
    hydrated,
    open,
    acknowledge,
    acknowledgeAndDontShowAgain,
  }
}

export default function NyFutureMapNotice({
  open,
  onAcknowledge,
  onAcknowledgePermanently,
}: NyFutureMapNoticeProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ny-future-map-notice-title"
        className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="ny-future-map-notice-title"
          className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Notice About This New York Map
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          This map is a future version and does not reflect current-day transit routes. Routes,
          services, and line patterns may change over time.
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          This map is futureproofed for Metro Memory gameplay and should not be used for transit
          directions, travel planning, or real-world navigation decisions.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onAcknowledge}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            I understand
          </button>
          <button
            type="button"
            onClick={onAcknowledgePermanently}
            className="rounded-xl bg-[var(--accent-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-700)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:bg-[var(--accent-500)] dark:hover:bg-[var(--accent-400)]"
          >
            I understand, don&apos;t show again
          </button>
        </div>
      </div>
    </div>
  )
}

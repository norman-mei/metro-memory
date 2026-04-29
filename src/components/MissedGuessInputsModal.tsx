'use client'

import {
  MISSED_GUESSES_UPDATED_EVENT,
  clearAllMissedGuesses,
  clearMissedGuessesForCity,
  readMissedGuesses,
  type MissedGuessEntry,
} from '@/lib/missedGuesses'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'

type MissedGuessInputsModalProps = {
  city: string
  open: boolean
  accessPassword?: string
  scope?: 'city' | 'all'
  onClose: () => void
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function MissedGuessInputsModal({
  city,
  open,
  accessPassword,
  scope = 'all',
  onClose,
}: MissedGuessInputsModalProps) {
  const [entries, setEntries] = useState<MissedGuessEntry[]>([])
  const [topInputs, setTopInputs] = useState<
    Array<{ rawInput: string; normalizedInput: string; count: number; lastSeenAt: string }>
  >([])
  const [sourceLabel, setSourceLabel] = useState('Local')
  const scopedCity = scope === 'city' ? city : undefined

  useEffect(() => {
    if (!open) return
    setEntries(readMissedGuesses(scopedCity))
    setSourceLabel('Local')

    let cancelled = false
    const query = new URLSearchParams({ limit: '150' })
    if (scopedCity) {
      query.set('city', scopedCity)
    }

    fetch(`/api/missed-guesses?${query.toString()}`, {
      headers: accessPassword ? { 'x-solutions-password': accessPassword } : undefined,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json()
      })
      .then((json) => {
        if (cancelled || !json) return
        if (Array.isArray(json.recent)) {
          setEntries(json.recent)
          setSourceLabel('Live site')
        }
        if (Array.isArray(json.top)) {
          setTopInputs(json.top)
        }
      })
      .catch(() => {
        // Keep the local fallback visible if the live log cannot be loaded.
      })

    const refresh = () => setEntries(readMissedGuesses(scopedCity))
    window.addEventListener(MISSED_GUESSES_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      cancelled = true
      window.removeEventListener(MISSED_GUESSES_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [accessPassword, open, scopedCity])

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-2 opacity-0 scale-95"
              enterTo="translate-y-0 opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0 opacity-100 scale-100"
              leaveTo="translate-y-2 opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-zinc-950 dark:ring-white/10">
                <div className="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
                  <Dialog.Title className="text-xl font-black text-zinc-950 dark:text-zinc-50">
                    Missed guess inputs
                  </Dialog.Title>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {sourceLabel}{' '}
                    {scope === 'city'
                      ? 'wrong guesses for this city.'
                      : 'wrong guesses across all cities.'}
                  </p>
                </div>

                <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
                  {topInputs.length > 0 && (
                    <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                      <p className="mb-3 text-sm font-black text-zinc-950 dark:text-zinc-50">
                        Most common missed inputs
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {topInputs.slice(0, 15).map((entry) => (
                          <span
                            key={`${entry.rawInput}-${entry.normalizedInput}`}
                            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800"
                          >
                            {entry.rawInput} ×{entry.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                      {scope === 'city'
                        ? 'No missed guesses logged for this city yet.'
                        : 'No missed guesses logged across all cities yet.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-base font-black text-zinc-950 dark:text-zinc-50">
                                {entry.rawInput}
                              </p>
                              {scope === 'all' && (
                                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                                  {entry.city}
                                </p>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-500">
                              {formatTimestamp(entry.createdAt)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                            Normalized: {entry.normalizedInput || 'empty'}
                          </p>
                          {entry.suggestions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.suggestions.map((suggestion) => (
                                <span
                                  key={suggestion}
                                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800"
                                >
                                  {suggestion}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (scope === 'city') {
                        clearMissedGuessesForCity(city)
                      } else {
                        clearAllMissedGuesses()
                      }
                      setEntries([])
                    }}
                    className="rounded-full px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    {scope === 'city' ? 'Clear city log' : 'Clear local log'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-zinc-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

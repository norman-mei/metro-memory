'use client'

import { Fragment } from 'react'
import { Transition } from '@headlessui/react'
import Link from 'next/link'
import AchievementIcon from '@/components/AchievementIcon'
import { useEffect } from 'react'

type AchievementToastProps = {
  open: boolean
  slug: string
  cityName: string
  title: string
  description: string
  onClose: () => void
  onDontShowAgain: () => void
}

const AchievementToast = ({
  open,
  slug,
  cityName,
  title,
  description,
  onClose,
  onDontShowAgain,
}: AchievementToastProps) => {
  const achievementsHref = `/?tab=achievements&city=${encodeURIComponent(slug)}`

  useEffect(() => {
    if (!open) return
    const timeout = window.setTimeout(onClose, 15_000)
    return () => window.clearTimeout(timeout)
  }, [open, onClose])

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
      <div className="fixed inset-x-4 bottom-6 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:left-auto">
        <div className="flex w-full max-w-xl items-start gap-4 rounded-3xl border border-emerald-200 bg-white/95 p-4 text-left shadow-2xl backdrop-blur dark:border-emerald-600/60 dark:bg-zinc-900/95">
          <AchievementIcon
            slug={slug}
            cityName={cityName}
            className="h-16 w-16 p-1"
            sizes="128px"
          />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Achievement unlocked
            </p>
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={achievementsHref}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                View achievements
              </Link>
              <button
                type="button"
                onClick={onDontShowAgain}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/30"
              >
                Do not show me again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-[#18181b] dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  )
}

export default AchievementToast

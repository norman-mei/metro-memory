'use client'

import classNames from 'classnames'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const

export default function AdminThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const currentTheme = theme ?? 'system'

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="inline-flex rounded-full border border-zinc-200 bg-white/90 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <span className="px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Theme
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex rounded-full border border-zinc-200 bg-white/90 p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90">
      {OPTIONS.map((option) => {
        const active = currentTheme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setTheme(option.value)
            }}
            className={classNames(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

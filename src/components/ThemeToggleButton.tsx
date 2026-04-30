'use client'

import classNames from 'classnames'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'
import { MdDarkMode, MdLaptopMac, MdLightMode } from 'react-icons/md'
import { useSettings } from '@/context/SettingsContext'

const THEME_ITEMS = [
  { value: 'light', label: 'Light theme', icon: MdLightMode },
  { value: 'dark', label: 'Dark theme', icon: MdDarkMode },
  { value: 'system', label: 'System theme', icon: MdLaptopMac },
] as const

export default function ThemeToggleButton({
  className,
  hoverLabel,
}: {
  className?: string
  hoverLabel?: string
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { notifySettingsSaved } = useSettings()
  const currentTheme = mounted ? theme ?? 'system' : 'system'
  const currentThemeIndex = THEME_ITEMS.findIndex((item) => item.value === currentTheme)
  const normalizedThemeIndex = currentThemeIndex >= 0 ? currentThemeIndex : 0
  const activeThemeItem = THEME_ITEMS[normalizedThemeIndex]
  const nextThemeItem = THEME_ITEMS[(normalizedThemeIndex + 1) % THEME_ITEMS.length]
  const ActiveThemeIcon = activeThemeItem.icon
  const handleToggleTheme = useCallback(() => {
    setTheme(nextThemeItem.value)
    notifySettingsSaved()
  }, [nextThemeItem.value, notifySettingsSaved, setTheme])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      type="button"
      aria-label={mounted ? `Switch to ${nextThemeItem.label.toLowerCase()}` : 'Cycle theme'}
      className={classNames(
        'group inline-flex min-w-[3rem] items-center justify-center overflow-hidden rounded-full bg-white px-3 py-2 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur transition hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:ring-white/10 dark:hover:ring-white/20',
        className,
      )}
      onClick={handleToggleTheme}
    >
      <ActiveThemeIcon
        aria-hidden="true"
        className={classNames(
          'h-6 w-6 shrink-0 transition',
          currentTheme === 'light' && 'text-amber-500 group-hover:text-amber-600',
          currentTheme === 'dark' && 'text-zinc-200 group-hover:text-white',
          currentTheme === 'system' && 'text-sky-600 group-hover:text-sky-700 dark:text-sky-300 dark:group-hover:text-sky-200',
        )}
      />
      {hoverLabel ? (
        <span className="pointer-events-none hidden max-w-0 shrink-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-[220px] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[220px] group-focus-visible:opacity-100 lg:inline-block">
          {hoverLabel}
        </span>
      ) : null}
    </button>
  )
}

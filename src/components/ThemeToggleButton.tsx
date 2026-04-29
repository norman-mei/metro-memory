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
}: {
  className?: string
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
        'group inline-flex items-center justify-center rounded-full bg-white/90 px-3 py-2 shadow-lg shadow-zinc-800/5 ring-1 ring-zinc-900/5 backdrop-blur transition dark:bg-zinc-800/90 dark:ring-white/10 dark:hover:ring-white/20',
        className,
      )}
      onClick={handleToggleTheme}
    >
      <ActiveThemeIcon
        aria-hidden="true"
        className={classNames(
          'h-8 w-8 transition md:h-6 md:w-6',
          currentTheme === 'light' && 'text-amber-500 group-hover:text-amber-600',
          currentTheme === 'dark' && 'text-zinc-200 group-hover:text-white',
          currentTheme === 'system' && 'text-sky-600 group-hover:text-sky-700 dark:text-sky-300 dark:group-hover:text-sky-200',
        )}
      />
    </button>
  )
}

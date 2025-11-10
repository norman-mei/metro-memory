'use client'

import { ReactNode, useCallback } from 'react'
import colors from 'tailwindcss/colors'
import { useSettings } from '@/context/SettingsContext'

const ConfettiButton = ({ children }: { children: ReactNode }) => {
  const { settings } = useSettings()

  const onClick = useCallback(() => {
    if (!settings.confettiEnabled) {
      return
    }
    const makeConfetti = async () => {
      const confetti = (await import('tsparticles-confetti')).confetti
      confetti({
        spread: 120,
        ticks: 200,
        particleCount: 150,
        origin: { y: 0.2 },
        colors: [
          colors.yellow[500],
          colors.amber[500],
          colors.orange[500],
          colors.yellow[400],
          colors.amber[400],
          colors.orange[400],
        ],
        decay: 0.85,
        shapes: ['square'],
        gravity: 2,
        startVelocity: 50,
        scalar: 2,
      })
    }

    void makeConfetti()
  }, [settings.confettiEnabled])

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-700 transition hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30"
      aria-label="Launch celebratory confetti"
    >
      <span aria-hidden="true">🎉</span>
      <span>{children}</span>
    </button>
  )
}

export default ConfettiButton

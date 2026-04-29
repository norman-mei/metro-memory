'use client'

import { useSettings } from '@/context/SettingsContext'
import useTranslation from '@/hooks/useTranslation'
import { useConfig } from '@/lib/configContext'
import { getCompletionColor } from '@/lib/progressColors'
import { usePrevious } from '@react-hookz/web'
import classNames from 'classnames'
import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { MaximizeIcon } from './MaximizeIcon'
import { MinimizeIcon } from './MinimizeIcon'
import ProgressBars from './ProgressBars'
import ThemeToggleButton from './ThemeToggleButton'

const MOBILE_COMPACT_HEIGHT_MIN = 120
const MOBILE_COMPACT_HEIGHT_MAX = 420

const buildLineImageConfetti = (
  lines: Record<string, { icon?: string } | undefined>,
) => {
  const images: { src: string; width: number; height: number }[] = []
  const seen = new Set<string>()

  Object.values(lines || {}).forEach((line) => {
    const icon = line?.icon
    if (!icon || typeof icon !== 'string') return
    const src = `/images/${icon}`
    if (seen.has(src)) return
    seen.add(src)
    images.push({ src, width: 64, height: 64 })
  })

  return images.length > 0 ? images : null
}

const FoundSummary = ({
  className,
  foundStationsPerLine,
  stationsPerLine,
  foundProportion,
  cityCompletionConfettiSeen,
  onCityCompletionConfettiSeen,
  minimizable = false,
  defaultMinimized = false,
  highlightedLineId,
  iconBasePath,
  onReset,
  children,
}: {
  className?: string
  foundStationsPerLine: Record<string, number>
  stationsPerLine: Record<string, number>
  foundProportion: number
  cityCompletionConfettiSeen: boolean
  onCityCompletionConfettiSeen: () => void
  minimizable?: boolean
  defaultMinimized?: boolean
  highlightedLineId?: string | null
  iconBasePath?: string | null
  onReset?: () => void
  children?: React.ReactNode
}) => {
  const { t } = useTranslation()
  const { LINES } = useConfig()
  const { settings } = useSettings()
  const previousFound = usePrevious(foundStationsPerLine)
  const [minimized, setMinimized] = useState<boolean>(defaultMinimized)
  const [mobileHidden, setMobileHidden] = useState<boolean>(false)
  const [mobileCompactHeight, setMobileCompactHeight] = useState<number>(240)
  const percentColor = getCompletionColor(foundProportion || 0)
  const dragStartYRef = useRef<number | null>(null)
  const dragStartHeightRef = useRef<number>(mobileCompactHeight)

  useEffect(() => {
    if (!settings.confettiEnabled) {
      return
    }
    if (settings.stopConfettiAfterCompletion && cityCompletionConfettiSeen) {
      return
    }
    // confetti when new line is 100%
    const newFoundLines = Object.keys(foundStationsPerLine).filter(
      (line) =>
        previousFound &&
        foundStationsPerLine[line] > previousFound[line] &&
        foundStationsPerLine[line] === stationsPerLine[line],
    )

    if (newFoundLines.length > 0) {
      const makeConfetti = async () => {
        const confetti = (await import('tsparticles-confetti')).confetti
        const colors = newFoundLines
          .map((line) => LINES[line]?.color)
          .filter((color): color is string => Boolean(color))
        const images = buildLineImageConfetti(LINES)
        confetti({
          spread: 120,
          ticks: 200,
          particleCount: 150,
          origin: { y: 0.2 },
          decay: 0.85,
          gravity: 2,
          startVelocity: 50,
          shapes: images ? ['image'] : ['circle'],
          shapeOptions: images ? { image: images } : undefined,
          colors: images ? undefined : colors.length > 0 ? colors : undefined,
          scalar: 1.8,
        })
      }

      void makeConfetti()

      if (foundProportion >= 1 && !cityCompletionConfettiSeen) {
        onCityCompletionConfettiSeen()
      }
    }
  }, [
    LINES,
    previousFound,
    foundStationsPerLine,
    stationsPerLine,
    settings.confettiEnabled,
    settings.stopConfettiAfterCompletion,
    cityCompletionConfettiSeen,
    foundProportion,
    onCityCompletionConfettiSeen,
  ])

  useEffect(() => {
    return () => {
      window.onpointermove = null
      window.onpointerup = null
    }
  }, [])

  const startCompactHeightDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = event.clientY
    dragStartHeightRef.current = mobileCompactHeight

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (dragStartYRef.current === null) {
        return
      }

      const nextHeight = Math.min(
        MOBILE_COMPACT_HEIGHT_MAX,
        Math.max(
          MOBILE_COMPACT_HEIGHT_MIN,
          dragStartHeightRef.current + (dragStartYRef.current - moveEvent.clientY),
        ),
      )
      setMobileCompactHeight(nextHeight)
    }

    const stopDragging = () => {
      dragStartYRef.current = null
      window.onpointermove = null
      window.onpointerup = null
    }

    window.onpointermove = handlePointerMove
    window.onpointerup = stopDragging
  }

  return (
    <div
      className={classNames(className, '@container', {
        relative: minimizable,
      })}
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-zinc-900 dark:text-zinc-100">
            <span
              className="text-lg font-bold @md:text-2xl"
              style={{ color: percentColor }}
            >
              {((foundProportion || 0) * 100).toFixed(2)}
              <span className="ml-1 text-base font-semibold @md:text-xl">%</span>
            </span>{' '}
            <span className="text-xs text-zinc-600 dark:text-zinc-400 @md:text-sm">
              {t('stationsFound')}
            </span>
          </p>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="md:hidden flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500 transition hover:bg-red-100 active:scale-95 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              aria-label="Reset progress"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
              Reset all progress
            </button>
          )}
          <ThemeToggleButton className="md:hidden h-10 w-10 p-0 rounded-full border border-zinc-300 bg-zinc-100 text-zinc-600 shadow-sm hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600" />
          <button
            onClick={() => setMobileHidden(!mobileHidden)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label={mobileHidden ? 'Show lines' : 'Hide lines'}
          >
            {mobileHidden ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="18 15 12 9 6 15"></polyline></svg>
            )}
          </button>
        </div>
        <div className={classNames('mb-2', { 'max-md:hidden': mobileHidden })}>
          <ProgressBars
            minimized={minimized}
            foundStationsPerLine={foundStationsPerLine}
            stationsPerLine={stationsPerLine}
            highlightedLineId={highlightedLineId}
            iconBasePath={iconBasePath}
            minimizedMaxHeight={minimized ? mobileCompactHeight : undefined}
          />
          {minimized && !mobileHidden ? (
            <div className="mt-2 flex items-center justify-center md:hidden">
              <button
                type="button"
                onPointerDown={startCompactHeightDrag}
                className="flex h-7 w-24 touch-none items-center justify-center rounded-full"
                aria-label="Drag to adjust compact line view height"
                title="Drag to adjust compact line view height"
              >
                <span className="h-1.5 w-16 rounded-full bg-zinc-300 transition hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500" />
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </div>
      {minimizable && !mobileHidden && (
        <div className="sticky bottom-0 z-10 mt-4 flex justify-end pointer-events-none">
          <button
            onClick={() => setMinimized(!minimized)}
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label={minimized ? 'Expand summary' : 'Minimize summary'}
          >
            {minimized ? (
              <MaximizeIcon className="h-3.5 w-3.5" />
            ) : (
              <MinimizeIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default FoundSummary

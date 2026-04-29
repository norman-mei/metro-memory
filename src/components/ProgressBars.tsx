'use client'

import OverflowMarquee from '@/components/OverflowMarquee'
import { isColorLight } from '@/lib/colorUtils'
import { useConfig } from '@/lib/configContext'
import { getCompletionColor } from '@/lib/progressColors'
import clsx from 'clsx'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef } from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import LineBadge, { getLineBadgeMetrics } from './LineBadge'

const cleanupLineName = (name?: string) => {
  if (!name) return ''

  let result = name
  const replacements: Array<[RegExp, string]> = [
    [/^AirTrain JFK\s*[–-]\s*/i, ''],
    [/^AirTrain\s+/i, ''],
    [/^MNRR\s+/i, ''],
    [/^LIRR\s+/i, ''],
    [/^CTrail\s+/i, ''],
    [/^NJT\s+Light\s+Rail\s+/i, ''],
    [/^NJT\s+HBLR\s+/i, ''],
    [/^NJT\s+/i, ''],
  ]

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }

  return result.replace(/^[–-]\s*/, '').replace(/\s{2,}/g, ' ').trim()
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const normalizeHex = (value: string) => {
  const hex = value.trim().replace('#', '')
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return hex
  }
  return null
}

const hexToRgb = (value?: string): [number, number, number] | null => {
  if (!value) return null
  const hex = normalizeHex(value)
  if (!hex) return null
  const int = parseInt(hex, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0')

const mixHexColors = (from: string, to: string, ratio: number) => {
  const fromRgb = hexToRgb(from)
  const toRgb = hexToRgb(to)
  if (!fromRgb || !toRgb) {
    return from
  }
  const t = clamp01(ratio)
  const mixed: [number, number, number] = [
    fromRgb[0] + (toRgb[0] - fromRgb[0]) * t,
    fromRgb[1] + (toRgb[1] - fromRgb[1]) * t,
    fromRgb[2] + (toRgb[2] - fromRgb[2]) * t,
  ]
  return `#${toHex(mixed[0])}${toHex(mixed[1])}${toHex(mixed[2])}`
}

const resolveGroupImageSrc = (image: string, iconBasePath?: string | null) => {
  if (image.includes('/')) {
    return `/images/${image.replace(/^\/+/, '')}`
  }

  if (iconBasePath) {
    return `/images/${iconBasePath.replace(/^\//, '')}/${image}`
  }

  return `/images/${image}`
}

const GroupHeading = ({
  title,
  image,
  iconBasePath,
  compact = false,
}: {
  title?: string
  image?: string
  iconBasePath?: string | null
  compact?: boolean
}) => {
  if (!title && !image) {
    return null
  }

  const imageBoxClass = compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  const imageMaxClass = compact ? 'max-h-6 max-w-6' : 'max-h-8 max-w-8'

  if (image) {
    return (
      <div className={clsx('flex items-center gap-3', compact ? 'pt-1' : '')}>
        <div
          className={clsx(
            'flex shrink-0 items-center justify-center border border-zinc-200 bg-white p-1 dark:border-[#18181b] dark:bg-zinc-900/70',
            imageBoxClass,
          )}
        >
          <Image
            src={resolveGroupImageSrc(image, iconBasePath)}
            alt={title ?? ''}
            width={48}
            height={48}
            className={clsx('h-auto w-auto object-contain', imageMaxClass)}
          />
        </div>
        {title ? (
          <OverflowMarquee
            className={clsx(
              compact
                ? 'min-w-0 text-sm font-semibold text-zinc-700 dark:text-zinc-200'
                : 'min-w-0 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
            )}
            speed={compact ? 30 : 25}
            minDuration={8}
            gap={24}
            aria-label={title}
          >
            {title}
          </OverflowMarquee>
        ) : null}
      </div>
    )
  }

  if (!title) {
    return null
  }

  return (
    <OverflowMarquee
      className={clsx(
        compact
          ? 'pt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200'
          : 'text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
      )}
      speed={compact ? 30 : 25}
      minDuration={8}
      gap={24}
      aria-label={title}
    >
      {title}
    </OverflowMarquee>
  )
}

const ProgressBars = ({
  foundStationsPerLine,
  stationsPerLine,
  minimized = false,
  highlightedLineId,
  iconBasePath,
  minimizedMaxHeight,
}: {
  foundStationsPerLine: Record<string, number>
  stationsPerLine: Record<string, number>
  minimized?: boolean
  highlightedLineId?: string | null
  iconBasePath?: string | null
  minimizedMaxHeight?: number
}) => {
  const { LINES, GAUGE_COLORS, LINE_GROUPS } = useConfig()
  const gaugeMode = GAUGE_COLORS ?? 'inverted'
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
     if (highlightedLineId && lineRefs.current[highlightedLineId]) {
         lineRefs.current[highlightedLineId]?.scrollIntoView({
             behavior: 'smooth',
             block: 'center'
         })
     }
  }, [highlightedLineId])

  const orderedLines = useMemo(
    () =>
      Object.entries(LINES)
        .sort(([, a], [, b]) => (a?.order ?? 0) - (b?.order ?? 0))
        .map(([key]) => key),
    [LINES],
  )

  const groupedLineOrder = useMemo(() => {
    if (!LINE_GROUPS || LINE_GROUPS.length === 0) {
      return orderedLines
    }

    const keys: string[] = []
    for (const group of LINE_GROUPS) {
      for (const item of group.items) {
        if (item.type === 'lines') {
          for (const line of item.lines) {
            if (LINES[line] && !keys.includes(line)) {
              keys.push(line)
            }
          }
        }
      }
    }

    // ensure any lines not explicitly listed are still shown
    for (const line of orderedLines) {
      if (!keys.includes(line)) {
        keys.push(line)
      }
    }

    return keys
  }, [LINE_GROUPS, LINES, orderedLines])

  const renderLine = (line: string, compact: boolean) => {
    const meta = LINES[line]
    if (!meta) {
      return null
    }

    const total = stationsPerLine[line]
    if (!total) {
      return null
    }

    const found = foundStationsPerLine[line] || 0
    const displayName = cleanupLineName(meta.name) || meta.name
    const title = `${displayName} - ${found}/${total}`
    const customProgressColor = meta.progressOutlineColor
    const baseProgressColor = customProgressColor ?? meta.color ?? '#000000'
    const percentComplete = total > 0 ? found / total : 0
    const gaugeBackground =
      gaugeMode === 'inverted' ? (isDark ? '#27272a' : '#ffffff') : (meta.color || '#000000')

    let progressColor: string
    let trailColor: string

    if (gaugeMode === 'inverted') {
      progressColor = baseProgressColor
      trailColor = mixHexColors(baseProgressColor, gaugeBackground, 0.8)
    } else {
      const whiteShift = 
        percentComplete <= 0 ? 0 : Math.max(0.2, Math.pow(percentComplete, 0.6))
      progressColor = mixHexColors(baseProgressColor, '#ffffff', whiteShift)
      trailColor = mixHexColors(
        baseProgressColor,
        '#ffffff',
        Math.min(1, whiteShift * 0.65),
      )
    }

    const needsContrastBoost =
      gaugeMode === 'inverted' && !isDark && isColorLight(progressColor)
    const contrastRingClass = needsContrastBoost ? 'ring-1 ring-zinc-400/70' : undefined
    const completionColor = getCompletionColor(percentComplete)
    const badgeShape = meta.badgeShape ?? 'circle'
    const usesFramedShell = badgeShape !== 'circle'
    const badgeMetrics = getLineBadgeMetrics(badgeShape, 'small')
    const shellInsetX = usesFramedShell ? 3 : 2
    const shellInsetY = 2
    const shellWidth = badgeMetrics.width + shellInsetX * 2
    const shellHeight = badgeMetrics.height + shellInsetY * 2
    const shellRadius = badgeMetrics.radius + shellInsetY

    const isHighlighted = highlightedLineId === line

    return (
      <div 
        key={line} 
        className={clsx(
            "flex items-center gap-2 transition-colors duration-300",
            compact ? "rounded-full" : "rounded-lg",
            isHighlighted && [
                "bg-yellow-200 dark:bg-yellow-500/40",
                "ring-4 ring-yellow-200 dark:ring-yellow-500 z-10"
            ]
        )}
        ref={(el) => {
            if (el) lineRefs.current[line] = el
        }}
      >
        <div
          title={title}
          className="relative flex shrink-0 items-center justify-center"
          style={{
            width: usesFramedShell ? shellWidth : 32,
            height: usesFramedShell ? shellHeight : 32,
          }}
        >
          {usesFramedShell ? (
            <div
              className={clsx(
                'relative overflow-hidden shadow dark:shadow-black/40',
                contrastRingClass,
              )}
              style={{
                width: shellWidth,
                height: shellHeight,
                borderRadius: shellRadius,
                background: `linear-gradient(90deg, ${progressColor} 0%, ${progressColor} ${
                  percentComplete * 100
                }%, ${trailColor} ${percentComplete * 100}%, ${trailColor} 100%)`,
              }}
            >
              <div
                className="absolute"
                style={{
                  left: shellInsetX,
                  right: shellInsetX,
                  top: shellInsetY,
                  bottom: shellInsetY,
                  borderRadius: Math.max(shellRadius - shellInsetY, 0),
                  backgroundColor: gaugeBackground,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <LineBadge
                  lineId={line}
                  line={meta}
                  iconBasePath={iconBasePath}
                  defaultFit="cover"
                  className="z-10"
                />
              </div>
            </div>
          ) : (
            <>
              <div
                className={clsx(
                  'absolute h-full w-full rounded-full shadow dark:shadow-black/40',
                  contrastRingClass,
                )}
              >
                <CircularProgressbar
                  background
                  backgroundPadding={3}
                  styles={buildStyles({
                    backgroundColor: gaugeBackground,
                    pathColor: progressColor,
                    textColor: isDark ? '#e4e4e7' : '#27272a',
                    trailColor,
                  })}
                  value={(100 * found) / total}
                />
              </div>
              <LineBadge
                lineId={line}
                line={meta}
                iconBasePath={iconBasePath}
                defaultFit="cover"
                className="z-20"
              />
            </>
          )}
        </div>
        {!compact && (
          <OverflowMarquee className="min-w-0 text-sm text-zinc-700 dark:text-zinc-200">
            <span>
              {displayName} -{' '}
              <span style={{ color: completionColor, fontWeight: 600 }}>
                {found}/{total}
              </span>
            </span>
          </OverflowMarquee>
        )}
      </div>
    )
  }

  if (minimized) {
    return (
      <div
        className="flex max-w-full flex-wrap items-start content-start gap-2 overflow-x-hidden overflow-y-auto pr-1"
        style={
          minimizedMaxHeight && minimizedMaxHeight > 0
            ? { maxHeight: minimizedMaxHeight }
            : undefined
        }
      >
        {groupedLineOrder.map((line) => renderLine(line, true))}
      </div>
    )
  }

  if (!LINE_GROUPS || LINE_GROUPS.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 @container">
        {orderedLines.map((line) => renderLine(line, false))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {LINE_GROUPS.map((group, groupIndex) => {
        return (
          <div key={`${group.title ?? 'group'}-${groupIndex}`} className="space-y-3">
            <GroupHeading
              title={group.title}
              image={group.titleImage}
              iconBasePath={iconBasePath}
            />
            {group.items.map((item, itemIndex) => {
              if (item.type === 'separator') {
                return (
                  <hr
                    key={`separator-${groupIndex}-${itemIndex}`}
                    className="border-zinc-200 dark:border-[#18181b]"
                  />
                )
              }

              const visibleLines = item.lines.filter((line) => !!LINES[line])
              if (item.lines.length === 0) {
                return (
                  <GroupHeading
                    key={`${item.title ?? 'heading'}-${groupIndex}-${itemIndex}`}
                    title={item.title}
                    image={item.titleImage}
                    iconBasePath={iconBasePath}
                    compact
                  />
                )
              }
              if (visibleLines.length === 0) {
                return null
              }

              return (
                <div
                  key={`${item.title ?? 'lines'}-${groupIndex}-${itemIndex}`}
                  className="space-y-2"
                >
                  <GroupHeading
                    title={item.title}
                    image={item.titleImage}
                    iconBasePath={iconBasePath}
                    compact
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {visibleLines.map((line) => renderLine(line, false))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default ProgressBars

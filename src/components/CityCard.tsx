import CityStatsPanel from '@/components/CityStatsPanel'
import OverflowMarquee from '@/components/OverflowMarquee'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import useTranslation from '@/hooks/useTranslation'
import { getCityOpenGraphImagePath } from '@/lib/cityAssets'
import { formatLocalizedCityName } from '@/lib/cityNameDisplay'
import { ICity, isCityDisabled as isCityDisabledFlag } from '@/lib/citiesConfig'
import { isMiniCitySlug } from '@/lib/miniCities'
import {
  getCityFlagEmojiFromPath,
  getFlagEmojiFromCountryCode,
} from '@/lib/countryFlags'
import { STATION_TOTALS } from '@/lib/stationTotals'
import classNames from 'classnames'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'

type MiniCityCardEntry = {
  slug: string
  name: string
  link: string
  progress: number
  found: number
  total: number
  highlighted?: boolean
}

export type CityCardVariant = 'comfortable' | 'compact' | 'cover' | 'list'
  | 'globe' // Added for globe view compatibility
  | 'map'   // Added for 2D map view compatibility
const UNAVAILABLE_CITY_SLUGS = new Set<string>()

const getPathFromLink = (link: string) => {
  if (!link.startsWith('/')) {
    return null
  }
  return link.replace(/^\//, '').split(/[?#]/)[0]
}

const getSlugFromLink = (link: string) => {
  const path = getPathFromLink(link)
  if (!path) {
    return null
  }
  const segments = path.split('/').filter(Boolean)
  return segments.length ? segments[segments.length - 1] : null
}

const getCountryFromLink = (link: string) => {
  const path = getPathFromLink(link)
  if (!path) return null
  const segments = path.split('/').filter(Boolean)
  return segments.length >= 2 ? segments[1] : null
}

const COUNTRY_ABBREV: Record<string, string> = {
  usa: 'US',
  canada: 'CA',
  mexico: 'MX',
  'north-america': 'NA',
  uk: 'UK',
  ireland: 'IE',
  france: 'FR',
  germany: 'DE',
  spain: 'ES',
  italy: 'IT',
  austria: 'AT',
  sweden: 'SE',
  hungary: 'HU',
  turkey: 'TR',
  australia: 'AU',
  'new-zealand': 'NZ',
  china: 'CN',
  japan: 'JP',
  'south-korea': 'KR',
  'north-korea': 'KP',
  singapore: 'SG',
  taiwan: 'TW',
  malaysia: 'MY',
  indonesia: 'ID',
  vietnam: 'VN',
  thailand: 'TH',
  philippines: 'PH',
  'united-arab-emirates': 'AE',
  argentina: 'AR',
  venezuela: 'VE',
  brazil: 'BR',
  'south-africa': 'ZA',
  algeria: 'DZ',
}

const getCountryAbbrev = (countrySlug: string | null) => {
  if (!countrySlug) return '??'
  return COUNTRY_ABBREV[countrySlug] ?? countrySlug.slice(0, 2).toUpperCase()
}

const getCityCardImagePath = (slug: string) => getCityOpenGraphImagePath(slug)

const CityCard = ({
  city,
  className,
  variant = 'comfortable',
  visibleCities,
  isFavorite = false,
  onToggleFavorite,
  isRecommended = false,
  isMiniCity: isMiniCityProp,
  showRightConnector = false,
  showBottomConnector = false,
  showMiniCityBackdrop = false,
  onHoverStart,
  onHoverEnd,
  miniCities = [],
  autoExpandMiniCities: _autoExpandMiniCities = false,
}: {
  city: ICity
  className?: string
  variant?: CityCardVariant
  visibleCities?: ICity[]
  isFavorite?: boolean
  onToggleFavorite?: (slug: string, next: boolean) => void
  isRecommended?: boolean
  isMiniCity?: boolean
  showRightConnector?: boolean
  showBottomConnector?: boolean
  showMiniCityBackdrop?: boolean
  onHoverStart?: () => void
  onHoverEnd?: () => void
  miniCities?: MiniCityCardEntry[]
  autoExpandMiniCities?: boolean
}) => {
  const router = useRouter()
  const [progress, setProgress] = useState<number | null>(0)
  const [stationTotal, setStationTotal] = useState<number | null>(null)
  const [statsOpen, setStatsOpen] = useState<boolean>(false)
  const [statsSlug, setStatsSlug] = useState<string | null>(null)
  const [statsPath, setStatsPath] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const slug = useMemo(() => getSlugFromLink(city.link), [city.link])
  const cityPath = useMemo(() => getPathFromLink(city.link), [city.link])
  const { progressSummaries } = useAuth()
  const { settings } = useSettings()
  const { t } = useTranslation()

  useEffect(() => {
    if (!slug) {
      setProgress(0)
      setStationTotal(null)
      return () => { }
    }

    const readProgress = () => {
      if (typeof window === 'undefined') {
        return
      }

      try {
        const totalRaw = window.localStorage.getItem(`${slug}-station-total`)
        const parsedTotal = Number(totalRaw)
        const stationTotal =
          (Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : null) ??
          STATION_TOTALS[slug] ??
          null

        const foundRaw = window.localStorage.getItem(`${slug}-stations`)
        let foundCount = 0
        if (foundRaw) {
          try {
            const parsed = JSON.parse(foundRaw)
            if (Array.isArray(parsed)) {
              foundCount = new Set(parsed.filter((id) => typeof id === 'number')).size
            } else if (typeof parsed === 'number') {
              foundCount = parsed
            }
          } catch {
            // ignore malformed entries
          }
        }

        if (!stationTotal || stationTotal <= 0) {
          setStationTotal(null)
          setProgress(0)
          return
        }

        setStationTotal(stationTotal)
        setProgress(Math.max(0, Math.min(1, foundCount / stationTotal)))
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Unable to read city progress', error)
        }
        setStationTotal(null)
        setProgress(null)
      }
    }

    readProgress()
    window.addEventListener('storage', readProgress)
    window.addEventListener('focus', readProgress)
    return () => {
      window.removeEventListener('storage', readProgress)
      window.removeEventListener('focus', readProgress)
    }
  }, [slug])

  useEffect(() => {
    if (!slug || stationTotal === null) {
      return
    }
    const remoteFound = progressSummaries[slug]
    if (typeof remoteFound === 'number' && stationTotal > 0) {
      setProgress(Math.max(0, Math.min(1, remoteFound / stationTotal)))
    }
  }, [slug, progressSummaries, stationTotal])

  useEffect(() => {
    setIsHovered(false)
  }, [slug])

  const isUnavailableCity = slug ? UNAVAILABLE_CITY_SLUGS.has(slug) : false
  const showComingSoon = isUnavailableCity && isHovered
  const cityDisabled = isCityDisabledFlag(city)
  const isCityDisabled = cityDisabled || isUnavailableCity
  const displayAsDisabled = cityDisabled || showComingSoon
  const isMiniCity = isMiniCityProp ?? isMiniCitySlug(slug)
  const supportsMiniCityDeck =
    miniCities.length > 0 && !isCityDisabled && (variant === 'comfortable' || variant === 'compact')
  const miniDeckVisible = supportsMiniCityDeck && showMiniCityBackdrop

  const statsNavigation = useMemo(() => {
    if (!visibleCities) {
      return null
    }
    const slugs: string[] = []
    const slugToName = new Map<string, string>()
    const slugToPath = new Map<string, string>()
    visibleCities.forEach((visibleCity) => {
      const citySlug = getSlugFromLink(visibleCity.link)
      const cityPath = getPathFromLink(visibleCity.link)
      if (citySlug && cityPath) {
        slugs.push(citySlug)
        slugToName.set(citySlug, visibleCity.name)
        slugToPath.set(citySlug, cityPath)
      }
    })
    return { slugs, slugToName, slugToPath }
  }, [visibleCities])

  const navigationSlugs = statsNavigation?.slugs ?? null
  const navigationSlugToName = statsNavigation?.slugToName ?? null
  const statsCityDisplayName =
    (statsSlug && navigationSlugToName?.get(statsSlug)) ?? city.name
  const hasCircularNavigation =
    navigationSlugs !== null && navigationSlugs.length > 1

  const handleNavigateStats = (direction: -1 | 1) => {
    if (!navigationSlugs || navigationSlugs.length <= 1 || !statsSlug) {
      return
    }
    const idx = navigationSlugs.indexOf(statsSlug)
    if (idx < 0) {
      return
    }
    const total = navigationSlugs.length
    const nextIndex = (idx + direction + total) % total
    const targetSlug = navigationSlugs[nextIndex]
    const targetPath = statsNavigation?.slugToPath.get(targetSlug) ?? null
    if (targetSlug && targetSlug !== statsSlug) {
      setStatsSlug(targetSlug)
      setStatsPath(targetPath)
    }
  }

  const handlePrevStats = () => handleNavigateStats(-1)
  const handleNextStats = () => handleNavigateStats(1)

  const headingClasses = classNames(
    'font-bold group-hover:underline break-words',
    isMiniCity && 'italic',
    variant === 'comfortable' && 'text-2xl',
    variant === 'compact' && 'text-xl',
    variant === 'cover' && 'text-2xl',
    variant === 'list' && 'text-2xl',
    variant === 'globe' && 'text-lg',
    {
      'text-zinc-800 dark:text-zinc-100': !displayAsDisabled && variant !== 'cover',
      'text-white drop-shadow': variant === 'cover',
      'text-zinc-400 dark:text-zinc-500': displayAsDisabled && variant !== 'cover',
    },
  )

  const cardWrapperClasses = clsx(
    'group relative block w-full overflow-visible transition-[transform,filter] duration-300 ease-out',
    variant === 'list' ? 'mt-2' : 'mt-4',
    variant === 'compact' && 'mt-2',
    miniDeckVisible && 'z-40',
    {
      'cursor-not-allowed': isCityDisabled,
      'ring-2 ring-yellow-400/80 shadow-[0_0_18px_rgba(250,204,21,0.55)]':
        isRecommended && !isCityDisabled,
    },
  )

  const cardSurfaceClasses = clsx(
    'relative z-10 overflow-hidden rounded-2xl border border-transparent shadow transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out',
    isMiniCity
      ? 'bg-violet-100/90 dark:bg-[rgba(109,40,217,0.3)]'
      : 'bg-zinc-100 dark:bg-zinc-800',
    variant === 'list' ? 'flex flex-row items-stretch' : 'flex flex-col',
    {
      'hover:border-[var(--accent-300)] hover:shadow-lg dark:hover:border-[var(--accent-400)]': !isCityDisabled,
      'hover:bg-[var(--accent-50)] dark:hover:bg-[rgba(var(--accent-600-rgb),0.1)]': !isCityDisabled,
      'border-violet-300/95 dark:border-violet-400/40': isMiniCity && !isCityDisabled,
      'hover:bg-violet-200/90 dark:hover:bg-[rgba(124,58,237,0.36)]': isMiniCity && !isCityDisabled,
    },
  )

  const connectorClasses = clsx(
    'pointer-events-none absolute top-1/2 z-0 hidden -translate-y-1/2 md:block',
    variant === 'compact' || variant === 'list' ? 'h-1 w-4' : 'h-1.5 w-8',
    'rounded-full bg-black dark:bg-white',
  )
  const verticalConnectorClasses = clsx(
    'pointer-events-none absolute left-1/2 z-0 hidden -translate-x-1/2 md:block',
    variant === 'compact' || variant === 'list' ? 'top-full h-8 w-1' : 'top-full h-14 w-1.5',
    'rounded-full bg-black dark:bg-white',
  )
  const horizontalHoverBridgeClasses = clsx(
    'absolute left-full top-0 z-20 hidden bg-transparent md:block',
    variant === 'compact' || variant === 'list' ? 'h-full w-6' : 'h-full w-8',
  )
  const verticalHoverBridgeClasses = clsx(
    'absolute left-0 top-full z-20 hidden bg-transparent md:block',
    variant === 'compact' || variant === 'list' ? 'h-10 w-full' : 'h-16 w-full',
  )

  const progressValue = progress ?? 0
  const progressPercent = (progressValue * 100).toFixed(2)
  const progressColor = `hsl(${progressValue * 120}, 70%, 45%)`

  const progressSizeClass =
    variant === 'compact' || variant === 'globe'
      ? 'h-5 w-5'
      : variant === 'list'
        ? 'h-8 w-8'
        : 'h-6 w-6'
  const progressSizeClassName = classNames(progressSizeClass, 'flex-shrink-0')

  const imageClass = classNames(
    'relative overflow-hidden',
    {
      'aspect-square w-full': variant === 'comfortable',
      'aspect-[4/3] w-full': variant === 'compact',
      'aspect-[5/3] w-full': variant === 'cover',
      'aspect-video w-full': variant === 'globe',
      'h-28 w-40 flex-shrink-0 rounded-none': variant === 'list',
    },
    className,
  )
  const isMapCardVariant = variant === 'globe' || variant === 'map'

  const statsButtonClasses = classNames(
    'inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold transition focus:outline-none focus:ring-2',
    variant === 'cover'
      ? 'border-white/50 bg-white/10 text-white hover:bg-white/20 focus:ring-white/40'
      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-[var(--accent-50)] hover:text-[var(--accent-600)] focus:ring-[var(--accent-ring)] dark:border-[#18181b] dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  )

  const renderStatsButton = () => {
    if (!slug || !cityPath || isCityDisabled) {
      return null
    }

    return (
      <button
        type="button"
        className={statsButtonClasses}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!slug) {
            return
          }
          setStatsSlug(slug)
          setStatsPath(cityPath)
          setStatsOpen(true)
        }}
        aria-label={t('openCityStats')}
      >
        <span aria-hidden="true">...</span>
        <span className="sr-only">{t('openCityStats')}</span>
      </button>
    )
  }

  const renderProgress = (options?: { highContrast?: boolean }) => {
    if (isCityDisabled) {
      return null
    }
    const highContrast = options?.highContrast ?? false
    const textStyle: CSSProperties = {
      color: progressColor,
    }
    if (highContrast) {
      textStyle.textShadow = '0 1px 2px rgba(0,0,0,0.85)'
    }
    return (
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <p
          className={classNames(
            'm-0 flex-none whitespace-nowrap leading-tight font-semibold',
            {
              'text-sm': variant === 'comfortable',
              'text-xs': variant === 'compact',
              'text-xs text-white drop-shadow': variant === 'cover',
              'text-sm text-zinc-800 dark:text-zinc-100': variant === 'list',
            },
          )}
          style={textStyle}
        >
          {progressPercent}% {t('stationsFound')}
        </p>
        <div className={progressSizeClassName}>
          <CircularProgressbar
            value={progressValue * 100}
            strokeWidth={14}
            styles={buildStyles({
              pathColor: progressColor,
              trailColor: highContrast ? 'rgba(0,0,0,0.35)' : 'rgba(148,163,184,0.3)',
              backgroundColor: 'transparent',
            })}
          />
        </div>
      </div>
    )
  }

  const renderHeading = () => {
    const headingStyle: CSSProperties | undefined = showComingSoon
      ? { color: variant === 'cover' ? '#d4d4d8' : '#a1a1aa' }
      : undefined
    const headingContent = showComingSoon ? t('comingSoonLabel') : city.name
    const comingSoonSuffix = cityDisabled && !showComingSoon ? ` ${t('comingSoonSuffix')}` : ''

    if (variant === 'cover') {
      return (
        <p className={headingClasses} style={headingStyle}>
          {headingContent}
          {comingSoonSuffix}
        </p>
      )
    }

    if (variant === 'list') {
      return (
        <p className={headingClasses} style={headingStyle}>
          {headingContent}
          {comingSoonSuffix}
        </p>
      )
    }

    if (variant === 'globe' || variant === 'map') {
      return (
        <OverflowMarquee
          className={classNames(headingClasses, 'leading-tight')}
          speed={30}
          minDuration={8}
          gap={24}
          aria-label={`${headingContent}${comingSoonSuffix}`}
          style={headingStyle}
          title={headingContent}
        >
          <>
            {headingContent}
            {comingSoonSuffix}
          </>
        </OverflowMarquee>
      )
    }

    return (
      <OverflowMarquee
        className={headingClasses}
        speed={30}
        minDuration={8}
        gap={24}
        aria-label={headingContent}
        style={headingStyle}
      >
        <>
          {headingContent}
          {comingSoonSuffix}
        </>
      </OverflowMarquee>
    )
  }

  const renderHeadingSection = () => {
    const headingNode = renderHeading()
    if (!headingNode) {
      return null
    }
    const statsButton = renderStatsButton()
    if (!statsButton) {
      return headingNode
    }
    return (
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{headingNode}</div>
        <div className="flex-shrink-0">{statsButton}</div>
      </div>
    )
  }

  const renderMeta = () => {
    if (isCityDisabled || variant === 'cover') {
      return null
    }

    return (
      <div
        className={classNames(
          'flex items-center',
          variant === 'compact' ? 'mt-1' : 'mt-2',
        )}
      >
        {renderProgress()}
      </div>
    )
  }

  const renderMiniCityCards = () => {
    if (isCityDisabled || miniCities.length === 0 || supportsMiniCityDeck) {
      return null
    }

    return (
      <div className="mt-4 space-y-3">
        {miniCities.map((miniCity) => {
          const miniProgress = Math.max(0, Math.min(1, miniCity.progress))
          const percentLabel = `${(miniProgress * 100).toFixed(1)}%`
          const progressColor = `hsl(${miniProgress * 120}, 70%, 45%)`
          const countrySlug = getCountryFromLink(miniCity.link)
          const localizedMiniCityName = formatLocalizedCityName(
            miniCity.name,
            miniCity.slug,
            settings.language,
          )
          return (
            <button
              key={miniCity.slug}
              type="button"
              className={classNames(
                'group/mini w-full overflow-hidden rounded-2xl border bg-zinc-100 text-left shadow transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:bg-zinc-800',
                miniCity.highlighted
                  ? 'border-sky-300 shadow-[0_14px_34px_rgba(56,189,248,0.18)] hover:border-sky-400 hover:shadow-[0_18px_40px_rgba(56,189,248,0.24)] dark:border-sky-500/40'
                  : 'border-violet-200 hover:border-[var(--accent-300)] hover:shadow-lg dark:border-violet-500/30',
              )}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                router.push(miniCity.link)
              }}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-2 rounded-full bg-white/85 px-2 py-1 text-xs font-semibold text-zinc-800 shadow-md ring-1 ring-white/70 backdrop-blur dark:bg-black/70 dark:text-zinc-100 dark:ring-black/60">
                  <span>{getCityFlagEmojiFromPath(miniCity.link)}</span>
                  <span className="tabular-nums">{getCountryAbbrev(countrySlug)}</span>
                </div>
                <div className="absolute right-2 top-2 z-10 inline-flex items-center rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 shadow-md ring-1 ring-white/70 backdrop-blur dark:bg-black/70 dark:text-violet-200 dark:ring-black/60">
                  {t('miniCityBadge')}
                </div>
                <Image
                  draggable={false}
                  src={getCityCardImagePath(miniCity.slug)}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 320px"
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover/mini:scale-[1.02]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3.5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-white drop-shadow">
                        {localizedMiniCityName}
                      </div>
                      <div className="mt-1 text-xs font-medium text-white/85">
                        {miniCity.found}/{miniCity.total} {t('stationsFound')}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm">
                      {t('playLabel')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                    {t('progressLabel')}
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: progressColor }}
                  >
                    {percentLabel} {t('stationsFound')}
                  </div>
                </div>
                <div className="h-5 w-5 shrink-0">
                  <CircularProgressbar
                    value={miniProgress * 100}
                    strokeWidth={14}
                    styles={buildStyles({
                      pathColor: progressColor,
                      trailColor: 'rgba(148,163,184,0.3)',
                      backgroundColor: 'transparent',
                    })}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderImage = () => (
    <div className={imageClass}>
      <div className="absolute left-2 top-2 z-10 inline-flex items-center gap-2 rounded-full bg-white/85 px-2 py-1 text-xs font-semibold text-zinc-800 shadow-md ring-1 ring-white/70 backdrop-blur dark:bg-black/70 dark:text-zinc-100 dark:ring-black/60">
        {(() => {
          const countrySlug = getCountryFromLink(city.link)
          if (slug === 'gba') {
            return (
              <>
                <span className="inline-flex items-center gap-1">
                  {getFlagEmojiFromCountryCode('CN')} <span className="tabular-nums">CN</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  {getFlagEmojiFromCountryCode('HK')} <span className="tabular-nums">HK</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  {getFlagEmojiFromCountryCode('MO')} <span className="tabular-nums">MO</span>
                </span>
              </>
            )
          }
          return (
            <>
              {getCityFlagEmojiFromPath(city.link)}
              <span className="tabular-nums">{getCountryAbbrev(countrySlug)}</span>
            </>
          )
        })()}
      </div>
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (onToggleFavorite && slug) {
            onToggleFavorite(slug, !isFavorite)
          }
        }}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className={classNames(
          'absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full p-2.5 text-sm font-semibold shadow-md ring-1 ring-white/60 backdrop-blur transition',
          isFavorite
            ? 'bg-amber-100 text-amber-600 ring-amber-200 hover:bg-amber-200'
            : 'bg-white/90 text-amber-500 hover:bg-white dark:bg-black/70 dark:text-amber-300',
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M12 4.75l2.09 4.24 4.68.68-3.39 3.3.8 4.66L12 15.9l-4.18 2.2.8-4.66-3.39-3.3 4.68-.68L12 4.75z" />
        </svg>
      </button>
      <Image
        draggable={false}
        src={city.image}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={classNames('absolute inset-0 h-full w-full object-cover', {
          'rounded-none': variant === 'list',
        })}
      />
      {variant === 'cover' && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          {renderHeadingSection()}
          {!isCityDisabled && (
            <div className="mt-2 flex text-white">{renderProgress({ highContrast: true })}</div>
          )}
        </div>
      )}
    </div>
  )

  const renderBody = () => {
    if (variant === 'cover') {
      const miniDisclosure = renderMiniCityCards()
      return (
        <>
          {renderImage()}
          {miniDisclosure ? <div className="px-3 pb-3">{miniDisclosure}</div> : null}
        </>
      )
    }

    if (variant === 'list') {
      return (
        <div className="flex w-full items-center gap-4 p-4">
          {renderImage()}
          <div className="flex flex-1 flex-col gap-2">
            {renderHeadingSection()}
            {renderMeta()}
            {renderMiniCityCards()}
          </div>
        </div>
      )
    }

    return (
      <>
        {renderImage()}
        <div
          className={classNames('w-full', {
            'px-4 pb-6 pt-4': variant === 'comfortable',
            'px-3 pb-4 pt-3': variant === 'compact' || variant === 'globe',
          })}
        >
          {renderHeadingSection()}
          {renderMeta()}
          {renderMiniCityCards()}
          {variant === 'globe' && (() => {
            const playCta = t('playMetroMemoryCta', { city: city.name })
            return (
              <div className="mt-3 flex w-full min-w-0 items-center justify-center rounded-md bg-zinc-600 px-3 py-2 text-sm font-semibold text-white shadow-sm group-hover:bg-zinc-500">
                <OverflowMarquee
                  className="w-full justify-center"
                  speed={36}
                  minDuration={8}
                  gap={28}
                  aria-label={playCta}
                  title={playCta}
                >
                  {playCta}
                </OverflowMarquee>
              </div>
            )
          })()}
        </div>
      </>
    )
  }

  const content = renderBody()

  const handleHover = (value: boolean) => {
    if (isUnavailableCity) {
      setIsHovered(value)
    }
  }
  const handleCardMouseEnter = () => {
    handleHover(true)
    onHoverStart?.()
  }
  const handleCardMouseLeave = () => {
    handleHover(false)
    onHoverEnd?.()
  }
  const usesInteractiveShell = isMapCardVariant

  if (isCityDisabled) {
    return (
      <div
        className={cardWrapperClasses}
        aria-disabled="true"
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        {showRightConnector && !isMapCardVariant && (
          <span
            aria-hidden="true"
            className={classNames(
              connectorClasses,
              'left-full',
            )}
          />
        )}
        {showBottomConnector && !isMapCardVariant && (
          <span aria-hidden="true" className={verticalConnectorClasses} />
        )}
        {renderHoverBridges()}
        {renderMiniCityDeckBackdrop()}
        <div className={cardSurfaceClasses}>{content}</div>
        {renderMiniCityDeckFlyout()}
      </div>
    )
  }

  function renderMiniCityDeckBackdrop() {
    if (!supportsMiniCityDeck) {
      return null
    }

    return miniCities.slice(0, 3).map((miniCity, index) => {
      const offsetX = 14 + index * 12
      const offsetY = 6 + index * 4
      const scale = 1 - index * 0.03
      return (
        <div
          key={`${miniCity.slug}-backdrop`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-violet-200/70 shadow-[0_20px_45px_rgba(109,40,217,0.14)] transition-all duration-320 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-violet-400/25"
          style={{
            transform: `translate(${miniDeckVisible ? offsetX + 14 : offsetX}px, ${offsetY}px) scale(${scale})`,
            opacity: miniDeckVisible ? 0.28 - index * 0.05 : 0.18 - index * 0.04,
            zIndex: 1 + index,
          }}
        >
          <Image
            draggable={false}
            src={getCityCardImagePath(miniCity.slug)}
            alt=""
            fill
            sizes="280px"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-violet-100/65 to-violet-200/75 dark:from-zinc-950/55 dark:via-violet-900/45 dark:to-violet-700/40" />
        </div>
      )
    })
  }

  function renderMiniCityDeckFlyout() {
    return null
  }

  function renderHoverBridges() {
    if (isMapCardVariant || (!showRightConnector && !showBottomConnector)) {
      return null
    }

    return (
      <>
        {showRightConnector ? (
          <span aria-hidden="true" className={horizontalHoverBridgeClasses} />
        ) : null}
        {showBottomConnector ? (
          <span aria-hidden="true" className={verticalHoverBridgeClasses} />
        ) : null}
      </>
    )
  }

  const handleMapCardClick = () => {
    if (isCityDisabled) {
      return
    }
    router.push(city.link)
  }

  const handleMapCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isCityDisabled) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleMapCardClick()
    }
  }

  if (usesInteractiveShell) {
    return (
      <>
        <div
          role="link"
          tabIndex={0}
          className={cardWrapperClasses}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
          onClick={handleMapCardClick}
          onKeyDown={handleMapCardKeyDown}
          aria-disabled={cityDisabled}
        >
          {showRightConnector && (
            <span
              aria-hidden="true"
              className={classNames(
                connectorClasses,
                'left-full',
              )}
            />
          )}
          {showBottomConnector && (
            <span aria-hidden="true" className={verticalConnectorClasses} />
          )}
          {renderHoverBridges()}
          {renderMiniCityDeckBackdrop()}
          <div className={cardSurfaceClasses}>{content}</div>
          {renderMiniCityDeckFlyout()}
        </div>
        {statsOpen && statsSlug && (
          <CityStatsPanel
            cityDisplayName={statsCityDisplayName}
            slug={statsSlug}
            cityPath={statsPath}
            open={statsOpen}
            onClose={() => {
              setStatsOpen(false)
              setStatsSlug(null)
              setStatsPath(null)
            }}
            onNavigatePrevious={hasCircularNavigation ? handlePrevStats : undefined}
            onNavigateNext={hasCircularNavigation ? handleNextStats : undefined}
          />
        )}
      </>
    )
  }

  return (
    <>
      <Link
        href={city.link}
        className={cardWrapperClasses}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        aria-disabled={cityDisabled}
      >
        {showRightConnector && !isMapCardVariant && (
          <span
            aria-hidden="true"
            className={classNames(
              connectorClasses,
              'left-full',
            )}
          />
        )}
        {showBottomConnector && !isMapCardVariant && (
          <span aria-hidden="true" className={verticalConnectorClasses} />
        )}
        {renderHoverBridges()}
        {renderMiniCityDeckBackdrop()}
        <div className={cardSurfaceClasses}>{content}</div>
        {renderMiniCityDeckFlyout()}
      </Link>
      {statsOpen && statsSlug && (
        <CityStatsPanel
          cityDisplayName={statsCityDisplayName}
          slug={statsSlug}
          cityPath={statsPath}
          open={statsOpen}
          onClose={() => {
            setStatsOpen(false)
            setStatsSlug(null)
            setStatsPath(null)
          }}
          onNavigatePrevious={hasCircularNavigation ? handlePrevStats : undefined}
          onNavigateNext={hasCircularNavigation ? handleNextStats : undefined}
        />
      )}
    </>
  )
}

export default CityCard

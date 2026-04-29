'use client'

import clsx from 'clsx'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { getCityIconPath } from '@/lib/cityAssets'

export const FALLBACK_ICON_SRC = '/favicon.ico'

type AchievementIconProps = {
  slug?: string
  cityName: string
  className?: string
  imageClassName?: string
  sizes?: string
  iconSrc?: string
}

const AchievementIcon = ({
  slug,
  cityName,
  className,
  imageClassName,
  sizes = '96px',
  iconSrc,
}: AchievementIconProps) => {
  const iconUrl = useMemo(() => {
    if (iconSrc) {
      return iconSrc
    }
    if (slug) {
      return getCityIconPath(slug, FALLBACK_ICON_SRC)
    }
    return FALLBACK_ICON_SRC
  }, [slug, iconSrc])
  const [src, setSrc] = useState<string>(iconUrl)
  const [isFallback, setIsFallback] = useState(false)
  const hasCustomIcon = Boolean(iconSrc)

  useEffect(() => {
    setSrc(iconUrl)
    setIsFallback(Boolean(iconSrc && iconSrc === FALLBACK_ICON_SRC))
  }, [iconUrl, iconSrc])

  const handleError = () => {
    if (!hasCustomIcon && !isFallback) {
      setSrc(FALLBACK_ICON_SRC)
      setIsFallback(true)
    }
  }

  return (
    <div
      className={clsx(
        'relative flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-[#18181b] dark:bg-zinc-900',
        className,
      )}
    >
      <Image
        src={src}
        alt={`${cityName} achievement icon`}
        fill
        sizes={sizes}
        unoptimized
        className={clsx('object-contain p-1', imageClassName)}
        onError={handleError}
      />
    </div>
  )
}

export default AchievementIcon

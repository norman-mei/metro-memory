import { Line } from '@/lib/types'
import clsx from 'clsx'
import Image from 'next/image'

export type LineBadgeShape = NonNullable<Line['badgeShape']>
export type LineBadgeFit = NonNullable<Line['badgeFit']>
export type LineBadgeSize = 'small' | 'medium'

type LineBadgeMetrics = {
  width: number
  height: number
  radius: number
  padding: number
}

type LineBadgeProps = {
  lineId: string
  line?: Partial<Line> | null
  iconBasePath?: string | null
  size?: LineBadgeSize
  defaultFit?: LineBadgeFit
  alt?: string
  className?: string
  imageClassName?: string
}

const LINE_BADGE_METRICS: Record<LineBadgeSize, Record<LineBadgeShape, LineBadgeMetrics>> = {
  small: {
    circle: {
      width: 24,
      height: 24,
      radius: 999,
      padding: 0,
    },
    capsule: {
      width: 46,
      height: 24,
      radius: 8,
      padding: 0,
    },
    square: {
      width: 24,
      height: 24,
      radius: 6,
      padding: 0,
    },
  },
  medium: {
    circle: {
      width: 40,
      height: 40,
      radius: 999,
      padding: 0,
    },
    capsule: {
      width: 76,
      height: 40,
      radius: 12,
      padding: 0,
    },
    square: {
      width: 40,
      height: 40,
      radius: 10,
      padding: 0,
    },
  },
}

export const getLineBadgeMetrics = (
  shape: LineBadgeShape = 'circle',
  size: LineBadgeSize = 'small',
) => LINE_BADGE_METRICS[size][shape]

export const resolveLineBadgeSrc = ({
  lineId,
  line,
  iconBasePath,
}: {
  lineId: string
  line?: Partial<Line> | null
  iconBasePath?: string | null
}) => {
  const icon = line?.icon
  if (icon) {
    if (icon.includes('/')) {
      return `/images/${icon}`
    }
    if (iconBasePath) {
      return `/images/${iconBasePath.replace(/^\//, '')}/${icon}`
    }
    return `/images/${icon}`
  }

  if (iconBasePath) {
    return `/images/${iconBasePath.replace(/^\//, '')}/${lineId}.svg`
  }

  return `/images/${lineId}.svg`
}

const LineBadge = ({
  lineId,
  line,
  iconBasePath,
  size = 'small',
  defaultFit = 'cover',
  alt,
  className,
  imageClassName,
}: LineBadgeProps) => {
  const shape = line?.badgeShape ?? 'circle'
  const fit = line?.badgeFit ?? defaultFit
  const metrics = getLineBadgeMetrics(shape, size)
  const src = resolveLineBadgeSrc({ lineId, line, iconBasePath })

  return (
    <div
      className={clsx('relative shrink-0 overflow-hidden', className)}
      style={{
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
      }}
    >
      <div
        className="absolute overflow-hidden"
        style={{
          inset: metrics.padding,
          borderRadius: Math.max(metrics.radius - metrics.padding, 0),
        }}
      >
        <Image
          alt={alt ?? line?.name ?? lineId}
          src={src}
          fill
          sizes={`${metrics.width}px`}
          quality={100}
          unoptimized
          className={clsx(
            fit === 'contain' ? 'object-contain' : 'object-cover',
            imageClassName,
          )}
        />
      </div>
    </div>
  )
}

export default LineBadge

import { ICity } from '@/lib/citiesConfig'
import classNames from 'classnames'
import clsx from 'clsx'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'

const getSlugFromLink = (link: string) => {
  if (!link.startsWith('/')) {
    return null
  }
  return link.replace(/^\//, '').split(/[?#]/)[0]
}

const CityCard = ({ city, className }: { city: ICity; className?: string }) => {
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const slug = getSlugFromLink(city.link)
    if (!slug) {
      setProgress(0)
      return () => {}
    }

    const readProgress = () => {
      if (typeof window === 'undefined') {
        return
      }

      try {
        const totalRaw = window.localStorage.getItem(`${slug}-station-total`)
        if (!totalRaw) {
          setProgress(0)
          return
        }

        const total = Number(totalRaw)
        if (!Number.isFinite(total) || total <= 0) {
          setProgress(0)
          return
        }

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

        setProgress(Math.max(0, Math.min(1, foundCount / total)))
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Unable to read city progress', error)
        }
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
  }, [city.link])

  const commonHeadingClasses = classNames(
    'text-2xl font-bold group-hover:underline',
    {
      'text-zinc-800 dark:text-zinc-100': !city.disabled,
      'text-zinc-400 dark:text-zinc-500': city.disabled,
    },
  )

  const cardWrapperClasses = clsx(
    'group mt-4 flex flex-col overflow-hidden rounded-2xl border border-transparent bg-zinc-100 shadow transition duration-200 ease-out dark:bg-zinc-800',
    {
      'hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-lg dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10':
        !city.disabled,
      'cursor-not-allowed opacity-80': city.disabled,
    },
  )

  const content = (
    <>
      <div
        className={clsx(
          'relative aspect-square w-full overflow-hidden',
          { grayscale: city.disabled },
          className,
        )}
      >
        <Image
          draggable={false}
          src={city.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="px-4 pb-6 pt-4">
        <h1 className={commonHeadingClasses}>
          {city.name}
          {city.disabled && ' (soon)'}
        </h1>
        {!city.disabled && (
          <div className="mt-1 flex items-center gap-3">
            <p
              className="text-sm font-semibold"
              style={{
                color: `hsl(${(progress ?? 0) * 120}, 65%, ${
                  40 + (progress ?? 0) * 20
                }%)`,
              }}
            >
              {((progress ?? 0) * 100).toFixed(2)}% found
            </p>
            <div className="h-6 w-6">
              <CircularProgressbar
                value={(progress ?? 0) * 100}
                strokeWidth={14}
                styles={buildStyles({
                  pathColor: `hsl(${(progress ?? 0) * 120}, 70%, 45%)`,
                  trailColor: 'rgba(148, 163, 184, 0.3)',
                  backgroundColor: 'transparent',
                })}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )

  if (city.disabled) {
    return (
      <div className={cardWrapperClasses} aria-disabled="true">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={city.link}
      className={cardWrapperClasses}
      aria-disabled={city.disabled}
    >
      {content}
    </Link>
  )
}

export default CityCard

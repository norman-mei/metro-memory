'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/Container'
import StatsGraph from '@/components/StatsGraph'
import { cities } from '@/lib/citiesConfig'
import { getCityOpenGraphImagePath } from '@/lib/cityAssets'
import { formatLocalizedCityName } from '@/lib/cityNameDisplay'
import { STATION_TOTALS } from '@/lib/stationTotals'
import slugify from '@/lib/slugify'
import type { FeatureCollection, LineString, Point } from 'geojson'

const CITY_MAP = new Map(cities.map((city) => [slugify(city), city]))

type CityData = {
  features: FeatureCollection<Point, { name: string; line: string }>
  routes: FeatureCollection<LineString, { color: string; name?: string }>
}

export default function CityStatsPage() {
  const { slug } = useParams<{ slug: string }>()
  const city = CITY_MAP.get(slug)
  const [stats, setStats] = useState<[string, number][]>([])
  const [cityData, setCityData] = useState<CityData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        const [statsRes, dataRes] = await Promise.all([
          fetch('/api/stats/' + slug),
          fetch('/api/city-data/' + slug),
        ])
        if (!statsRes.ok) throw new Error('Stats unavailable')
        if (!dataRes.ok) throw new Error('Map data unavailable')
        const [statsJson, dataJson] = await Promise.all([
          statsRes.json(),
          dataRes.json(),
        ])
        if (!cancelled) {
          setStats(statsJson)
          setCityData(dataJson)
        }
      } catch (err) {
        if (!cancelled) setError('Unable to load stats. Please try again later.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [slug])

  const stationCount = useMemo(() => cityData?.features?.features?.length ?? 0, [cityData])
  const lineCount = useMemo(() => cityData?.routes?.features?.length ?? 0, [cityData])
  const totalStations = STATION_TOTALS[slug] ?? stationCount

  const values = useMemo(() => {
    if (!cityData) return []

    const mapped = stats
      .map(([key, value]) => {
        const id = +key.replace(`${slug}-`, '')
        const feature = cityData.features.features.find((f) => f.id === id)
        if (!feature) return null
        return {
          id,
          name: feature.properties.name,
          value,
          line: feature.properties.line,
          geometry: feature.geometry,
        }
      })
      .filter(Boolean) as Array<{
      id: number
      name: string
      value: number
      line: string
      geometry: Point
    }>

    const grouped = mapped.reduce<Record<string, typeof mapped>>((acc, item) => {
      acc[item.name] = acc[item.name] || []
      acc[item.name].push(item)
      return acc
    }, {})

    const groups = Object.values(grouped)

    return groups.map((items, index) =>
      items.reduce<{
        lines: string[]
        value: number
        name: string
        geometry: Point
        id: number
        percentile: number
      }>(
        (acc, item) => ({
          name: item.name,
          value: item.value,
          geometry: item.geometry,
          lines: [...acc.lines, item.line],
          id: item.id,
          percentile: index / groups.length,
        }),
        {
          lines: [],
          value: 0,
          name: '',
          geometry: { type: 'Point', coordinates: [0, 0] },
          id: 0,
          percentile: 0,
        },
      ),
    )
  }, [cityData, slug, stats])

  const cityName = city?.name ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const iconPath = getCityOpenGraphImagePath(slug)

  return (
    <Container className="mt-10 pb-20">
      <Link
        href="/stats"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
        All cities
      </Link>

      <header className="mt-6 flex items-center gap-4">
        {iconPath && (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-900">
            <Image
              src={iconPath}
              alt={cityName + ' icon'}
              fill
              sizes="64px"
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            {cityName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {totalStations > 0 ? totalStations.toLocaleString() + ' stations' : ''}
            {totalStations > 0 && lineCount > 0 ? ' · ' : ''}
            {lineCount > 0 ? lineCount + ' lines' : ''}
          </p>
        </div>
      </header>

      <div className="mt-8 mb-4 flex flex-wrap gap-3">
        <Link
          href={city?.link ?? '/'}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-600)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-700)] dark:bg-[var(--accent-500)] dark:hover:bg-[var(--accent-400)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          Play this city
        </Link>
      </div>

      {loading && (
        <div className="mt-8 space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800/50" />
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && stats.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Most found stations
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            How often each station is guessed across all players.
          </p>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <StatsGraph values={values} routes={cityData!.routes} slug={slug} />
          </div>
        </section>
      )}

      {!loading && !error && stats.length === 0 && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No stats available for this city yet.
          </p>
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Other cities
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from(CITY_MAP.entries())
            .filter(([s]) => s !== slug)
            .sort(([, a], [, b]) => (a.name ?? '').localeCompare(b.name ?? ''))
            .slice(0, 30)
            .map(([s, c]) => (
              <Link
                key={s}
                href={'/stats/' + s}
                className="inline-flex rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
              >
                {c.name ?? s}
              </Link>
            ))}
        </div>
        <Link
          href="/stats"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-600)] hover:text-[var(--accent-700)] dark:text-[var(--accent-400)] dark:hover:text-[var(--accent-300)]"
        >
          View all cities
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>
      </section>
    </Container>
  )
}
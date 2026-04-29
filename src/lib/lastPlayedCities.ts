export type LastPlayedCityEntry = {
  slug: string
  path: string
  playedAt: number
}

const LAST_PLAYED_CITIES_STORAGE_KEY = 'mm-last-played-cities'
const MAX_LAST_PLAYED_CITIES = 25

function isLastPlayedCityEntry(value: unknown): value is LastPlayedCityEntry {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<LastPlayedCityEntry>
  return (
    typeof candidate.slug === 'string' &&
    candidate.slug.length > 0 &&
    typeof candidate.path === 'string' &&
    candidate.path.startsWith('/') &&
    typeof candidate.playedAt === 'number' &&
    Number.isFinite(candidate.playedAt)
  )
}

export function readLastPlayedCities(): LastPlayedCityEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(LAST_PLAYED_CITIES_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(isLastPlayedCityEntry)
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, MAX_LAST_PLAYED_CITIES)
  } catch {
    return []
  }
}

export function rememberLastPlayedCity(entry: Pick<LastPlayedCityEntry, 'slug' | 'path'>) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const nextEntries = [
      {
        slug: entry.slug,
        path: entry.path,
        playedAt: Date.now(),
      },
      ...readLastPlayedCities().filter((item) => item.slug !== entry.slug),
    ].slice(0, MAX_LAST_PLAYED_CITIES)

    window.localStorage.setItem(LAST_PLAYED_CITIES_STORAGE_KEY, JSON.stringify(nextEntries))
  } catch {
    // ignore storage errors
  }
}

const ACCESS_KEY = 'global-solutions-access-granted'
const SELECTION_KEY = 'global-solutions-selection'
const AUTO_REVEAL_SUPPRESSION_KEY = 'solutions-auto-reveal-suppressed'

export type SolutionsSelection = {
  mode: 'all' | 'custom'
  cities: string[]
}

const DEFAULT_SELECTION: SolutionsSelection = {
  mode: 'custom',
  cities: [],
}

const isBrowser = () => typeof window !== 'undefined'

const readSuppressedSet = () => {
  if (!isBrowser()) {
    return new Set<string>()
  }
  const raw = window.localStorage.getItem(AUTO_REVEAL_SUPPRESSION_KEY)
  if (!raw) {
    return new Set<string>()
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(
        parsed.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0),
      )
    }
  } catch {
    // ignore malformed entries
  }
  return new Set<string>()
}

const writeSuppressedSet = (set: Set<string>) => {
  if (!isBrowser()) {
    return
  }
  if (set.size === 0) {
    window.localStorage.removeItem(AUTO_REVEAL_SUPPRESSION_KEY)
    return
  }
  window.localStorage.setItem(AUTO_REVEAL_SUPPRESSION_KEY, JSON.stringify(Array.from(set)))
}

const isAutoRevealSuppressed = (citySlug: string) => {
  const normalized = (citySlug ?? '').trim()
  if (!normalized) {
    return false
  }
  return readSuppressedSet().has(normalized)
}

export const suppressAutoRevealForCity = (citySlug: string) => {
  if (!isBrowser()) {
    return
  }
  const normalized = (citySlug ?? '').trim()
  if (!normalized) {
    return
  }
  const suppressed = readSuppressedSet()
  if (suppressed.has(normalized)) {
    return
  }
  suppressed.add(normalized)
  writeSuppressedSet(suppressed)
}

export const clearAutoRevealSuppressionForCity = (citySlug: string) => {
  if (!isBrowser()) {
    return
  }
  const normalized = (citySlug ?? '').trim()
  if (!normalized) {
    return
  }
  const suppressed = readSuppressedSet()
  if (!suppressed.delete(normalized)) {
    return
  }
  writeSuppressedSet(suppressed)
}

export const readSolutionsAccess = () => {
  if (!isBrowser()) return false
  return window.localStorage.getItem(ACCESS_KEY) === 'true'
}

export const writeSolutionsAccess = (granted: boolean) => {
  if (!isBrowser()) return
  if (granted) {
    window.localStorage.setItem(ACCESS_KEY, 'true')
  } else {
    window.localStorage.removeItem(ACCESS_KEY)
  }
}

export const readSolutionsSelection = (): SolutionsSelection => {
  if (!isBrowser()) return DEFAULT_SELECTION
  const raw = window.localStorage.getItem(SELECTION_KEY)
  if (!raw) {
    return DEFAULT_SELECTION
  }
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      (parsed.mode === 'all' || parsed.mode === 'custom') &&
      Array.isArray(parsed.cities)
    ) {
      const uniqueCities = Array.from(
        new Set<string>(
          parsed.cities.filter(
            (slug: unknown): slug is string =>
              typeof slug === 'string' && slug.length > 0,
          ),
        ),
      )
      return {
        mode: parsed.mode,
        cities: uniqueCities,
      }
    }
  } catch {
    // ignore parsing errors
  }
  return DEFAULT_SELECTION
}

export const writeSolutionsSelection = (selection: SolutionsSelection) => {
  if (!isBrowser()) return
  const normalized: SolutionsSelection = {
    mode: selection.mode === 'all' ? 'all' : 'custom',
    cities:
      selection.mode === 'custom'
        ? Array.from(
            new Set<string>(
              (selection.cities ?? []).filter(
                (slug): slug is string => typeof slug === 'string' && slug.length > 0,
              ),
            ),
          )
        : [],
  }
  window.localStorage.setItem(SELECTION_KEY, JSON.stringify(normalized))
}

export const shouldAutoRevealSolutions = (citySlug: string) => {
  if (!isBrowser()) return false
  if (!readSolutionsAccess()) return false
  if (isAutoRevealSuppressed(citySlug)) {
    return false
  }
  const selection = readSolutionsSelection()
  if (selection.mode === 'all') {
    return true
  }
  return selection.cities.includes(citySlug)
}

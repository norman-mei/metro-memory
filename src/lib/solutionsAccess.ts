const ACCESS_KEY = 'global-solutions-access-granted'
const SELECTION_KEY = 'global-solutions-selection'

export type SolutionsSelection = {
  mode: 'all' | 'custom'
  cities: string[]
}

const DEFAULT_SELECTION: SolutionsSelection = {
  mode: 'custom',
  cities: [],
}

const isBrowser = () => typeof window !== 'undefined'

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
  const selection = readSolutionsSelection()
  if (selection.mode === 'all') {
    return true
  }
  return selection.cities.includes(citySlug)
}

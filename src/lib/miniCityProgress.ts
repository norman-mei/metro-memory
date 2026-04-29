type CityDataPayload = {
  features?: Array<{
    id?: number | string | null
  }>
}

const miniCityStationIdSetCache = new Map<string, Promise<Set<number>>>()

const extractStationIds = (payload: CityDataPayload): Set<number> => {
  const ids = new Set<number>()
  payload.features?.forEach((feature) => {
    if (typeof feature?.id === 'number' && Number.isFinite(feature.id)) {
      ids.add(feature.id)
    }
  })
  return ids
}

export const loadMiniCityStationIdSet = (slug: string): Promise<Set<number>> => {
  const cached = miniCityStationIdSetCache.get(slug)
  if (cached) {
    return cached
  }

  const request = fetch(`/city-data/${slug}.json`, {
    cache: 'force-cache',
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Unable to load city data for ${slug}`)
      }
      const payload = (await response.json()) as CityDataPayload
      return extractStationIds(payload)
    })
    .catch((error) => {
      miniCityStationIdSetCache.delete(slug)
      throw error
    })

  miniCityStationIdSetCache.set(slug, request)
  return request
}

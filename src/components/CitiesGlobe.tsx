
'use client'

import { ICity, cities as defaultCities, getSlugFromLink, isCityDisabled as isCityDisabledFlag } from '@/lib/citiesConfig'
import { CITY_COORDINATES } from '@/lib/cityCoordinates'
import { disableMapboxTelemetry } from '@/lib/mapboxTelemetry'
import { MINI_CITIES, MINI_CITY_MARKER_COORDINATES } from '@/lib/miniCities'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useTheme } from 'next-themes'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CloseButton from './CloseButton'
import CityCard from './CityCard'

const CONTINENT_BOUNDS: Record<string, mapboxgl.LngLatBoundsLike> = {
  'North America': [
    [-169, 5],
    [-52, 83],
  ],
  'South America': [
    [-92, -58],
    [-30, 15],
  ],
  Europe: [
    [-25, 34],
    [45, 72],
  ],
  Asia: [
    [25, -5],
    [170, 80],
  ],
  Africa: [
    [-20, -35],
    [55, 38],
  ],
  Oceania: [
    [110, -50],
    [180, 5],
  ],
}

const CONTINENT_SOURCE_ID = 'continent-boundaries'
const CONTINENT_FILL_LAYER_ID = 'continent-highlight-fill'
const CONTINENT_LINE_LAYER_ID = 'continent-highlight-outline'
const CITY_SOURCE_ID = 'cities'
const CITY_POINTS_LAYER_ID = 'city-points'
const CITY_MINI_LAYER_ID = 'city-mini-points'
const CITY_FAVORITES_LAYER_ID = 'city-favorites'
const CITY_RECOMMENDATION_GLOW_LAYER_ID = 'city-recommendation-glow'
const DEFAULT_HOME_VIEW: Record<'globe' | 'mercator', { center: [number, number]; zoom: number }> = {
  globe: {
    center: [-40, 20],
    zoom: 1.5,
  },
  mercator: {
    center: [-20, 18],
    zoom: 1.2,
  },
}
const MINI_CITY_LAYER_MIN_ZOOM: Record<'globe' | 'mercator', number> = {
  globe: 4.25,
  mercator: 5,
}
const DEFAULT_CITY_CARD_IMAGE = '/city-cards/_default.jpg'

const getMiniCityOffsetCoordinates = (
  parentCoords: [number, number],
  index: number,
  total: number,
): [number, number] => {
  const [lng, lat] = parentCoords
  const angle = ((index / Math.max(total, 1)) * Math.PI * 2) - Math.PI / 2
  const distance = total <= 1 ? 0.22 : Math.min(0.34, 0.2 + total * 0.018)
  const cosLat = Math.max(0.35, Math.cos((Math.abs(lat) * Math.PI) / 180))
  const lngOffset = (Math.cos(angle) * distance) / cosLat
  const latOffset = Math.sin(angle) * distance * 0.7
  return [lng + lngOffset, lat + latOffset]
}

const buildMiniCityCard = (
  miniCity: (typeof MINI_CITIES)[number],
  parentCity?: ICity,
): ICity => ({
  name: miniCity.name,
  image: miniCity.image ?? parentCity?.image ?? DEFAULT_CITY_CARD_IMAGE,
  link: miniCity.link,
  continent: miniCity.continent,
  disabled: parentCity ? isCityDisabledFlag(parentCity) : false,
  keywords: miniCity.keywords,
})

const getProgressColor = (progress: number): string => {
  // progress is 0 to 100
  // 0 -> Red (#ef4444)
  // 50 -> Yellow (#eab308)
  // 100 -> Green (#22c55e)

  if (progress <= 0) return '#ef4444' // red-500
  if (progress >= 100) return '#22c55e' // green-500

  // We can do a simpler discrete mapping or a linear interpolation
  if (progress < 50) {
    // Red to Yellow
    // 0 -> 255, 0, 0
    // 50 -> 255, 255, 0
    return '#eab308' // For simplicity in this iteration, let's stick to simple buckets or just use the hex codes directly via interpolation if needed. 
    // Actually user asked for a scale.
  }

  // Linear Interpolation Helper
  const lerp = (start: number, end: number, t: number) => start + (end - start) * t
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

  // Red: 239, 68, 68 (#ef4444)
  // Yellow: 234, 179, 8 (#eab308)
  // Green: 34, 197, 94 (#22c55e)

  let r, g, b
  if (progress < 50) {
    const t = progress / 50
    r = lerp(239, 234, t)
    g = lerp(68, 179, t)
    b = lerp(68, 8, t)
  } else {
    const t = (progress - 50) / 50
    r = lerp(234, 34, t)
    g = lerp(179, 197, t)
    b = lerp(8, 94, t)
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function CitiesGlobe({
  cities = defaultCities,
  cityProgress = {},
  projection = 'globe',
  satellite = false,
  recommendedSlugs = [],
  favoriteSlugs = new Set<string>(),
  onToggleFavorite,
  userLocation = null,
  selectedContinent,
  continentFocusVersion,
  selectedCountry,
  countryFocusVersion,
}: {
  cities?: ICity[]
  cityProgress?: Record<string, number>
  projection?: 'globe' | 'mercator'
  satellite?: boolean
  recommendedSlugs?: string[]
  favoriteSlugs?: Set<string>
  onToggleFavorite?: (slug: string, next: boolean) => void
  userLocation?: [number, number] | null
  selectedContinent?: string
  continentFocusVersion?: number
  selectedCountry?: string
  countryFocusVersion?: number
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const { resolvedTheme } = useTheme()
  const recommendedSet = useMemo(() => new Set(recommendedSlugs), [recommendedSlugs])
  const cityBySlug = useMemo(
    () =>
      new Map(
        cities
          .map((city) => {
            const slug = getSlugFromLink(city.link)
            return slug ? ([slug, city] as const) : null
          })
          .filter((entry): entry is readonly [string, ICity] => entry !== null),
      ),
    [cities],
  )
  const miniCityCards = useMemo(
    () =>
      MINI_CITIES.map((miniCity) => buildMiniCityCard(miniCity, cityBySlug.get(miniCity.parentSlug))),
    [cityBySlug],
  )
  const mapPopupCities = useMemo(() => [...cities, ...miniCityCards], [cities, miniCityCards])
  const popupCitiesRef = useRef<ICity[]>(mapPopupCities)
  const mapFeatures = useMemo(() => {
    const features: Array<Record<string, unknown>> = []

    cities.forEach((city) => {
      const slug = getSlugFromLink(city.link)
      if (!slug) return
      const coords = CITY_COORDINATES[slug]
      if (!coords) return
      const progress = cityProgress[slug] || 0
      const isDisabled = isCityDisabledFlag(city)
      const isRecommended = recommendedSet.has(slug) && !isDisabled
      const isFavorite = favoriteSlugs.has(slug)

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords,
        },
        properties: {
          name: city.name,
          slug,
          parentSlug: slug,
          markerType: 'city',
          color: isDisabled ? '#9ca3af' : getProgressColor(progress * 100),
          recommended: isRecommended,
          disabled: isDisabled,
          favorite: isFavorite,
          progress: progress * 100,
        },
      })
    })

    const miniCitiesByParent = new Map<string, typeof MINI_CITIES>()
    MINI_CITIES.forEach((miniCity) => {
      const siblings = miniCitiesByParent.get(miniCity.parentSlug)
      if (siblings) {
        siblings.push(miniCity)
      } else {
        miniCitiesByParent.set(miniCity.parentSlug, [miniCity])
      }
    })

    miniCitiesByParent.forEach((siblings, parentSlug) => {
      const parentCoords = CITY_COORDINATES[parentSlug]
      const parentCity = cityBySlug.get(parentSlug)
      if (!parentCoords || !parentCity) {
        return
      }

      siblings.forEach((miniCity, index) => {
        const progress = cityProgress[miniCity.slug] || 0
        const isDisabled = isCityDisabledFlag(parentCity)
        const isFavorite = favoriteSlugs.has(miniCity.slug)
        const isRecommended = recommendedSet.has(miniCity.slug) && !isDisabled
        const coordinates =
          MINI_CITY_MARKER_COORDINATES[miniCity.slug] ??
          getMiniCityOffsetCoordinates(parentCoords, index, siblings.length)

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates,
          },
          properties: {
            name: miniCity.name,
            slug: miniCity.slug,
            parentSlug,
            markerType: 'mini',
            color: isDisabled ? '#9ca3af' : getProgressColor(progress * 100),
            recommended: isRecommended,
            disabled: isDisabled,
            favorite: isFavorite,
            progress: progress * 100,
          },
        })
      })
    })

    return {
      type: 'FeatureCollection',
      features,
    }
  }, [cities, cityBySlug, cityProgress, favoriteSlugs, recommendedSet])
  const lastUserLocationRef = useRef<string | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const homeViewRef = useRef(DEFAULT_HOME_VIEW[projection])
  const [activePopup, setActivePopup] = useState<{
    lngLat: [number, number]
    city: ICity
  } | null>(null)
  const [mapBearing, setMapBearing] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  const handleClosePopup = useCallback(() => {
    setActivePopup(null)
  }, [])

  useEffect(() => {
    popupCitiesRef.current = mapPopupCities
  }, [mapPopupCities])

  const getCountryFromLink = useCallback((link: string) => {
    const path = link.replace(/^\//, '').split(/[?#]/)[0]
    const segments = path.split('/').filter(Boolean)
    return segments.length >= 2 ? segments[1] : null
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current) return
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      setMapError('Map cannot load because NEXT_PUBLIC_MAPBOX_TOKEN is missing.')
      return
    }
    disableMapboxTelemetry()
    mapboxgl.accessToken = token

    if (!mapboxgl.supported()) {
      setMapError('3D globe is unavailable because WebGL is not supported on this device or browser.')
      return
    }

    setMapError(null)

    const isDark = resolvedTheme === 'dark'
    const style = satellite
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : isDark
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11'

    let map: mapboxgl.Map

    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style,
        center: DEFAULT_HOME_VIEW[projection].center,
        zoom: DEFAULT_HOME_VIEW[projection].zoom,
        projection: projection as any,
      })
    } catch (error) {
      console.error('Failed to initialize CitiesGlobe map', error)
      setMapError('3D globe could not be initialized on this device. You can still browse the cities list below.')
      return
    }

    mapRef.current = map
    map.once('load', () => {
      setMapReady(true)
      setMapBearing(map.getBearing())
    })

    const syncBearing = () => {
      setMapBearing(map.getBearing())
    }
    map.on('rotate', syncBearing)

    // Add interactions immediately (they persist across style changes)
    map.on('mousemove', CITY_POINTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mousemove', CITY_MINI_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mousemove', CITY_FAVORITES_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', CITY_POINTS_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('mouseleave', CITY_MINI_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })
    map.on('mouseleave', CITY_FAVORITES_LAYER_ID, () => {
      map.getCanvas().style.cursor = ''
    })

    const handleCityClick = (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      const feature = e.features?.[0]
      if (!feature) return

      const coordinates = (feature.geometry as any).coordinates.slice()
      const slug = feature.properties?.slug

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
      }

      const city = popupCitiesRef.current.find((c) => getSlugFromLink(c.link) === slug)
      if (city) {
        map.flyTo({
          center: coordinates,
          zoom: Math.max(map.getZoom(), 4),
          speed: 0.8,
          curve: 1,
          essential: true,
        })

        setActivePopup({
          lngLat: coordinates as [number, number],
          city,
        })
      }
    }

    // Handle clicks
    map.on('click', CITY_POINTS_LAYER_ID, handleCityClick)
    map.on('click', CITY_MINI_LAYER_ID, handleCityClick)
    map.on('click', CITY_FAVORITES_LAYER_ID, handleCityClick)

    return () => {
      map.off('rotate', syncBearing)
      map.remove()
    }
    // create map once; style/projection/satellite handled in other effects
  }, [])

  useEffect(() => {
    homeViewRef.current = DEFAULT_HOME_VIEW[projection]
  }, [projection])

  // Update map source when cities change or style reloads
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const updateSource = () => {
      // Apply Fog (needs to be re-applied on style load)
      const isDark = resolvedTheme === 'dark'
      // Only apply fog for globe view (optional but safer)
      if (projection === 'globe') {
        try {
          map.setFog({
            color: isDark ? 'rgb(186, 210, 235)' : 'rgb(255, 255, 255)',
            'high-color': isDark ? 'rgb(36, 92, 223)' : 'rgb(200, 200, 225)',
            'horizon-blend': 0.02,
            'space-color': isDark ? 'rgb(11, 11, 25)' : 'rgb(150, 150, 175)',
            'star-intensity': isDark ? 0.6 : 0,
          } as any)
        } catch (e) {
          console.error("Error setting fog", e)
        }
      } else {
        // For mercator, maybe reset fog? Mapbox usually writes over it.
      }

      // If source doesn't exist, add it. Otherwise, update its data.
      if (!map.getSource(CITY_SOURCE_ID)) {
        map.addSource(CITY_SOURCE_ID, {
          type: 'geojson',
          data: mapFeatures as any,
        })

        // Re-add layer if it doesn't exist (style might have changed)
        if (!map.getLayer(CITY_POINTS_LAYER_ID)) {
          const isDark = resolvedTheme === 'dark'

          map.addLayer({
            id: CITY_POINTS_LAYER_ID,
            type: 'circle',
            source: CITY_SOURCE_ID,
            filter: ['all', ['==', ['get', 'markerType'], 'city'], ['!=', ['get', 'favorite'], true]],
            paint: {
              'circle-radius': 6,
              'circle-color': ['get', 'color'],
              'circle-stroke-color': [
                'case',
                ['boolean', ['get', 'disabled'], false],
                '#64748b',
                ['boolean', ['get', 'recommended'], false],
                '#facc15',
                isDark ? '#000' : '#fff',
              ],
              'circle-stroke-width': [
                'case',
                ['boolean', ['get', 'recommended'], false],
                3,
                ['boolean', ['get', 'disabled'], false],
                1,
                2,
              ],
              'circle-opacity': [
                'case',
                ['boolean', ['get', 'disabled'], false],
                0.6,
                1,
              ],
            },
          })

          map.addLayer({
            id: CITY_MINI_LAYER_ID,
            type: 'symbol',
            source: CITY_SOURCE_ID,
            filter: [
              'all',
              ['==', ['get', 'markerType'], 'mini'],
              ['!=', ['get', 'favorite'], true],
            ],
            minzoom: MINI_CITY_LAYER_MIN_ZOOM[projection],
            layout: {
              'text-field': '◆',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 14.5,
              'text-allow-overlap': true,
            },
            paint: {
              'text-color': ['get', 'color'],
              'text-halo-color': isDark ? '#020617' : '#ffffff',
              'text-halo-width': 1.8,
              'text-opacity': [
                'case',
                ['boolean', ['get', 'disabled'], false],
                0.6,
                1,
              ],
            },
          })

          map.addLayer({
            id: CITY_FAVORITES_LAYER_ID,
            type: 'symbol',
            source: CITY_SOURCE_ID,
            filter: ['==', ['get', 'favorite'], true],
            layout: {
              'text-field': '\u2605',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 18,
              'text-allow-overlap': true,
            },
            paint: {
              'text-color': [
                'case',
                ['>=', ['get', 'progress'], 99.9],
                '#22c55e', // green: completed + favorited
                ['>', ['get', 'progress'], 0],
                '#facc15', // yellow: in-progress + favorited
                '#ef4444', // red: not-started + favorited
              ],
              'text-halo-color': isDark ? '#111827' : '#ffffff',
              'text-halo-width': 1.5,
            },
          })

          if (!map.getLayer(CITY_RECOMMENDATION_GLOW_LAYER_ID)) {
            map.addLayer(
              {
                id: CITY_RECOMMENDATION_GLOW_LAYER_ID,
                type: 'circle',
                source: CITY_SOURCE_ID,
                filter: [
                  'all',
                  ['==', ['get', 'recommended'], true],
                  ['==', ['get', 'markerType'], 'city'],
                  ['!=', ['get', 'disabled'], true],
                ],
                paint: {
                  'circle-radius': 14,
                  'circle-color': '#facc15',
                  'circle-blur': 0.6,
                  'circle-opacity': 0.65,
                },
              },
              CITY_POINTS_LAYER_ID,
            )
          }

        }
      } else {
        // @ts-ignore
        map.getSource(CITY_SOURCE_ID).setData(mapFeatures as any)
        if (map.getLayer(CITY_MINI_LAYER_ID)) {
          map.setLayerZoomRange(CITY_MINI_LAYER_ID, MINI_CITY_LAYER_MIN_ZOOM[projection], 24)
        }
      }
    }

    const safeUpdate = () => {
      if (map.isStyleLoaded()) {
        updateSource()
      } else {
        map.once('style.load', updateSource)
      }
    }

    // Subscribe to style.load to handle style switches
    map.on('style.load', safeUpdate)
    // Also run immediately if loaded (for initial render)
    safeUpdate()

    return () => {
      map.off('style.load', safeUpdate)
    }
  }, [mapReady, mapFeatures, projection, resolvedTheme])

  // Handle projection changes dynamically if map instance exists
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setProjection(projection as any)
      // Reset fog or style if needed?
      // Globe usually has fog, mercator usually doesn't, but let's keep it simple.
      // Mapbox handles projection switch gracefully.
    }
  }, [projection])

  // Handle style changes (Theme or Satellite toggle)
  useEffect(() => {
    if (!mapRef.current) return

    const isDark = resolvedTheme === 'dark'
    const style = satellite
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : isDark
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11'

    // Only set style if it's different to avoid reloading
    // Actually mapbox doesn't expose current style URL easily, but setStyle is optimized if same.
    // However, we can track it or just call it.

    mapRef.current.setStyle(style)
    // The 'style.load' event handler in the other useEffect will trigger updateSource
    // to re-add our layers.
  }, [resolvedTheme, satellite])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      return
    }

    const createMarkerElement = () => {
      const el = document.createElement('div')
      el.style.width = '12px'
      el.style.height = '12px'
      el.style.borderRadius = '999px'
      el.style.background = '#3b82f6'
      el.style.border = '2px solid #ffffff'
      el.style.boxShadow = '0 0 0 8px rgba(59, 130, 246, 0.35)'
      el.style.pointerEvents = 'none'
      return el
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({
        element: createMarkerElement(),
        anchor: 'center',
      })
        .setLngLat(userLocation)
        .addTo(map)
    } else {
      userMarkerRef.current.setLngLat(userLocation)
    }
  }, [mapReady, userLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !userLocation) return
    const key = userLocation.join(',')
    if (lastUserLocationRef.current === key) return
    lastUserLocationRef.current = key
    map.flyTo({
      center: userLocation,
      zoom: projection === 'globe' ? 3.5 : 5.5,
      speed: 1.2,
      essential: true,
    })
  }, [mapReady, projection, userLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const bounds = selectedContinent ? CONTINENT_BOUNDS[selectedContinent] : undefined
    const filter: any =
      selectedContinent && selectedContinent in CONTINENT_BOUNDS
        ? ['match', ['get', 'continent'], [selectedContinent], true, false]
        : ['==', ['get', 'continent'], '']

    const ensureLayers = () => {
      if (!map.getSource(CONTINENT_SOURCE_ID)) {
        map.addSource(CONTINENT_SOURCE_ID, {
          type: 'vector',
          url: 'mapbox://mapbox.country-boundaries-v1',
        })
      }

      const beforeId = map.getLayer(CITY_POINTS_LAYER_ID) ? CITY_POINTS_LAYER_ID : undefined

      if (!map.getLayer(CONTINENT_FILL_LAYER_ID)) {
        map.addLayer(
          {
            id: CONTINENT_FILL_LAYER_ID,
            type: 'fill',
            source: CONTINENT_SOURCE_ID,
            'source-layer': 'country_boundaries',
            paint: {
              'fill-color': '#ef4444',
              'fill-opacity': 0.2,
            },
            filter,
          },
          beforeId,
        )
      } else {
        map.setFilter(CONTINENT_FILL_LAYER_ID, filter)
      }

      if (!map.getLayer(CONTINENT_LINE_LAYER_ID)) {
        map.addLayer(
          {
            id: CONTINENT_LINE_LAYER_ID,
            type: 'line',
            source: CONTINENT_SOURCE_ID,
            'source-layer': 'country_boundaries',
            paint: {
              'line-color': '#ef4444',
              'line-width': 2.8,
            },
            filter,
          },
          beforeId,
        )
      } else {
        map.setFilter(CONTINENT_LINE_LAYER_ID, filter)
      }
    }

    if (map.isStyleLoaded()) {
      ensureLayers()
    } else {
      map.once('style.load', ensureLayers)
    }

    if (bounds && selectedContinent) {
      map.fitBounds(bounds, {
        padding: 80,
        duration: 1200,
        essential: true,
        maxZoom: projection === 'globe' ? 3.5 : 4.5,
      })
    }
  }, [selectedContinent, continentFocusVersion, mapReady, projection, resolvedTheme, satellite])

  // Focus on a specific country (based on city coordinates) when requested
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !selectedCountry) return

    const countrySlug = selectedCountry.toLowerCase()
    const points = cities
      .map((city) => {
        const slug = getSlugFromLink(city.link)
        const country = getCountryFromLink(city.link)?.toLowerCase()
        if (!slug || !country || country !== countrySlug) return null
        const coords = CITY_COORDINATES[slug]
        return coords ? coords : null
      })
      .filter((coords): coords is [number, number] => Array.isArray(coords))

    if (points.length === 0) return

    const bounds = new mapboxgl.LngLatBounds()
    points.forEach((coord) => bounds.extend(coord as [number, number]))

    map.fitBounds(bounds, {
      padding: projection === 'globe' ? 140 : 120,
      duration: 1200,
      essential: true,
      maxZoom: projection === 'globe' ? 5 : 6.5,
    })
  }, [selectedCountry, countryFocusVersion, mapReady, projection, cities, getCountryFromLink])

  // Auto-fly if only one city is visible (search result)
  useEffect(() => {
    if (cities.length === 1 && mapRef.current) {
      const city = cities[0]
      const slug = getSlugFromLink(city.link)
      if (slug) {
        const coords = CITY_COORDINATES[slug]
        if (coords) {
          mapRef.current.flyTo({
            center: coords,
            zoom: 4, // Closer zoom for single result
            speed: 1.5,
          })
          // Optional: Automatically open popup?
          // setActivePopup({ lngLat: coords, city })
        }
      }
    }
  }, [cities])

  const handleResetView = useCallback(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const { center, zoom } = homeViewRef.current
    map.flyTo({
      center,
      zoom,
      bearing: 0,
      pitch: 0,
      speed: 1.1,
      essential: true,
    })
    setActivePopup(null)
  }, [])

  return (
    <div className="relative h-[80vh] w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-xl">
      {mapError ? (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-white">
          {mapError}
        </div>
      ) : (
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
      )}

      {!mapError ? (
        <div className="pointer-events-auto absolute left-4 top-4 z-20 flex flex-col overflow-hidden rounded-[1.5rem] bg-white/90 text-zinc-700 shadow-lg ring-1 ring-white/60 backdrop-blur dark:bg-zinc-900/80 dark:text-zinc-100 dark:ring-black/50">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() =>
                mapRef.current?.easeTo({
                  bearing: 0,
                  pitch: 0,
                  duration: 700,
                  essential: true,
                })
              }
              className="flex h-10 w-10 items-center justify-center border-b border-zinc-200/80 bg-transparent text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
              aria-label="Reset orientation"
              title="Reset orientation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  opacity="0.55"
                />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.7" />
                <g
                  style={{
                    transform: `rotate(${-mapBearing}deg)`,
                    transformOrigin: '12px 12px',
                  }}
                >
                  <polygon points="12,3.5 15.6,12 12,10.5 8.4,12" fill="#ef4444" />
                  <polygon
                    points="12,20.5 15.6,12 12,13.5 8.4,12"
                    fill="currentColor"
                    opacity="0.75"
                  />
                </g>
                <circle
                  cx="12"
                  cy="3.8"
                  r="2.3"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="0.7"
                />
                <text
                  x="12"
                  y="3.9"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="3.1"
                  fontWeight="800"
                  fill="#ffffff"
                  fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                >
                  N
                </text>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="flex h-10 w-10 items-center justify-center border-b border-zinc-200/80 bg-transparent text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
              aria-label="Reset view"
              title="Reset view"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6a6 6 0 0 1-6 6c-2.97 0-5.43-2.16-5.91-5H4.07c.5 3.95 3.86 7 7.93 7 4.42 0 8-3.58 8-8s-3.58-8-8-8Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-10 w-10 items-center justify-center border-b border-zinc-200/80 bg-transparent text-lg font-semibold text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-700/80 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-10 w-10 items-center justify-center bg-transparent text-lg font-semibold text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:text-zinc-100 dark:hover:bg-zinc-800/80"
              aria-label="Zoom out"
              title="Zoom out"
            >
              -
            </button>
          </div>
        </div>
      ) : null}

      {activePopup && mapRef.current && (
        <Popup
          map={mapRef.current}
          lngLat={activePopup.lngLat}
          onClose={handleClosePopup}
        >
          <style jsx global>{`
            .city-popup .mapboxgl-popup-content {
              background-color: #f4f4f5 !important; /* bg-zinc-100 */
              color: #27272a !important; /* text-zinc-800 */
              padding: 0 !important;
              border-radius: 1rem !important;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
            }
            .dark .city-popup .mapboxgl-popup-content {
              background-color: #27272a !important; /* bg-zinc-800 */
              color: #f4f4f5 !important; /* text-zinc-100 */
            }
            .city-popup .mapboxgl-popup-tip {
              border-top-color: #f4f4f5 !important;
              border-bottom-color: #f4f4f5 !important;
            }
            .dark .city-popup .mapboxgl-popup-tip {
              border-top-color: #27272a !important;
              border-bottom-color: #27272a !important;
            }
          `}</style>
          <div className="relative w-64 p-1">
            <CloseButton
              ariaLabel="Close popup"
              onClick={(e) => {
                e.stopPropagation()
                handleClosePopup()
              }}
              className="absolute -right-1 -top-1 z-10 h-8 w-8 bg-white text-zinc-800 shadow-lg hover:bg-zinc-100 focus:ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus:ring-zinc-700"
            />
            <CityCard
              city={activePopup.city}
              variant="globe"
              visibleCities={mapPopupCities}
              isFavorite={favoriteSlugs.has(getSlugFromLink(activePopup.city.link) ?? '')}
              onToggleFavorite={onToggleFavorite}
              isRecommended={recommendedSet.has(getSlugFromLink(activePopup.city.link) ?? '')}
            />
          </div>
        </Popup>
      )}
    </div>
  )
}

// Custom Popup Component to handle React Portal/Rendering
const Popup = ({ map, lngLat, children, onClose }: { map: mapboxgl.Map, lngLat: [number, number], children: React.ReactNode, onClose: () => void }) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const elRef = useRef<HTMLDivElement>(document.createElement('div'))

  useEffect(() => {
    const popup = new mapboxgl.Popup({
      closeButton: false, // We use our own custom button
      closeOnClick: false, // We handle close manually or rely on map click outside
      maxWidth: '300px',
      className: 'city-popup'
    })
      .setLngLat(lngLat)
      .setDOMContent(elRef.current)
      .addTo(map)

    popup.on('close', onClose)
    popupRef.current = popup

    const popupEl = popup.getElement()
    const stopPropagation = (event: Event) => {
      event.stopPropagation()
    }
    const interactiveEvents: Array<keyof HTMLElementEventMap> = [
      'pointerdown',
      'pointerup',
      'mousedown',
      'mouseup',
      'click',
      'dblclick',
      'touchstart',
      'touchend',
      'wheel',
    ]
    interactiveEvents.forEach((type) => {
      popupEl.addEventListener(type, stopPropagation)
    })

    return () => {
      interactiveEvents.forEach((type) => {
        popupEl.removeEventListener(type, stopPropagation)
      })
      popup.off('close', onClose)
      popup.remove()
    }
  }, [map, lngLat, onClose])

  // Update content via Portal pattern or direct render since we are in the same tree?
  // Actually, createPortal is better but let's just render standard React inside the div
  // We can use ReactDOM.createPortal if we want to retain context, but for simplicity here:
  // We will render children into the ref via a simple effect or using createPortal if needed.
  // For Next.js/React 18, createPortal is best.

  // BUT we are in a client component, let's use Portal
  // We use createPortal to render the React tree into the Mapbox popup DOM element
  return createPortal(children, elRef.current)
}

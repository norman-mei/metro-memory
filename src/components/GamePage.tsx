'use client'

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  FormEvent,
  ChangeEvent,
} from 'react'
import Fuse from 'fuse.js'
import { useLocalStorageValue } from '@react-hookz/web'
import mapboxgl from 'mapbox-gl'
import { coordEach } from '@turf/meta'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'react-circular-progressbar/dist/styles.css'
import MenuComponent from '@/components/Menu'
import IntroModal from '@/components/IntroModal'
import FoundSummary from '@/components/FoundSummary'
import {
  DataFeatureCollection,
  DataFeature,
  RoutesFeatureCollection,
} from '@/lib/types'
import Input from '@/components/Input'
import useHideLabels from '@/hooks/useHideLabels'
import { useConfig } from '@/lib/configContext'
import useTranslation from '@/hooks/useTranslation'
import FoundList from '@/components/FoundList'
import useNormalizeString from '@/hooks/useNormalizeString'
import { bbox } from '@turf/turf'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import { useTheme } from 'next-themes'

const CONNECTOR_CONFIG = [
  { delimiter: ' - ', joiner: ' - ' },
  { delimiter: ' / ', joiner: ' / ' },
  { delimiter: ' & ', joiner: ' & ' },
]

const MANUAL_ALTERNATE_NAMES: Record<string, string[]> = {
  '42 St - Port Authority Bus Terminal': [
    'Port Authority Bus Terminal',
    'Port Authority Bus Terminal 42 St',
    '42 St Port Authority Bus Terminal',
    'PABT',
    '42 St PABT',
    'PABT 42 St',
  ],
  'New York Penn Station': [
    'New York Penn',
    'Penn Station',
    'Penn',
    'NYP',
    'NY Penn Station',
    'NY Penn',
  ],
  'Bedford Park Blvd - Lehman College': [
    'Bedford Park Blvd',
    'Bedford Pk Blvd',
    'Bedford Pk Blvd - Lehman College',
  ],
  'Bedford Park Blvd': ['Bedford Pk Blvd'],
  'Briarwood': ['Briarwood - Van Wyck Blvd'],
  'Court Sq': [
    'Court Sq-23 St',
    'Court Sq - 23 St',
    'Court Square',
    'Court Square - 23 St',
    'Court Square - 23rd St',
  ],
  'Lexington Av/53 St': [
    'Lex Av/53 St',
    'Lexington Ave/53 St',
    'Lexington Avenue/53rd St',
  ],
  '5 Av/53 St': ['5 Ave/53 St', '5 Av - 53 St', '5 Avenue/53 Street'],
  'Queens Plaza': ['Queens Plz'],
  'Sutphin Blvd': ['Sutphin Boulevard'],
  'Parsons Blvd': ['Parsons Boulevard'],
  'Jamaica - 179 St': ['179 St', '179 Street', 'Jamaica 179 St'],
  'P4': ['P4 Station'],
  'P3': ['P3 Station'],
  "E 143 St - St Mary's St": ["E 143 St - St Marys St"],
  'Jackson Hts - Roosevelt Av': [
    'Jackson Heights - Roosevelt Av',
    'Jackson Heights - Roosevelt Avenue',
  ],
  '74 St - Broadway': ['74 Street - Broadway'],
}

const DIRECTIONAL_ABBREVIATIONS: Record<string, string> = {
  east: 'E',
  west: 'W',
  north: 'N',
  south: 'S',
}

const applyDirectionalAbbreviation = (value?: string) => {
  const input = (value ?? '').trim()
  if (!input || !/\s/.test(input)) {
    return input
  }

  return input.replace(/\b(East|West|North|South)\b/gi, (match) => {
    const key = match.toLowerCase()
    return DIRECTIONAL_ABBREVIATIONS[key] ?? match
  })
}

const generateAlternateNames = (name?: string): string[] => {
  if (!name) return []
  const trimmed = name.trim()
  if (!trimmed) return []

  const directionalName = applyDirectionalAbbreviation(trimmed)
  const canonical = directionalName

  const alternates = new Set<string>()

  if (directionalName !== trimmed) {
    alternates.add(directionalName)
  }

  if (canonical !== trimmed && canonical !== directionalName) {
    alternates.add(canonical)
  }

  for (const { delimiter, joiner } of CONNECTOR_CONFIG) {
    if (canonical.includes(delimiter)) {
      const parts = canonical
        .split(delimiter)
        .map((part) => part.trim())
        .filter(Boolean)

      if (parts.length >= 2) {
        const reversed = [...parts].reverse()

        alternates.add(reversed.join(joiner))
        alternates.add(parts.join(' '))
        alternates.add(reversed.join(' '))
      }
    }
  }

  if (/port authority bus terminal/i.test(canonical)) {
    alternates.add(canonical.replace(/port authority bus terminal/gi, 'PABT'))
    alternates.add('PABT')
  }

  const beachMatch = canonical.match(/^Beach\s+(\d+)\s*St\b(.*)$/i)
  if (beachMatch) {
    const suffix = beachMatch[2] ?? ''
    const suffixTrimmed = suffix.trim()
    const number = beachMatch[1]
    alternates.add(`B ${number} St`)
    alternates.add(`B ${number}th St`)
    if (suffixTrimmed) {
      const withDash = suffix.startsWith(' ') ? suffix : ` ${suffix}`
      alternates.add(`B ${number} St${withDash}`)
      alternates.add(`B ${number}th St${withDash}`)
    }
  }

  const replacementPatterns: Array<{ regex: RegExp; replacement: string }> = [
    { regex: /\bPark\b/g, replacement: 'Pk' },
    { regex: /\bPlaza\b/g, replacement: 'Plz' },
    { regex: /\bPoint\b/g, replacement: 'Pt' },
    { regex: /\bRoute\b/g, replacement: 'Rte' },
  ]

  for (const { regex, replacement } of replacementPatterns) {
    const replacedOriginal = trimmed.replace(regex, replacement)
    if (replacedOriginal !== trimmed) {
      alternates.add(replacedOriginal)
    }

    const replacedDirectional = directionalName.replace(regex, replacement)
    if (
      directionalName !== trimmed &&
      replacedDirectional !== directionalName
    ) {
      alternates.add(replacedDirectional)
    }

    const replacedCanonical = canonical.replace(regex, replacement)
    if (replacedCanonical !== canonical) {
      alternates.add(replacedCanonical)
    }
  }

  if (/broadway/i.test(canonical)) {
    const lower = canonical.toLowerCase()
    alternates.add(canonical.replace(/Broadway/gi, 'Bway'))
    alternates.add(canonical.replace(/Broadway/gi, "B'way"))
    alternates.add(lower.replace(/broadway/g, 'bway'))
    alternates.add(lower.replace(/broadway/g, "b'way"))
  }

  MANUAL_ALTERNATE_NAMES[trimmed]?.forEach((alias) => {
    if (alias) {
      alternates.add(alias)
    }
  })

  if (directionalName !== trimmed) {
    MANUAL_ALTERNATE_NAMES[directionalName]?.forEach((alias) => {
      if (alias) {
        alternates.add(alias)
      }
    })
  }

  if (canonical !== trimmed && canonical !== directionalName) {
    MANUAL_ALTERNATE_NAMES[canonical]?.forEach((alias) => {
      if (alias) {
        alternates.add(alias)
      }
    })
  }

  return Array.from(alternates)
}

const getStationKey = (feature: DataFeature) => {
  const propertiesWithCluster = feature.properties as typeof feature.properties & {
    cluster_key?: number | string
  }

  if (
    propertiesWithCluster?.cluster_key !== undefined &&
    propertiesWithCluster?.cluster_key !== null
  ) {
    return `cluster|${propertiesWithCluster.cluster_key}`
  }

  const name = (feature.properties.name ?? '').trim().toLowerCase()
  if (
    feature.geometry?.type === 'Point' &&
    Array.isArray(feature.geometry.coordinates)
  ) {
    const [lng, lat] = feature.geometry.coordinates as number[]
    const formattedLng =
      typeof lng === 'number' ? lng.toFixed(6) : String(lng)
    const formattedLat =
      typeof lat === 'number' ? lat.toFixed(6) : String(lat)
    return `${name}|${formattedLng}|${formattedLat}`
  }
  return `${name}|${feature.id ?? ''}`
}

export default function GamePage({
  fc,
  routes,
}: {
  fc: DataFeatureCollection
  routes?: RoutesFeatureCollection
}) {
  const { CITY_NAME, MAP_CONFIG, LINES, MAP_FROM_DATA } = useConfig()
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  const normalizeString = useNormalizeString()
  const featureCollection = useMemo(() => {
    const enhancedFeatures = fc.features.map((feature) => {
      const existingAlternates = Array.isArray(
        propertiesWithAlternates.alternate_names,
      )
        ? feature.properties.alternate_names
        : []

      const generatedAlternates = generateAlternateNames(originalName)

      const mergedAlternates = Array.from(
        new Set([
          ...existingAlternates,
          ...generatedAlternates.filter(
            (alt) => typeof alt === 'string' && alt.trim().length > 0,
          ),
        ]),
      )

      const nextProperties: typeof feature.properties & {
        alternate_names?: string[]
        display_name?: string
      } = {
        ...feature.properties,
      }

      if (mergedAlternates.length > 0) {
        nextProperties.alternate_names = mergedAlternates
      } else if ('alternate_names' in nextProperties) {
        delete nextProperties.alternate_names
      }

      const displayNameCandidate = applyDirectionalAbbreviation(originalName)
      if (
        displayNameCandidate &&
        displayNameCandidate !== originalName.trim()
      ) {
        nextProperties.display_name = displayNameCandidate
      } else if ('display_name' in nextProperties) {
        delete nextProperties.display_name
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          alternate_names: mergedAlternates,
        },
      }
    })

    return {
      featureCollection: {
        ...fc,
        features: finalFeatures,
      },
      clusterGroups,
    }
  }, [fc])

  const allStationIds = useMemo(() => {
    const ids = featureCollection.features
      .map((feature) => feature.id)
      .filter((id): id is number => typeof id === 'number')
    return Array.from(new Set(ids))
  }, [featureCollection.features])

  const [map, setMap] = useState<mapboxgl.Map | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { hideLabels, setHideLabels } = useHideLabels(map)
  const [solutionsPromptOpen, setSolutionsPromptOpen] = useState(false)
  const [solutionsPassword, setSolutionsPassword] = useState('')
  const [solutionsError, setSolutionsError] = useState(false)
  const [solutionsUnlocked, setSolutionsUnlocked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const idMap = useMemo(() => {
    const map = new Map<number, DataFeature>()
    featureCollection.features.forEach((feature) => {
      map.set(feature.id! as number, feature)
    })
    return map
  }, [featureCollection.features])

  const stationsPerLine = useMemo(() => {
    const lineMap = new Map<string, Set<string>>()
    for (let feature of featureCollection.features) {
      const line = feature.properties.line
      if (!line) {
        continue
      }
      const key = getStationKey(feature)
      if (!lineMap.has(line)) {
        lineMap.set(line, new Set<string>())
      }
      lineMap.get(line)!.add(key)
    }

    const result: Record<string, number> = {}
    lineMap.forEach((keys, line) => {
      result[line] = keys.size
    })
    return result
  }, [featureCollection.features])

  const { value: localFound, set: setFound } = useLocalStorageValue<
    number[] | null
  >(`${CITY_NAME}-stations`, {
    defaultValue: null,
    initializeWithValue: false,
  })

  const { value: storedFoundTimestamps, set: setStoredFoundTimestamps } =
    useLocalStorageValue<Record<string, string> | null>(
      `${CITY_NAME}-stations-found-at`,
      {
        defaultValue: null,
        initializeWithValue: false,
      },
    )

  const foundTimestamps = storedFoundTimestamps ?? {}

  const setFoundTimestamps = useCallback(
    (updater: (prev: Record<string, string>) => Record<string, string>) => {
      setStoredFoundTimestamps((prev) => updater(prev ?? {}))
    },
    [setStoredFoundTimestamps],
  )

  const { value: isNewPlayer, set: setIsNewPlayer } =
    useLocalStorageValue<boolean>(`${CITY_NAME}-stations-is-new-player`, {
      defaultValue: true,
      initializeWithValue: false,
    })

  const found: number[] = useMemo(() => {
    return (localFound || []).filter((f) => idMap.has(f))
  }, [localFound, idMap])

  useEffect(() => {
    if (found.length === 0) {
      return
    }

    const now = new Date().toISOString()
    setFoundTimestamps((prev) => {
      const next = { ...prev }
      let changed = false

      for (const id of found) {
        const key = String(id)
        if (!next[key]) {
          next[key] = now
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [found, setFoundTimestamps])

  const onReset = useCallback(() => {
    if (confirm(t('restartWarning'))) {
      setFound([])
      setIsNewPlayer(true)
      setFoundTimestamps(() => ({}))
    }
  }, [setFound, setIsNewPlayer, setFoundTimestamps, t])

  const foundStationsPerLine = useMemo(() => {
    const lineMap = new Map<string, Set<string>>()
    for (let id of found || []) {
      const feature = idMap.get(id)
      if (!feature) {
        continue
      }
      const line = feature.properties.line
      if (!line) {
        continue
      }
      const key = getStationKey(feature)
      if (!lineMap.has(line)) {
        lineMap.set(line, new Set<string>())
      }
      lineMap.get(line)!.add(key)
    }

    const result: Record<string, number> = {}
    lineMap.forEach((keys, line) => {
      result[line] = keys.size
    })
    return result
  }, [found, idMap])

  const revealAllStations = useCallback(() => {
    setFound(allStationIds)
    setIsNewPlayer(false)
    setHideLabels(false)
    setFoundTimestamps((prev) => {
      const next = { ...prev }
      const timestamp = new Date().toISOString()
      for (const id of allStationIds) {
        const key = String(id)
        if (!next[key]) {
          next[key] = timestamp
        }
      }
      return next
    })
  }, [
    allStationIds,
    setFound,
    setIsNewPlayer,
    setHideLabels,
    setFoundTimestamps,
  ])

  const handleRevealSolutions = useCallback(() => {
    if (solutionsUnlocked) {
      revealAllStations()
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
      return
    }

    setSolutionsPassword('')
    setSolutionsError(false)
    setSolutionsPromptOpen(true)
  }, [
    solutionsUnlocked,
    revealAllStations,
    setSolutionsPassword,
    setSolutionsError,
    setSolutionsPromptOpen,
  ])

  const handleSolutionsClose = useCallback(() => {
    setSolutionsPromptOpen(false)
    setSolutionsPassword('')
    setSolutionsError(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }, [setSolutionsPromptOpen, setSolutionsPassword, setSolutionsError])

  const handleSolutionsPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSolutionsPassword(event.target.value)
    },
    [setSolutionsPassword],
  )

  const handleSolutionsSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (solutionsPassword.trim() === 'NYCT') {
        setSolutionsUnlocked(true)
        revealAllStations()
        setSolutionsPromptOpen(false)
        setSolutionsPassword('')
        setSolutionsError(false)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 0)
      } else {
        setSolutionsError(true)
      }
    },
    [
      solutionsPassword,
      revealAllStations,
      setSolutionsPromptOpen,
      setSolutionsPassword,
      setSolutionsError,
    ],
  )

  const fuse = useMemo(
    () =>
      new Fuse(featureCollection.features, {
        includeScore: true,
        includeMatches: true,
        keys: [
          'properties.name',
          'properties.long_name',
          'properties.short_name',
          'properties.alternate_names',
        ],
        minMatchCharLength: 2,
        threshold: 0.15,
        distance: 10,
        getFn: (obj, path) => {
          const value = Fuse.config.getFn(obj, path)
          if (value === undefined) {
            return ''
          } else if (Array.isArray(value)) {
            return value.map((el) => normalizeString(el))
          } else {
            return normalizeString(value as string)
          }
        },
      }),
    [featureCollection.features, normalizeString],
  )

  const uniqueStationsMap = useMemo(() => {
    const map = new Map<string, DataFeature>()
    for (const feature of featureCollection.features) {
      const key = getStationKey(feature)
      if (!map.has(key)) {
        map.set(key, feature)
      }
    }
    return map
  }, [featureCollection.features])

  const totalUniqueStations = uniqueStationsMap.size

  const foundStationKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const id of found) {
      const feature = idMap.get(id)
      if (!feature) continue
      keys.add(getStationKey(feature))
    }
    return keys
  }, [found, idMap])

  const foundProportion =
    totalUniqueStations === 0
      ? 0
      : foundStationKeys.size / totalUniqueStations

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    const mapboxMap = new mapboxgl.Map(MAP_CONFIG)

    mapboxMap.on('load', () => {
      const isDarkTheme = resolvedTheme === 'dark'
      const foundTextColor = isDarkTheme
        ? 'rgb(255, 255, 255)'
        : 'rgb(29, 40, 53)'
      const foundHaloColor = isDarkTheme
        ? 'rgba(0, 0, 0, 0.85)'
        : 'rgba(255, 255, 255, 0.8)'
      const hoverTextColor = foundTextColor
      const hoverHaloColor = isDarkTheme
        ? 'rgba(0, 0, 0, 0.85)'
        : 'rgb(255, 255, 255)'

      const mapStyle = mapboxMap.getStyle()
      if (mapStyle && Array.isArray(mapStyle.layers)) {
        mapStyle.layers.forEach((layer) => {
          if (layer.type === 'symbol') {
            mapboxMap.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        })
      }

      mapboxMap.addSource('features', {
        type: 'geojson',
        data: featureCollection,
      })

      mapboxMap.addSource('hovered', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      })

      if (MAP_FROM_DATA && routes) {
        mapboxMap.addSource('lines', {
          type: 'geojson',
          data: routes,
        })

        mapboxMap.addLayer({
          id: 'lines',
          type: 'line',
          paint: {
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8.763,
              1.5,
              15,
              3,
              22,
              3,
            ],
            'line-color': ['get', 'color'],
            'line-offset': ['match', ['get', 'line'], '', 2, 0],
          },
          source: 'lines',
          layout: {
            'line-sort-key': ['-', 100, ['get', 'order']],
          },
        })

        mapboxMap.addLayer({
          type: 'circle',
          source: 'features',
          id: 'stations',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9,
              1.5,
              16,
              10,
            ],
            'circle-color': '#ffffff',
            'circle-stroke-color': 'rgb(122, 122, 122)',
            'circle-stroke-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              8,
              0.5,
              22,
              2,
            ],
          },
        })

        const box = bbox(routes)

        mapboxMap.fitBounds(
          [
            [box[0], box[1]],
            [box[2], box[3]],
          ],
          { padding: 100, duration: 0 },
        )

        mapboxMap.setMaxBounds([
          [box[0] - 1, box[1] - 1],
          [box[2] + 1, box[3] + 1],
        ])
      }

      mapboxMap.addLayer({
        id: 'stations-hovered',
        type: 'circle',
        paint: {
          'circle-radius': 16,
          'circle-color': '#fde047',
          'circle-blur-transition': {
            duration: 100,
          },
          'circle-blur': 1,
        },
        source: 'hovered',
        filter: ['==', '$type', 'Point'],
      })

      mapboxMap.addLayer({
        type: 'circle',
        source: 'features',
        id: 'stations-circles',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9,
            ['case', ['to-boolean', ['feature-state', 'found']], 2, 1],
            16,
            ['case', ['to-boolean', ['feature-state', 'found']], 6, 4],
          ],
          'circle-color': [
            'case',
            ['to-boolean', ['feature-state', 'found']],
            [
              'match',
              ['get', 'line'],
              ...Object.keys(LINES).flatMap((line) => [
                [line],
                LINES[line].color,
              ]),
              'rgba(255, 255, 255, 0.8)',
            ],
            'rgba(255, 255, 255, 0.8)',
          ],
          'circle-stroke-color': [
            'case',
            ['to-boolean', ['feature-state', 'found']],
            [
              'match',
              ['get', 'line'],
              ...Object.keys(LINES).flatMap((line) => [
                [line],
                LINES[line].backgroundColor,
              ]),
              'rgba(255, 255, 255, 0.8)',
            ],
            'rgba(255, 255, 255, 0.8)',
          ],
          'circle-stroke-width': [
            'case',
            ['to-boolean', ['feature-state', 'found']],
            1,
            0,
          ],
        },
        layout: {
          'circle-sort-key': ['-', 100, ['get', 'order']],
        },
      })

      mapboxMap.addLayer({
        minzoom: 11,
        layout: {
          'text-field': [
            'to-string',
            ['coalesce', ['get', 'display_name'], ['get', 'name']],
          ],
          'text-font': ['Cabin Regular', 'Arial Unicode MS Regular'],
          'text-anchor': 'bottom',
          'text-offset': [0, -0.5],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 12, 22, 14],
        },
        type: 'symbol',
        source: 'features',
        id: 'stations-labels',
          paint: {
            'text-color': [
              'case',
              ['to-boolean', ['feature-state', 'found']],
              foundTextColor,
              'rgba(0, 0, 0, 0)',
            ],
            'text-halo-color': [
              'case',
              ['to-boolean', ['feature-state', 'found']],
              foundHaloColor,
              'rgba(0, 0, 0, 0)',
            ],
            'text-halo-blur': 1,
            'text-halo-width': 1,
          },
      })

      mapboxMap.addLayer({
        id: 'hover-label-point',
        type: 'symbol',
          paint: {
            'text-halo-color': hoverHaloColor,
            'text-halo-width': 2,
            'text-halo-blur': 1,
            'text-color': hoverTextColor,
          },
          layout: {
            'text-field': [
              'to-string',
              ['coalesce', ['get', 'display_name'], ['get', 'name']],
          ],
          'text-font': ['Cabin Bold', 'Arial Unicode MS Regular'],
          'text-anchor': 'bottom',
          'text-offset': [0, -0.6],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11, 14, 22, 16],
          'symbol-placement': 'point',
        },
        source: 'hovered',
        filter: ['==', '$type', 'Point'],
      })

      mapboxMap.once('data', () => {
        setMap((map) => (map === null ? mapboxMap : map))
      })

      mapboxMap.once('idle', () => {
        setMap((map) => (map === null ? mapboxMap : map))
        mapboxMap.on('mousemove', ['stations-circles'], (e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features.find((f) => f.state.found && f.id)
            if (feature && feature.id) {
              return setHoveredId(feature.id as number)
            }
          }

          setHoveredId(null)
        })

        mapboxMap.on('mouseleave', ['stations-circles'], () => {
          setHoveredId(null)
        })
      })
    })

    return () => {
      mapboxMap.remove()
      setMap(null)
    }
  }, [setMap, featureCollection, LINES, MAP_CONFIG, MAP_FROM_DATA, routes])

  useEffect(() => {
    if (!map || !(map as any).style) {
      return
    } else {
      const hoveredSource = map.getSource('hovered') as
        | mapboxgl.GeoJSONSource
        | undefined

      if (!hoveredSource) {
        return
      }

      hoveredSource.setData({
        type: 'FeatureCollection',
        features: hoveredId ? [idMap.get(hoveredId)!] : [],
      })
    }
  }, [map, hoveredId, idMap])

  useEffect(() => {
    if (!map || !(map as any).style || !found) return

    if (!map.getSource('features')) {
      return
    }

    map.removeFeatureState({ source: 'features' })

    for (let id of found) {
      map.setFeatureState({ source: 'features', id }, { found: true })
    }
  }, [found, map])

  const zoomToFeature = useCallback(
    (id: number) => {
      if (!map) return

      const feature = idMap.get(id)
      if (!feature) return

      if (feature.geometry.type === 'Point') {
        map.flyTo({
          center: feature.geometry.coordinates as [number, number],
          zoom: 14,
        })
      } else {
        const bounds = new mapboxgl.LngLatBounds()
        coordEach(feature, (coord) => {
          bounds.extend(coord as [number, number])
        })
        map.fitBounds(bounds, { padding: 100 })
      }
    },
    [map, idMap],
  )

  useEffect(() => {
    if (map) {
      map.resize()
    }
  }, [map, sidebarOpen])

  return (
    <div className="relative flex h-screen flex-row items-top justify-between bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="absolute right-4 top-4 z-[100]">
        <ThemeToggleButton />
      </div>
      <div className="relative flex-1 min-w-0 h-full">
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 top-4 px-3 lg:top-6 lg:px-6">
          <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-3">
            <FoundSummary
              className="rounded-lg bg-white/95 p-4 shadow-md dark:bg-zinc-900/95 dark:text-zinc-100 dark:shadow-black/40 lg:hidden"
              foundProportion={foundProportion}
              foundStationsPerLine={foundStationsPerLine}
              stationsPerLine={stationsPerLine}
              defaultMinimized
              minimizable
            />
            <div className="flex items-center gap-2 lg:gap-3">
              <Input
                fuse={fuse}
                found={found}
                setFound={setFound}
                setFoundTimestamps={setFoundTimestamps}
                setIsNewPlayer={setIsNewPlayer}
                inputRef={inputRef}
                map={map}
                idMap={idMap}
                clusterGroups={clusterGroups}
                autoFocus={!solutionsPromptOpen}
              />
              <MenuComponent
                onReset={onReset}
                hideLabels={hideLabels}
                setHideLabels={setHideLabels}
                onRevealSolutions={handleRevealSolutions}
              />
            </div>
          </div>
        </div>
      </div>
      {sidebarOpen ? (
        <div className="hidden h-full lg:flex">
          <div className="relative h-full w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute -left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-700 shadow-lg transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 lg:flex"
              aria-label="Hide sidebar"
            >
              ›
            </button>
          </div>
          <div className="flex h-full w-96 flex-col overflow-y-auto bg-white p-6 shadow-lg dark:bg-zinc-900/95 dark:shadow-black/40 xl:w-[32rem]">
            <FoundSummary
              className="rounded-lg bg-white p-4 shadow-md dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/40"
              foundProportion={foundProportion}
              foundStationsPerLine={foundStationsPerLine}
              stationsPerLine={stationsPerLine}
              minimizable
              defaultMinimized
            />
            <hr className="my-4 w-full border-b border-zinc-100 dark:border-zinc-700" />
            <FoundList
              found={found}
              idMap={idMap}
              setHoveredId={setHoveredId}
              hoveredId={hoveredId}
              hideLabels={hideLabels}
              foundTimestamps={foundTimestamps}
              zoomToFeature={zoomToFeature}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-700 shadow-lg transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 lg:flex"
          aria-label="Show sidebar"
        >
          ‹
        </button>
      )}
      <IntroModal
        inputRef={inputRef}
        open={isNewPlayer}
        setOpen={setIsNewPlayer}
      >
        {t('introInstruction')} ⏎
      </IntroModal>
      {solutionsPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-100"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t('showSolutions')}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Enter the password to reveal every station.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleSolutionsSubmit}>
              <input
                type="password"
                autoFocus
                value={solutionsPassword}
                onChange={handleSolutionsPasswordChange}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-base text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/40"
                placeholder="Password"
                autoComplete="off"
              />
              {solutionsError && (
                <p className="text-sm font-medium text-red-600">
                  Incorrect password. Try again.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSolutionsClose}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {t('backToTheGame')}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

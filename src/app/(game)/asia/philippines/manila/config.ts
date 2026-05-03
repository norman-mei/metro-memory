import type { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import type { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Manila Light Rail Transit System (LRT)',
    titleImage: 'LRT.png',
    items: [
      {
        type: 'lines',
        lines: ['ManilaLRT1', 'ManilaLRT2'],
      },
    ],
  },
  {
    title: 'Manila Metro Rail Transit System (MRT)',
    titleImage: 'MetroRail.png',
    items: [
      {
        type: 'lines',
        lines: ['ManilaMRT3', 'ManilaMRT7'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/manila',
    apple: '/api/city-icon/manila',
  },
  title: 'Manila Metro Memory Game',
  description:
    'How many Manila LRT and MRT stations can you name from memory?',
  openGraph: {
    title: 'Manila Metro Memory Game',
    description:
      'How many Manila LRT and MRT stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/asia/philippines/manila',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clqxldtyh013n01nw6w7ihjll',
  bounds: [
    [120.85, 14.34],
    [121.18, 14.79],
  ],
  maxBounds: [
    [119.85, 13.34],
    [122.18, 15.79],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const CITY_NAME = 'manila'
export const LOCALE = 'en'
export const MAP_FROM_DATA = true
export const GAUGE_COLORS = 'inverted'

const config: Config = {
  GAUGE_COLORS,
  MAP_FROM_DATA,
  LOCALE,
  CITY_NAME,
  LINE_GROUPS,
  MAP_CONFIG,
  METADATA,
  LINES,
}

export default config

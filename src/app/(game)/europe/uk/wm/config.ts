import { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Transport for West Midlands (TfWM)',
    items: [
      {
        type: 'lines',
        title: 'West Midlands Metro',
        lines: ['Line1', 'Line2', 'EastsideExtension'],
      },
    ],
  },
  {
    title: 'Birmingham International Airport Limited',
    items: [
      {
        type: 'lines',
        lines: ['AirRailLink'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/wm',
    apple: '/api/city-icon/wm',
  },
  title: 'West Midlands Transport Memory Game',
  description: 'How many West Midlands Metro and Air-Rail Link stations can you name?',
  openGraph: {
    title: 'West Midlands Transport Memory Game',
    description: 'How many West Midlands Metro and Air-Rail Link stations can you name?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/wm',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-2.17, 52.44],
    [-1.69, 52.6],
  ],
  maxBounds: [
    [-2.23, 52.42],
    [-1.64, 52.62],
  ],
  minZoom: 9.6,
  fadeDuration: 50,
}

export const CITY_NAME = 'wm'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

const config: Config = {
  MAP_FROM_DATA,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  LINE_GROUPS,
}

export default config

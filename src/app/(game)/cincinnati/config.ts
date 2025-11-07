import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const BEG_THRESHOLD = 0.5

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Connector',
    items: [
      {
        type: 'lines',
        lines: ['100'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  title: 'Cincinnati Metro Memory',
  description:
    'How many of the Cincinnati Connector streetcar stops can you name from memory?',
  openGraph: {
    title: 'Cincinnati Metro Memory',
    description:
      'How many of the Cincinnati Connector streetcar stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/cincinnati',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-84.525, 39.094],
    [-84.505, 39.12],
  ],
  maxBounds: [
    [-84.55, 39.08],
    [-84.49, 39.13],
  ],
  minZoom: 13,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/28o14B9Yic6m73adQT'

export const CITY_NAME = 'cincinnati'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

const config: Config = {
  MAP_FROM_DATA,
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  LINE_GROUPS,
  BEG_THRESHOLD,
}

export default config

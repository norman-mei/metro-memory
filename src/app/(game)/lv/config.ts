import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const BEG_THRESHOLD = 0.5

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Las Vegas Convention and Visitors Authority (LVCVA)',
    items: [
      {
        type: 'lines',
        lines: ['LVM'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  title: 'Las Vegas Metro Memory',
  description:
    'How many of the Las Vegas Monorail stations can you name from memory?',
  openGraph: {
    title: 'Las Vegas Metro Memory',
    description:
      'How many of the Las Vegas Monorail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/lv',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-115.175, 36.095],
    [-115.145, 36.15],
  ],
  maxBounds: [
    [-115.22, 36.07],
    [-115.12, 36.18],
  ],
  minZoom: 12,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/28o14B9Yic6m73adQT'

export const CITY_NAME = 'lv'

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

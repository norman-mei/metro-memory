import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const BEG_THRESHOLD = 0.5

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Jacksonville Transportation Authority (JTA)',
    items: [
      {
        type: 'lines',
        lines: ['NB', 'SB'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  title: 'Jacksonville Metro Memory',
  description:
    'How many of the Jacksonville Skyway stations can you name from memory?',
  openGraph: {
    title: 'Jacksonville Metro Memory',
    description:
      'How many of the Jacksonville Skyway stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/jacksonville',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-81.68, 30.312],
    [-81.648, 30.338],
  ],
  maxBounds: [
    [-81.72, 30.29],
    [-81.63, 30.36],
  ],
  minZoom: 12,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/28o14B9Yic6m73adQT'

export const CITY_NAME = 'jacksonville'

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

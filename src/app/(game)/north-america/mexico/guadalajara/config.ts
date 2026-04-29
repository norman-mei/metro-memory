import { Config, Line, LineGroup } from '@/lib/types'
import type { MapboxOptions } from 'mapbox-gl'
import { Metadata } from 'next'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Sistema de Tren Eléctrico Urbano (SITEUR)',
    titleImage: 'SITEUR.png',
    items: [
      {
        type: 'lines',
        lines: ['gdl1', 'gdl2', 'gdl3', 'gdl4'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/guadalajara',
    apple: '/api/city-icon/guadalajara',
  },
  title: 'Guadalajara Metro Memory',
  description: 'How many Guadalajara Metro stations can you name from memory?',
  openGraph: {
    title: 'Guadalajara Metro Memory',
    description: 'How many Guadalajara Metro stations can you name from memory?',
    type: 'website',
    locale: 'es_MX',
    url: 'https://metro-memory.com/north-america/mexico/guadalajara',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clp1c5rl601b901qy05alechg',
  bounds: [
    [-103.47, 20.45],
    [-103.25, 20.75],
  ],
  maxBounds: [
    [-103.62, 20.32],
    [-103.1, 20.88],
  ],
  minZoom: 9.2,
  fadeDuration: 50,
}

export const CITY_NAME = 'guadalajara'

export const LOCALE = 'es'

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

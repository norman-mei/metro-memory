import { Config, Line, LineGroup } from '@/lib/types'
import type { MapboxOptions } from 'mapbox-gl'
import { Metadata } from 'next'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Sistema de Transporte Colectivo Metrorrey (Metrorrey)',
    titleImage: 'metrorrey.png',
    items: [
      {
        type: 'lines',
        lines: ['mty1', 'mty2', 'mty3'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/monterrey',
    apple: '/api/city-icon/monterrey',
  },
  title: 'Monterrey Metro Memory',
  description: 'How many Monterrey Metro stations can you name from memory?',
  openGraph: {
    title: 'Monterrey Metro Memory',
    description: 'How many Monterrey Metro stations can you name from memory?',
    type: 'website',
    locale: 'es_MX',
    url: 'https://metro-memory.com/north-america/mexico/monterrey',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clp1c5rl601b901qy05alechg',
  bounds: [
    [-100.39, 25.65],
    [-100.22, 25.79],
  ],
  maxBounds: [
    [-100.5, 25.58],
    [-100.12, 25.86],
  ],
  minZoom: 9.6,
  fadeDuration: 50,
}

export const CITY_NAME = 'monterrey'

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

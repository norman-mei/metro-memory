import { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'ATAC / Roma Servizi per la Mobilita',
    titleImage: 'ATAC.png',
    items: [
      {
        type: 'lines',
        title: 'Metropolitana di Roma',
        titleImage: 'romemetro.png',
        lines: ['Metro A', 'Metro B', 'Metro B1', 'Metro C'],
      },
      {
        type: 'lines',
        title: 'Ferrovie Concesse',
        lines: ['Roma-Viterbo', 'Roma-Lido'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/rome',
    apple: '/api/city-icon/rome',
  },
  title: 'Rome Metro Memory',
  description: 'Quante stazioni della metro di Roma riesci a ricordare?',
  openGraph: {
    title: 'Roma Metro Memory',
    description: 'Quante stazioni della metro di Roma riesci a ricordare?',
    type: 'website',
    locale: 'it_IT',
    url: 'https://metro-memory.xyz/europe/italy/rome',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [12.2342, 41.7914],
    [12.6160, 42.0094],
  ],
  maxBounds: [
    [12.1, 41.7],
    [12.8, 42.1],
  ],
  minZoom: 10.8,
  fadeDuration: 50,
}

export const CITY_NAME = 'rome'
export const LOCALE = 'it'
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
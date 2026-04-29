import { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'


export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Tri-County Metropolitan Transportation District of Oregon (TriMet)',
    titleImage: 'TriMet.png',
    items: [
      {
        type: 'lines',
        title: 'MAX Light Rail',
        titleImage: 'TriMetMAX.png',
        lines: ['MAXBlue', 'MAXRed', 'MAXYellow', 'MAXGreen', 'MAXOrange'],
      },
      {
        type: 'lines',
        title: 'Portland Streetcar',
        titleImage: 'PortlandStreetCar.png',
        lines: ['PortlandA', 'PortlandB', 'PortlandNS'],
      },
      {
        type: 'lines',
        title: 'Westside Express Service',
        lines: ['PortlandWES'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/portland',
    apple: '/api/city-icon/portland',
  },
  title: 'Portland Metro Memory',
  description: 'How many TriMet stations in the Portland region can you name from memory?',
  openGraph: {
    title: 'Portland Metro Memory',
    description: 'How many TriMet stations in the Portland region can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/portland',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-123.1, 45.2],
    [-122.4, 45.65],
  ],
  maxBounds: [
    [-123.4, 45.0],
    [-122.1, 45.8],
  ],
  minZoom: 10,
  fadeDuration: 50,
}


export const CITY_NAME = 'portland'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

export const GAUGE_COLORS = 'inverted'

export const LINES_WITH_ICONS: { [name: string]: Line } = {
  ...LINES,
  MAXGreen: {
    ...LINES.MAXGreen,
    icon: 'north-america/usa/portland/MAXGreen.png',
    badgeFit: 'contain',
  },
  MAXOrange: {
    ...LINES.MAXOrange,
    icon: 'north-america/usa/portland/MAXOrange.png',
    badgeFit: 'contain',
  },
}

const config: Config = {
  MAP_FROM_DATA,
  GAUGE_COLORS,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES: LINES_WITH_ICONS,
  LINE_GROUPS,
}

export default config

import { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Mass Rapid Transit (MRT)',
    titleImage: 'MRT.png',
    items: [
      {
        type: 'lines',
        lines: [
          'SingaporeNSL',
          'SingaporeEWL',
          'SingaporeNEL',
          'SingaporeCCL',
          'SingaporeDTL',
          'SingaporeTEL',
        ],
      },
    ],
  },
  {
    title: 'Light Rail Transit (LRT)',
    titleImage: 'LRT.png',
    items: [
      {
        type: 'lines',
        lines: ['SingaporeBPLRT', 'SingaporeSKLRT', 'SingaporePGLRT'],
      },
    ],
  },
  {
    title: 'Johor Bahru–Singapore Rapid Transit System',
    titleImage: 'RTS.png',
    items: [
      {
        type: 'lines',
        lines: ['SingaporeRTS'],
      },
    ],
  },
  {
    title: 'Sentosa Development Corporation',
    titleImage: 'sentosa.png',
    items: [
      {
        type: 'lines',
        title: 'Cable Car',
        lines: ['SingaporeCableMountFaber', 'SingaporeCableSentosa'],
      },
      {
        type: 'lines',
        title: 'Monorail',
        lines: ['SingaporeSentosaExpress'],
      },
    ],
  },
  {
    title: 'Changi Airport Skytrain',
    titleImage: 'ChangiAirport.png',
    items: [
      {
        type: 'lines',
        lines: ['SingaporePMSNorth', 'SingaporePMSSouth'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/singapore',
    apple: '/api/city-icon/singapore',
  },
  title: 'Singapore Metro Memory Game',
  description:
    'How many of the Singapore MRT, LRT, RTS, cable car, and airport people-mover stations can you name from memory?',
  openGraph: {
    title: 'Singapore Metro Memory Game',
    description:
      'How many of the Singapore MRT, LRT, RTS, cable car, and airport people-mover stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/asia/singapore',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clqxldtyh013n01nw6w7ihjll',
  bounds: [
    [103.605, 1.16],
    [104.05, 1.47],
  ],
  maxBounds: [
    [102.605, 0.16],
    [105.05, 2.47],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const CITY_NAME = 'singapore'

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

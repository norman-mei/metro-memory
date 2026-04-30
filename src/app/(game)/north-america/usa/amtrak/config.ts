import { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Northeast Corridor (NEC)',
    items: [
      {
        type: 'lines',
        lines: ['ACE', 'CRN', 'NER', 'VTR'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'State-Supported Routes',
    items: [
      {
        type: 'lines',
        lines: [
          'ADR',
          'ACS',
          'HTF',
          'BKF',
          'BLW',
          'BRS',
          'CPC',
          'CRN',
          'DWE',
          'EAX',
          'EMS',
          'GDR',
          'HLF',
          'HWA',
          'IAS',
          'IZC',
          'KSS',
          'LCS',
          'MPL',
          'MGS',
          'MRR',
          'NER',
          'PAN',
          'PMQ',
          'PDM',
          'PSL',
          'VLF',
          'VTR',
          'WPX',
          'WLR',
        ],
      },
    ],
  },
  {
    title: 'Long-Distance Routes',
    items: [
      {
        type: 'lines',
        lines: [
          'AUT',
          'CAZ',
          'CRD',
          'CNO',
          'CST',
          'CRS',
          'EMB',
          'FLN',
          'LSL',
          'PMT',
          'CPL',
          'HOS',
          'SLM',
          'SLS',
          'SWC',
          'SSL',
          'TXE',
        ],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/amtrak',
    apple: '/api/city-icon/amtrak',
  },
  title: 'Amtrak USA Rail Memory',
  description: 'How many Amtrak train stations in the United States can you name from memory?',
  openGraph: {
    title: 'Amtrak USA Rail Memory',
    description: 'How many Amtrak train stations in the United States can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/amtrak',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-124.4, 25.6],
    [-68.4, 49.4],
  ],
  maxBounds: [
    [-129.0, 22.0],
    [-65.0, 51.0],
  ],
  minZoom: 3,
  maxZoom: 18,
  fadeDuration: 50,
}

export const CITY_NAME = 'amtrak'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

export const GAUGE_COLORS = 'inverted'

const config: Config = {
  MAP_FROM_DATA,
  GAUGE_COLORS,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  LINE_GROUPS,
}

export default config

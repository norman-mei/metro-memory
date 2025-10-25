import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'

export const BEG_THRESHOLD = 0.2

export const LINES = linesData as { [name: string]: Line }

export const METADATA: Metadata = {
  title: 'Hong Kong Metro Memory',
  description: '你能記住香港港鐵的所有車站嗎？',
  openGraph: {
    title: 'Hong Kong Metro Memory',
    description: '你能記住香港港鐵的所有車站嗎？',
    type: 'website',
    locale: 'zh_Hant_HK',
    url: 'https://metro-memory.com/hk',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  bounds: [
    [113.8, 22.15],
    [114.35, 22.55],
  ],
  maxBounds: [
    [113.5, 21.9],
    [114.6, 22.7],
  ],
  minZoom: 8,
  fadeDuration: 50,
}

export const CITY_NAME = 'hk'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

export const STRIPE_LINK = 'https://buy.stripe.com/aEU6oV8Ue2vMbjqcMW'

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'MTR Heavy Rail',
    items: [
      {
        type: 'lines',
        lines: ['EAL', 'TCL', 'TML', 'KTL', 'TWL', 'ISL', 'TKL', 'SIL', 'AEL', 'DRL', 'XRL'],
      },
    ],
  },
]

const config: Config = {
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  BEG_THRESHOLD,
  MAP_FROM_DATA,
  LINE_GROUPS,
}

export default config

import { Config, Line, LineGroup } from '@/lib/types'
import type { MapboxOptions } from 'mapbox-gl'
import { Metadata } from 'next'
import linesData from './data/lines.json'

export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Taipei Metro',
    titleImage: 'taipeimetro.png',
    items: [
      {
        type: 'lines',
        title: 'Rapid Transit',
        lines: [
          'wenhu',
          'tamsuixinyi',
          'xinbeitou',
          'songshanxindian',
          'xiaobitan',
          'zhonghexinlu',
          'bannan',
          'circular',
          'wanda',
        ],
      },
      {
        type: 'lines',
        title: 'Gondola',
        lines: ['maokong'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'New Taipei Metro',
    titleImage: 'newtaipeimetro.png',
    items: [
      {
        type: 'lines',
        title: 'Rapid Transit',
        lines: ['circular'],
      },
      {
        type: 'lines',
        title: 'Light Metro',
        lines: ['sanying'],
      },
      {
        type: 'lines',
        title: 'Light Rail Transit',
        lines: ['danhai', 'ankeng'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'Taoyuan Metro',
    titleImage: 'taoyuanmetro.png',
    items: [
      {
        type: 'lines',
        lines: ['taoyuanairport', 'aerotropolis'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'Taoyuan International Airport Corporation',
    titleImage: 'tiac.png',
    items: [
      {
        type: 'lines',
        lines: ['skytrain'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'Forestry and Nature Conservation Agency',
    titleImage: 'FANCA.png',
    items: [
      {
        type: 'lines',
        lines: ['wulai'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'Wulai Tourism Enterprise Co., Ltd.',
    titleImage: 'yunhsien.png',
    items: [
      {
        type: 'lines',
        lines: ['yunhsien'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/taipei',
    apple: '/api/city-icon/taipei',
  },
  title: 'Taipei Metro Memory',
  description:
    'How many Taipei Metro, New Taipei Metro, and Taoyuan Metro stations can you name from memory?',
  openGraph: {
    title: 'Taipei Metro Memory',
    description:
      'How many Taipei Metro, New Taipei Metro, and Taoyuan Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/taiwan/taipei',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [121.18, 24.93],
    [121.64, 25.22],
  ],
  maxBounds: [
    [121.1, 24.88],
    [121.7, 25.28],
  ],
  minZoom: 9.3,
  fadeDuration: 50,
}

export const CITY_NAME = 'taipei'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

export const MAP_RENDER_CULLING = {
  enabled: true,
  paddingFactor: 0.5,
}

const config: Config = {
  MAP_FROM_DATA,
  MAP_RENDER_CULLING,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  LINE_GROUPS,
}

export default config

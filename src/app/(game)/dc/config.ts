import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'

export const BEG_THRESHOLD = 0.5

export const LINES: {
  [name: string]: Line
} = {
  WMATAMetroBlue: {
    name: 'Blue',
    color: '#0096D8',
    backgroundColor: '#004B6C',
    textColor: '#000000',
    order: 1000,
  },
  WMATAMetroGreen: {
    name: 'Green',
    color: '#00AE4C',
    backgroundColor: '#005726',
    textColor: '#000000',
    order: 1000,
  },
  WMATAMetroOrange: {
    name: 'Orange',
    color: '#DF8700',
    backgroundColor: '#704300',
    textColor: '#000000',
    order: 1000,
  },
  WMATAMetroRed: {
    name: 'Red',
    color: '#BF1939',
    backgroundColor: '#600C1D',
    textColor: '#000000',
    order: 1000,
  },
  WMATAMetroSilver: {
    name: 'Silver',
    color: '#A2A4A1',
    backgroundColor: '#515350',
    textColor: '#000000',
    order: 1000,
  },
  WMATAMetroYellow: {
    name: 'Yellow',
    color: '#F8D200',
    backgroundColor: '#7C6900',
    textColor: '#000000',
    order: 1000,
  },
  VREManassasLine: {
    name: 'Manassas Line',
    color: '#3C6FC6',
    backgroundColor: '#1A458B',
    textColor: '#FFFFFF',
    order: 2000,
  },
  VREFredericksburgLine: {
    name: 'Fredericksburg Line',
    color: '#FF7075',
    backgroundColor: '#EB1B23',
    textColor: '#FFFFFF',
    order: 2001,
  },
  MARCBrunswickLine: {
    name: 'Brunswick Line',
    color: '#FFBE52',
    backgroundColor: '#FEA92E',
    textColor: '#000000',
    order: 3000,
  },
  MARCCamdenLine: {
    name: 'Camden Line',
    color: '#FF865F',
    backgroundColor: '#FF5624',
    textColor: '#FFFFFF',
    order: 3001,
  },
  MARCPennLine: {
    name: 'Penn Line',
    color: '#F05B68',
    backgroundColor: '#DA2A38',
    textColor: '#FFFFFF',
    order: 3002,
  },
  MarylandMetroMetroSubwaylink: {
    name: 'Baltimore Metro SubwayLink',
    color: '#005F80',
    backgroundColor: '#005F80',
    textColor: '#FFFFFF',
    order: 4000,
  },
  MarylandLightRailLightRaillink: {
    name: 'Baltimore Light RailLink',
    color: '#355D82',
    backgroundColor: '#355D82',
    textColor: '#FFFFFF',
    order: 4001,
  },
  MTAPurpleLine: {
    name: 'Purple Line',
    color: '#9062D4',
    backgroundColor: '#612C95',
    textColor: '#FFFFFF',
    order: 4002,
  },
}

export const METADATA: Metadata = {
  title: 'Washington DC Metro Memory Game',
  description: 'How many of the DC metro stations can you name from memory?',
  openGraph: {
    title: 'Washington DC Metro Memory Game',
    description: 'How many of the DC metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/dc',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clo61jvsw003b01pb6rta5qln',
  bounds: [
    [-77.200073, 38.778566],
    [-76.859497, 39.008903],
  ],
  maxBounds: [
    [-79, 37],
    [-74, 41],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/28o14B9Yic6m73adQT'

export const CITY_NAME = 'dc'

export const LOCALE = 'en'

export const GAUGE_COLORS = 'inverted'

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Washington Metropolitan Area Transit Authority (WMATA)',
    items: [
      {
        type: 'lines',
        lines: [
          'WMATAMetroBlue',
          'WMATAMetroGreen',
          'WMATAMetroOrange',
          'WMATAMetroRed',
          'WMATAMetroSilver',
          'WMATAMetroYellow',
        ],
      },
    ],
  },
  {
    title: 'Virginia Railway Express (VRE)',
    items: [
      {
        type: 'lines',
        lines: ['VREManassasLine', 'VREFredericksburgLine'],
      },
    ],
  },
  {
    title: 'Maryland Transit Administration (MTA)',
    items: [
      {
        type: 'lines',
        title: 'Maryland Area Rail Commuter (MARC)',
        lines: ['MARCBrunswickLine', 'MARCCamdenLine', 'MARCPennLine'],
      },
      {
        type: 'lines',
        title: 'Baltimore Metro SubwayLink',
        lines: ['MarylandMetroMetroSubwaylink'],
      },
      {
        type: 'lines',
        title: 'Light Rail',
        lines: ['MarylandLightRailLightRaillink', 'MTAPurpleLine'],
      },
    ],
  },
]

const config: Config = {
  GAUGE_COLORS,
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

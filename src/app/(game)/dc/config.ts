import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line } from '@/lib/types'

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
  // "MarylandMetroMetroSubwaylink": {
  //     "name": "Metro Subway",
  //     "color": "#008000",
  //     "backgroundColor": "#004000",
  //     "textColor": "#000000",
  //     "order": 1000
  // },
  // "MarylandLightRailLightRaillink": {
  //     "name": "Light Rail",
  //     "color": "#006B9F",
  //     "backgroundColor": "#003650",
  //     "textColor": "#000000",
  //     "order": 1000
  // },
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

const config: Config = {
  GAUGE_COLORS,
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  BEG_THRESHOLD,
}

export default config

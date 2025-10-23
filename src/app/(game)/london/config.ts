import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.2

export const LINES: {
  [name: string]: Line
} = {
  Bakerloo: {
    name: 'Bakerloo',
    color: '#b36305',
    backgroundColor: '#5e2f00',
    textColor: '#fff',
    order: 0,
  },

  Central: {
    name: 'Central',
    color: '#e32017',
    backgroundColor: '#7f0f00',
    textColor: '#fff',
    order: 1,
  },

  Circle: {
    name: 'Circle',
    color: '#ffd329',
    backgroundColor: '#7f6d00',
    textColor: '#222',
    order: 2,
  },
  District: {
    name: 'District',
    color: '#00782a',
    backgroundColor: '#00441b',
    textColor: '#fff',
    order: 4,
  },
  HammersmithAndCity: {
    name: 'Hammersmith & City',
    color: '#f3a9bb',
    backgroundColor: '#b41f43',
    textColor: '#222',
    order: 6,
  },
  Jubilee: {
    name: 'Jubilee',
    color: '#a0a5a9',
    backgroundColor: '#4c4f52',
    textColor: '#fff',
    order: 7,
  },
  Metropolitan: {
    name: 'Metropolitan',
    color: '#9b0056',
    backgroundColor: '#4f002d',
    textColor: '#fff',
    order: 8,
  },
  Northern: {
    name: 'Northern',
    color: '#000000',
    backgroundColor: '#444',
    textColor: '#fff',
    order: 9,
  },
  Piccadilly: {
    name: 'Piccadilly',
    color: '#003688',
    backgroundColor: '#001e62',
    textColor: '#fff',
    order: 11,
  },
  Victoria: {
    name: 'Victoria',
    color: '#0098d4',
    backgroundColor: '#005785',
    textColor: '#fff',
    order: 12,
  },
  WaterlooAndCity: {
    name: 'Waterloo & City',
    color: '#84CAB3',
    backgroundColor: '#005b44',
    textColor: '#222',
    order: 13,
  },
  DLR: {
    name: 'DLR',
    color: '#00afad',
    backgroundColor: '#006d6b',
    textColor: '#fff',
    order: 14,
  },
  Overground: {
    name: 'Overground',
    color: '#e86a10',
    backgroundColor: '#7f3300',
    textColor: '#fff',
    order: 15,
  },
  ElizabethLine: {
    name: 'Elizabeth Line',
    color: '#6950A1',
    backgroundColor: '#2b1d4d',
    textColor: '#fff',
    order: 16,
  },
}

export const METADATA: Metadata = {
  title: 'London Tube Memory Game',
  description: 'How many of the London Tube stations can you name from memory?',
  openGraph: {
    title: 'London Tube Memory Game',
    description:
      'How many of the London Tube stations can you name from memory?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.com/london',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clnx0tw77005n01qsfyeya61u',
  bounds: [
    [-0.619997, 51.323273],
    [0.35504, 51.68869],
  ],
  maxBounds: [
    [-2.058488, 50.738554],
    [1.841659, 52.201223],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/bIY8x3fiCgmC9bi8wx'

export const CITY_NAME = 'london'

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

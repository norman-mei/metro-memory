import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.5

export const LINES: {
  [name: string]: Line
} = {
  CTAMetroBlueLine: {
    name: 'Blue Line',
    color: '#009EDE',
    backgroundColor: '#004F6F',
    textColor: '#FFFFFF',
    order: 0,
  },
  CTAMetroBrownLine: {
    name: 'Brown Line',
    color: '#633619',
    backgroundColor: '#311B0D',
    textColor: '#FFFFFF',
    order: 1,
  },
  CTAMetroGreenLine: {
    name: 'Green Line',
    color: '#00A747',
    backgroundColor: '#005324',
    textColor: '#FFFFFF',
    order: 2,
  },
  CTAMetroOrangeLine: {
    name: 'Orange Line',
    color: '#F57832',
    backgroundColor: '#8D3707',
    textColor: '#FFFFFF',
    order: 3,
  },
  CTAMetroPinkLine: {
    name: 'Pink Line',
    color: '#E480A7',
    backgroundColor: '#931F4C',
    textColor: '#FFFFFF',
    order: 4,
  },
  CTAMetroPurpleLine: {
    name: 'Purple Line',
    color: '#522398',
    backgroundColor: '#29124C',
    textColor: '#FFFFFF',
    order: 5,
  },
  CTAMetroRedLine: {
    name: 'Red Line',
    color: '#E72137',
    backgroundColor: '#770D19',
    textColor: '#FFFFFF',
    order: 6,
  },
  CTAMetroYellowLine: {
    name: 'Yellow Line',
    color: '#EABE01',
    backgroundColor: '#755F00',
    textColor: '#FFFFFF',
    order: 7,
  },
}

export const METADATA: Metadata = {
  title: 'Chicago Metro Memory',
  description:
    'How many of the Chicago metro stations can you name from memory?',
  openGraph: {
    title: 'Chicago Metro Memory',
    description:
      'How many of the Chicago metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/chicago',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls1x0vfw013e01qy7k1xdbcu',
  bounds: [
    [-88.3, 41.4],
    [-87.3, 42.3],
  ],
  maxBounds: [
    [-89.5, 40.5],
    [-86.5, 43.5],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/28o14B9Yic6m73adQT'

export const CITY_NAME = 'chicago'

export const LOCALE = 'en'

const config: Config = {
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  BEG_THRESHOLD,
}

export default config

import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.5

export const LINES: {
  [name: string]: Line
} = {
  MBTATMetroBlueLine: {
    name: 'Blue Line',
    color: '#007CC3',
    backgroundColor: '#003E62',
    textColor: '#FFFFFF',
    order: 0,
  },
  MBTATMetroGreenBLine: {
    name: 'Green B',
    color: '#009b67',
    backgroundColor: '#004E34',
    textColor: '#FFFFFF',
    order: 1,
  },
  MBTATGreenCLine: {
    name: 'Green C',
    color: '#009b67',
    backgroundColor: '#004E34',
    textColor: '#FFFFFF',
    order: 2,
  },
  MBTATGreenDLine: {
    name: 'Green D',
    color: '#009b67',
    backgroundColor: '#004E34',
    textColor: '#FFFFFF',
    order: 3,
  },
  MBTATGreenELine: {
    name: 'Green E',
    color: '#009b67',
    backgroundColor: '#004E34',
    textColor: '#FFFFFF',
    order: 4,
  },
  MBTATMetroOrangeLine: {
    name: 'Orange Line',
    color: '#E87424',
    backgroundColor: '#79390D',
    textColor: '#FFFFFF',
    order: 5,
  },
  MBTATMetroRedLine: {
    name: 'Red Line',
    color: '#EF3E42',
    backgroundColor: '#8B0C0E',
    textColor: '#FFFFFF',
    order: 6,
  },
  MBTATMetroRedMLine: {
    name: 'Mattapan Trolley',
    color: '#EF3E42',
    backgroundColor: '#8B0C0E',
    textColor: '#FFFFFF',
    order: 7,
  },
}

export const METADATA: Metadata = {
  title: 'Boston Metro Memory',
  description:
    'How many of the Boston metro stations can you name from memory?',
  openGraph: {
    title: 'Boston Metro Memory',
    description:
      'How many of the Boston metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/boston',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-71.547818, 42.13603],
    [-70.572781, 42.569886],
  ],
  maxBounds: [
    [-72.547818, 41.13603],
    [-69.572781, 43.569886],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/28o14B9Yic6m73adQT'

export const CITY_NAME = 'boston'

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

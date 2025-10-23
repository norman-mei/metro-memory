import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.5

export const LINES: {
  [name: string]: Line
} = {
  VancouverSkytrainCanadaLine: {
    name: 'Canada Line',
    color: '#009BC8',
    backgroundColor: '#004E64',
    textColor: '#ffffff',
    order: 0,
  },
  VancouverSkytrainExpoLine: {
    name: 'Expo Line',
    color: '#015DAB',
    backgroundColor: '#002E55',
    textColor: '#ffffff',
    order: 1,
  },
  VancouverSkytrainMillenniumLine: {
    name: 'Millennium Line',
    color: '#FED105',
    backgroundColor: '#816A01',
    textColor: '#000000',
    order: 2,
  },
  VancouverSeabusSeabus: {
    name: 'Seabus',
    color: '#746661',
    backgroundColor: '#3A3331',
    textColor: '#FFFFFF',
    order: 3,
  },
  VancouverWestCoastExpressWce: {
    name: 'WCE',
    color: '#77278D',
    backgroundColor: '#3B1447',
    textColor: '#ffffff',
    order: 4,
  },
}

export const METADATA: Metadata = {
  title: 'Vancouver Metro Memory',
  description:
    'How many of the Vancouver transit stations can you name from memory?',
  openGraph: {
    title: 'Vancouver Metro Memory',
    description:
      'How many of the Vancouver transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/vancouver',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls1uo75n012501r41183e47e',
  bounds: [
    [-123.453143, 49.009389],
    [-122.464374, 49.413096],
  ],
  maxBounds: [
    [-124.5, 48],
    [-121.5, 50.4],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/fZe14B4DY8Ua9bi6oC'

export const CITY_NAME = 'vancouver'

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

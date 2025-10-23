import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Config, Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.5

export const LINES: {
  [name: string]: Line
} = {
  STMMetroVerte: {
    name: 'Verte',
    color: '#008E4F',
    backgroundColor: '#004727',
    textColor: '#FFFFFF',
    order: 0,
  },
  STMMetroOrange: {
    name: 'Orange',
    color: '#EF8122',
    backgroundColor: '#7F4009',
    textColor: '#FFFFFF',
    order: 1,
  },
  STMMetroJaune: {
    name: 'Jaune',
    color: '#FCD100',
    backgroundColor: '#7E6900',
    textColor: '#FFFFFF',
    order: 2,
  },
  STMMetroBleue: {
    name: 'Bleue',
    color: '#0083C9',
    backgroundColor: '#004265',
    textColor: '#FFFFFF',
    order: 3,
  },
  AMTRailExo1: {
    name: 'Ligne 11',
    color: '#F16179',
    backgroundColor: '#9B0E25',
    textColor: '#FFFFFF',
    order: 4,
  },
  AMTRailExo2: {
    name: 'Ligne 12',
    color: '#A2D586',
    backgroundColor: '#4B812D',
    textColor: '#FFFFFF',
    order: 5,
  },
  AMTRailExo3: {
    name: 'Ligne 13',
    color: '#999AC6',
    backgroundColor: '#3F4071',
    textColor: '#FFFFFF',
    order: 6,
  },
  AMTRailExo4: {
    name: 'Ligne 14',
    color: '#5AB6B2',
    backgroundColor: '#2A5E5C',
    textColor: '#FFFFFF',
    order: 7,
  },
  AMTRailExo5: {
    name: 'Ligne 15',
    color: '#CA5898',
    backgroundColor: '#6E234D',
    textColor: '#FFFFFF',
    order: 8,
  },
}

export const METADATA: Metadata = {
  title: 'Montreal Metro Memory',
  description:
    'Combien des stations du métro de Montréal pouvez-vous citer de tête ?',
  openGraph: {
    title: 'Montreal Metro Memory',
    description:
      'Combien des stations du métro de Montréal pouvez-vous citer de tête ?',
    type: 'website',
    locale: 'fr_CA',
    url: 'https://metro-memory.com/montreal',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls1svcle010201peaxut9ezg',
  bounds: [
    [-74.5, 45.3],
    [-73.3, 45.8],
  ],
  maxBounds: [
    [-75.5, 44.5],
    [-72.3, 46.8],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/fZe14B4DY8Ua9bi6oC'

export const CITY_NAME = 'montreal'

export const LOCALE = 'fr'

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

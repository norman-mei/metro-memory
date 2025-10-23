import { Config, Line } from '@/lib/types'
import { MapboxOptions } from 'mapbox-gl'
import { Metadata } from 'next'

export const BEG_THRESHOLD = 0.2

// Note: below LINES data is just a copy of generated data/lines.json
export const LINES: {
  [name: string]: Line
} = {
  Karlsruhe1: {
    name: '1',
    color: '#ed1c24',
    backgroundColor: '#7B0A0E',
    textColor: '#FFFFFF',
    order: 1,
  },
  Karlsruhe2: {
    name: '2',
    color: '#0071bc',
    backgroundColor: '#00385E',
    textColor: '#FFFFFF',
    order: 2,
  },
  Karlsruhe3: {
    name: '3',
    color: '#947139',
    backgroundColor: '#4A381C',
    textColor: '#FFFFFF',
    order: 3,
  },
  Karlsruhe4: {
    name: '4',
    color: '#ffcb04',
    backgroundColor: '#826700',
    textColor: '#FFFFFF',
    order: 4,
  },
  Karlsruhe5: {
    name: '5',
    color: '#00c0f3',
    backgroundColor: '#006079',
    textColor: '#FFFFFF',
    order: 5,
  },
  Karlsruhe8: {
    name: '8',
    color: '#f7931d',
    backgroundColor: '#854A05',
    textColor: '#FFFFFF',
    order: 6,
  },
  Karlsruhe17: {
    name: '17',
    color: '#660000',
    backgroundColor: '#330000',
    textColor: '#FFFFFF',
    order: 7,
  },
  Karlsruhe18: {
    name: '18',
    color: '#197248',
    backgroundColor: '#0C3924',
    textColor: '#FFFFFF',
    order: 8,
  },
  KarlsruheS1: {
    name: 'S1',
    color: '#00A76D',
    backgroundColor: '#005337',
    textColor: '#FFFFFF',
    order: 9,
  },
  KarlsruheS11: {
    name: 'S11',
    color: '#00A76D',
    backgroundColor: '#005337',
    textColor: '#FFFFFF',
    order: 10,
  },
  KarlsruheS12: {
    name: 'S12',
    color: '#00A76D',
    backgroundColor: '#005337',
    textColor: '#FFFFFF',
    order: 11,
  },
  KarlsruheS2: {
    name: 'S2',
    color: '#A065AB',
    backgroundColor: '#523058',
    textColor: '#FFFFFF',
    order: 12,
  },
  KarlsruheS31: {
    name: 'S31',
    color: '#00A99D',
    backgroundColor: '#00544F',
    textColor: '#FFFFFF',
    order: 13,
  },
  KarlsruheS32: {
    name: 'S32',
    color: '#00A99D',
    backgroundColor: '#00544F',
    textColor: '#FFFFFF',
    order: 14,
  },
  KarlsruheS4: {
    name: 'S4',
    color: '#9E184D',
    backgroundColor: '#4F0C26',
    textColor: '#FFFFFF',
    order: 15,
  },
  KarlsruheS41: {
    name: 'S41',
    color: '#bed730',
    backgroundColor: '#616E15',
    textColor: '#FFFFFF',
    order: 16,
  },
  KarlsruheS42: {
    name: 'S42',
    color: '#0090ad',
    backgroundColor: '#004857',
    textColor: '#FFFFFF',
    order: 17,
  },
  KarlsruheS5: {
    name: 'S5',
    color: '#F69897',
    backgroundColor: '#B71210',
    textColor: '#FFFFFF',
    order: 18,
  },
  KarlsruheS51: {
    name: 'S51',
    color: '#F69897',
    backgroundColor: '#B71210',
    textColor: '#FFFFFF',
    order: 19,
  },
  KarlsruheS52: {
    name: 'S52',
    color: '#F69897',
    backgroundColor: '#B71210',
    textColor: '#FFFFFF',
    order: 20,
  },
  KarlsruheS6: {
    name: 'S6',
    color: '#301747',
    backgroundColor: '#180C24',
    textColor: '#FFFFFF',
    order: 21,
  },
  KarlsruheS7: {
    name: 'S7',
    color: '#fff200',
    backgroundColor: '#807900',
    textColor: '#FFFFFF',
    order: 22,
  },
  KarlsruheS71: {
    name: 'S71',
    color: '#fff200',
    backgroundColor: '#807900',
    textColor: '#FFFFFF',
    order: 23,
  },
  KarlsruheS8: {
    name: 'S8',
    color: '#6e692a',
    backgroundColor: '#373415',
    textColor: '#FFFFFF',
    order: 24,
  },
  KarlsruheS81: {
    name: 'S81',
    color: '#6e692a',
    backgroundColor: '#373415',
    textColor: '#FFFFFF',
    order: 25,
  },
}

export const METADATA: Metadata = {
  title: 'Karlsruhe Tram(-Train) Memory',
  description:
    'How many of the Karlsruhe tram(-train) stations can you name from memory?',
  openGraph: {
    title: 'Karlsruhe Tram(-Train) Memory',
    description:
      'How many of the Karlsruhe tram(-train) stations can you name from memory?',
    type: 'website',
    locale: 'de_DE',
    url: 'https://metro-memory.com/karlsruhe',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls4h02hy019201qygvumc0nb', // generic
  minZoom: 6,
  fadeDuration: 50,
  dragRotate: false,
}

export const STRIPE_LINK = 'https://buy.stripe.com/cN2aFb0nI1rI9bi5km'

export const CITY_NAME = 'karlsruhe'

export const LOCALE = 'de'

export const MAP_FROM_DATA = true

const config: Config = {
  GAUGE_COLORS: 'inverted',
  MAP_FROM_DATA,
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  BEG_THRESHOLD,
}

export default config

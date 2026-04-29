import { Config, Line, LineGroup } from '@/lib/types'
import type { MapboxOptions } from 'mapbox-gl'
import { Metadata } from 'next'

export const LINES: {
  [name: string]: Line
} = {
  STMMetroVerte: {
    name: 'Green',
    color: '#008E4F',
    backgroundColor: '#004727',
    textColor: '#FFFFFF',
    order: 0,
    icon: 'north-america/canada/montreal/STMMetroVerte.svg',
  },
  STMMetroOrange: {
    name: 'Orange',
    color: '#EF8122',
    backgroundColor: '#7F4009',
    textColor: '#FFFFFF',
    order: 1,
    icon: 'north-america/canada/montreal/STMMetroOrange.svg',
  },
  STMMetroJaune: {
    name: 'Yellow',
    color: '#FCD100',
    backgroundColor: '#7E6900',
    textColor: '#FFFFFF',
    order: 2,
    icon: 'north-america/canada/montreal/STMMetroJaune.svg',
  },
  STMMetroBleue: {
    name: 'Blue',
    color: '#0083C9',
    backgroundColor: '#004265',
    textColor: '#FFFFFF',
    order: 3,
    icon: 'north-america/canada/montreal/STMMetroBleue.svg',
  },
  AMTRailExo1: {
    name: 'Vaudreuil-Hudson',
    color: '#F16179',
    backgroundColor: '#9B0E25',
    textColor: '#FFFFFF',
    order: 4,
    icon: 'north-america/canada/montreal/AMTRailExo1.svg',
  },
  AMTRailExo2: {
    name: 'Saint-Jérôme',
    color: '#FFDF7E',
    progressOutlineColor: '#FFDF7E',
    backgroundColor: '#8A6A1F',
    textColor: '#000000',
    order: 5,
    icon: 'north-america/canada/montreal/AMTRailExo2.svg',
  },
  AMTRailExo3: {
    name: 'Mont-Saint-Hilaire',
    color: '#999AC6',
    backgroundColor: '#3F4071',
    textColor: '#FFFFFF',
    order: 6,
    icon: 'north-america/canada/montreal/AMTRailExo3.svg',
  },
  AMTRailExo4: {
    name: 'Candiac',
    color: '#5AB6B2',
    backgroundColor: '#2A5E5C',
    textColor: '#FFFFFF',
    order: 7,
    icon: 'north-america/canada/montreal/AMTRailExo4.svg',
  },
  AMTRailExo5: {
    name: 'Mascouche',
    color: '#CA5898',
    backgroundColor: '#6E234D',
    textColor: '#FFFFFF',
    order: 8,
    icon: 'north-america/canada/montreal/AMTRailExo5.svg',
  },
  MontrealREMA1: {
    name: 'Main Line',
    color: '#80C23B',
    backgroundColor: '#3A7A24',
    textColor: '#FFFFFF',
    order: 9,
    icon: 'north-america/canada/montreal/REMA1.png',
    badgeFit: 'contain',
  },
  MontrealREMA2: {
    name: 'Deux-Montagnes Branch',
    color: '#80C23B',
    backgroundColor: '#3A7A24',
    textColor: '#FFFFFF',
    order: 10,
    icon: 'north-america/canada/montreal/REMA2.png',
    badgeFit: 'contain',
  },
  MontrealREMA3: {
    name: "Anse-à-l'Orme Branch",
    color: '#80C23B',
    backgroundColor: '#3A7A24',
    textColor: '#FFFFFF',
    order: 11,
    icon: 'north-america/canada/montreal/REMA3.png',
    badgeFit: 'contain',
  },
  MontrealREMA4: {
    name: 'YUL-Aéroport-Montréal-Trudeau Branch',
    color: '#80C23B',
    backgroundColor: '#3A7A24',
    textColor: '#FFFFFF',
    order: 12,
    icon: 'north-america/canada/montreal/REMA4.png',
    badgeFit: 'contain',
  },
}

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/montreal',
    apple: '/api/city-icon/montreal',
  },
  title: 'Montreal Metro Memory Game',
  description: 'How many of the Montreal metro stations can you name from memory?',
  openGraph: {
    title: 'Montreal Metro Memory Game',
    description:
      'How many of the Montreal metro stations can you name from memory?',
    type: 'website',
    locale: 'en_CA',
    url: 'https://metro-memory.com/north-america/canada/montreal',
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

export const CITY_NAME = 'montreal'

export const LOCALE = 'en'

export const GAUGE_COLORS = 'inverted'

export const MAP_FROM_DATA = true

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Montréal Metro',
    titleImage: 'MontrealMetro.png',
    items: [
      {
        type: 'lines',
        lines: ['STMMetroVerte', 'STMMetroOrange', 'STMMetroJaune', 'STMMetroBleue'],
      },
    ],
  },
  {
    title: 'Exo Commuter Rail',
    titleImage: 'exo_new.png',
    items: [
      {
        type: 'lines',
        lines: ['AMTRailExo1', 'AMTRailExo2', 'AMTRailExo3', 'AMTRailExo4', 'AMTRailExo5'],
      },
    ],
  },
  {
    title: 'Réseau express métropolitain (REM)',
    titleImage: 'MontrealREM.svg',
    items: [
      {
        type: 'lines',
        lines: ['MontrealREMA1', 'MontrealREMA2', 'MontrealREMA3', 'MontrealREMA4'],
      },
    ],
  },
]

const config: Config = {
  GAUGE_COLORS,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  LINE_GROUPS,
  MAP_FROM_DATA,
}

export default config
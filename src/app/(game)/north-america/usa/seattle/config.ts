import { Metadata } from 'next'
import type { MapboxOptions } from 'mapbox-gl'
import { Config, Line, LineGroup } from '@/lib/types'
import linesData from './data/lines.json'


export const LINES = linesData as { [name: string]: Line }

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'Central Puget Sound Regional Transit Authority (Sound Transit)',
    titleImage: 'SoundTransit.png',
    items: [
      {
        type: 'lines',
        title: 'Link Light Rail',
        titleImage: 'LinkLightRail.png',
        lines: ['SoundTransit1', 'SoundTransit2', 'SoundTransitT'],
      },
      {
        type: 'lines',
        title: 'Sounder',
        titleImage: 'Sounder.png',
        lines: ['SoundTransitN', 'SoundTransitS'],
      },
    ],
  },
  {
    title: 'King County Metro (KCM)',
    titleImage: 'KingCountyMetro.png',
    items: [
      {
        type: 'lines',
        title: 'Seattle Streetcar',
        titleImage: 'SeattleStreetcar.png',
        lines: ['SeattleStreetcarSLU', 'SeattleStreetcarFirstHill'],
      },
    ],
  },
  {
    title: 'Seattle Monorail Services (SMS)',
    items: [
      {
        type: 'lines',

        lines: ['SeattleCenterMonorail'],
      },
    ],
  },
  {
    title: 'Port of Seattle',
    titleImage: 'PortOfSeattle.png',
    items: [
      {
        type: 'lines',
        title: 'SEA Underground',
        titleImage: 'SEAUndergroundLogo.png',
        lines: ['MAXGreen', 'MAXBlue', 'MAXYellow'],
      },
    ],
  },
]

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/seattle',
    apple: '/api/city-icon/seattle',
  },
  title: 'Seattle—Tacoma Metro Memory',
  description: 'Test your knowledge of Puget Sound transit lines from Link to SEA Underground.',
  openGraph: {
    title: 'Seattle—Tacoma Metro Memory',
    description: 'Test your knowledge of Puget Sound transit lines from Link to SEA Underground.',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/seattle',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/cls31ijdo010o01plcpzag11d',
  bounds: [
    [-122.6, 47.15],
    [-122.05, 47.9],
  ],
  maxBounds: [
    [-123.2, 46.9],
    [-121.6, 48.1],
  ],
  minZoom: 9,
  fadeDuration: 50,
}


export const CITY_NAME = 'seattle'

export const LOCALE = 'en'

export const MAP_FROM_DATA = true

export const LINES_WITH_ICONS: { [name: string]: Line } = {
  ...LINES,
  MAXGreen: {
    ...LINES.MAXGreen,
    icon: 'north-america/usa/seattle/SEAUndergroundGreen.png',
    badgeFit: 'contain',
  },
}

const config: Config = {
  MAP_FROM_DATA,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES: LINES_WITH_ICONS,
  LINE_GROUPS,
}

export default config

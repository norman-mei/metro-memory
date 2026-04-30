import { Config, Line, LineGroup } from '@/lib/types'
import type { MapboxOptions } from 'mapbox-gl'
import { Metadata } from 'next'


export const LINES: { [name: string]: Line } = {
  PhillySEPTAL: {
    name: 'Market-Frankford',
    color: '#1C9AD6',
    backgroundColor: '#0E5F88',
    textColor: '#FFFFFF',
    order: 100,
  },
  PhillySEPTAB1: {
    name: 'Broad Street Local',
    color: '#F26100',
    backgroundColor: '#A54300',
    textColor: '#FFFFFF',
    order: 101,
  },
  PhillySEPTAB2: {
    name: 'Broad Street Express',
    color: '#F26100',
    backgroundColor: '#843700',
    textColor: '#FFFFFF',
    order: 102,
  },
  PhillySEPTAB3: {
    name: 'Broad-Ridge Spur',
    color: '#F26100',
    backgroundColor: '#692A00',
    textColor: '#FFFFFF',
    order: 103,
  },
  PhillySEPTAT1: {
    name: 'Lancaster Avenue',
    color: '#5A960A',
    backgroundColor: '#3D6907',
    textColor: '#FFFFFF',
    order: 110,
  },
  PhillySEPTAT2: {
    name: 'Baltimore Avenue',
    color: '#5A960A',
    backgroundColor: '#3D6907',
    textColor: '#FFFFFF',
    order: 111,
  },
  PhillySEPTAT3: {
    name: 'Chester Avenue',
    color: '#5A960A',
    backgroundColor: '#3D6907',
    textColor: '#FFFFFF',
    order: 112,
  },
  PhillySEPTAT4: {
    name: 'Woodland Avenue',
    color: '#5A960A',
    backgroundColor: '#3D6907',
    textColor: '#FFFFFF',
    order: 113,
  },
  PhillySEPTAT5: {
    name: 'Elmwood Avenue',
    color: '#5A960A',
    backgroundColor: '#3D6907',
    textColor: '#FFFFFF',
    order: 114,
  },
  PhillySEPTAG: {
    name: 'Girard Avenue',
    color: '#FCD602',
    backgroundColor: '#B49A00',
    textColor: '#1A1919',
    order: 115,
  },
  PhillySEPTAD1: {
    name: 'Media',
    color: '#E5427B',
    backgroundColor: '#A72D55',
    textColor: '#FFFFFF',
    order: 117,
  },
  PhillySEPTAD2: {
    name: 'Sharon Hill',
    color: '#E5427B',
    backgroundColor: '#A72D55',
    textColor: '#FFFFFF',
    order: 118,
  },
  PhillySEPTAM: {
    name: 'Norristown High Speed',
    color: '#613393',
    backgroundColor: '#3F2160',
    textColor: '#FFFFFF',
    order: 119,
  },
  PhillySEPTAAP: {
    name: 'Airport',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 200,
    icon: 'north-america/usa/philly/PhillySEPTAAP.png',
  },
  PhillySEPTACE: {
    name: 'Chestnut Hill East',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 201,
    icon: 'north-america/usa/philly/PhillySEPTACE.png',
  },
  PhillySEPTACW: {
    name: 'Chestnut Hill West',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 202,
    icon: 'north-america/usa/philly/PhillySEPTACW.png',
  },
  PhillySEPTACY: {
    name: 'Cynwyd',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 203,
    icon: 'north-america/usa/philly/PhillySEPTACY.png',
  },
  PhillySEPTAFC: {
    name: 'Fox Chase',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 204,
    icon: 'north-america/usa/philly/PhillySEPTAFC.png',
  },
  PhillySEPTALD: {
    name: 'Lansdale/Doylestown',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 205,
    icon: 'north-america/usa/philly/PhillySEPTALD.png',
  },
  PhillySEPTAMN: {
    name: 'Manayunk/Norristown',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 206,
    icon: 'north-america/usa/philly/PhillySEPTAMN.png',
  },
  PhillySEPTAMW: {
    name: 'Media/Wawa',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 207,
    icon: 'north-america/usa/philly/PhillySEPTAMW.png',
  },
  PhillySEPTAPT: {
    name: 'Paoli/Thorndale',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 208,
    icon: 'north-america/usa/philly/PhillySEPTAPT.png',
  },
  PhillySEPTATR: {
    name: 'Trenton',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 209,
    icon: 'north-america/usa/philly/PhillySEPTATR.png',
  },
  PhillySEPTAWM: {
    name: 'Warminster',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 210,
    icon: 'north-america/usa/philly/PhillySEPTAWM.png',
  },
  PhillySEPTAWT: {
    name: 'West Trenton',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 211,
    icon: 'north-america/usa/philly/PhillySEPTAWT.png',
  },
  PhillySEPTAWN: {
    name: 'Wilmington/Newark',
    color: '#43647C',
    backgroundColor: '#2C4152',
    textColor: '#FFFFFF',
    order: 212,
    icon: 'north-america/usa/philly/PhillySEPTAWN.png',
  },
  PATCOSpeedline: {
    name: 'PATCO Speedline',
    color: '#C81F3C',
    backgroundColor: '#821326',
    textColor: '#FFFFFF',
    order: 300,
    icon: 'north-america/usa/philly/PATCOSpeedline.png',
  },
}

export const METADATA: Metadata = {
  icons: {
    icon: '/api/city-icon/philly',
    apple: '/api/city-icon/philly',
  },
  title: 'Philadelphia Transit Memory Game',
  description: 'How many of the Philadelphia transit stations can you name from memory?',
  openGraph: {
    title: 'Philadelphia Transit Memory Game',
    description: 'How many of the Philadelphia transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/philly',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clo61jvsw003b01pb6rta5qln',
  bounds: [
    [-75.5, 39.7],
    [-74.9, 40.2],
  ],
  maxBounds: [
    [-76.2, 39.2],
    [-74.3, 40.7],
  ],
  minZoom: 8,
  fadeDuration: 50,
}


export const CITY_NAME = 'philly'

export const LOCALE = 'en'

export const GAUGE_COLORS = 'inverted'

export const LINE_GROUPS: LineGroup[] = [
  {
    title: 'SEPTA Metro',
    titleImage: 'SEPTAMetro.png',
    items: [
      {
        type: 'lines',
        title: 'Rapid Transit',
        lines: ['PhillySEPTAL', 'PhillySEPTAB1', 'PhillySEPTAB2', 'PhillySEPTAB3'],
      },
      {
        type: 'lines',
        title: 'Light Rail',
        lines: ['PhillySEPTAT1', 'PhillySEPTAT2', 'PhillySEPTAT3', 'PhillySEPTAT4', 'PhillySEPTAT5', 'PhillySEPTAD1', 'PhillySEPTAD2'],
      },
      {
        type: 'lines',
        title: 'Streetcar',
        lines: ['PhillySEPTAG'],
      },
      {
        type: 'lines',
        title: 'Light Metro',
        lines: ['PhillySEPTAM'],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'SEPTA Regional Rail',
    titleImage: 'SEPTARR.png',
    items: [
      {
        type: 'lines',
        title: 'Former Pennsylvania Railroad Lines',
        lines: [
          'PhillySEPTAAP',
          'PhillySEPTACW',
          'PhillySEPTACY',
          'PhillySEPTAMW',
          'PhillySEPTAPT',
          'PhillySEPTATR',
          'PhillySEPTAWN',
        ],
      },
      {
        type: 'lines',
        title: 'Former Reading Railroad Lines',
        lines: [
          'PhillySEPTACE',
          'PhillySEPTAFC',
          'PhillySEPTALD',
          'PhillySEPTAMN',
          'PhillySEPTAWM',
          'PhillySEPTAWT',
        ],
      },
    ],
  },
  {
    items: [{ type: 'separator' }],
  },
  {
    title: 'Delaware River Port Authority',
    titleImage: 'DRPA.png',
    items: [
      {
        type: 'lines',
        lines: ['PATCOSpeedline'],
      },
    ],
  },
]

export const MAP_FROM_DATA = true

const config: Config = {
  MAP_FROM_DATA,
  GAUGE_COLORS,
  LOCALE,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  LINE_GROUPS,
}

export default config

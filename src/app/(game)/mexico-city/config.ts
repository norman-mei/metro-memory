import { Metadata } from 'next'
import { MapboxOptions } from 'mapbox-gl'
import { Line } from '@/lib/types'

export const BEG_THRESHOLD = 0.2

export const LINES: {
  [name: string]: Line
} = {
  DFMetro1: {
    name: 'Rosa',
    color: '#f94f8e',
    backgroundColor: '#9F053E',
    textColor: '#FFFFFF',
    order: 0,
  },
  DFMetro2: {
    name: 'Azul',
    color: '#0071c1',
    backgroundColor: '#003961',
    textColor: '#FFFFFF',
    order: 1,
  },
  DFMetro3: {
    name: 'Verde',
    color: '#ad9b0c',
    backgroundColor: '#574E06',
    textColor: '#FFFFFF',
    order: 2,
  },
  DFMetro4: {
    name: 'Azul',
    color: '#7fbcaa',
    backgroundColor: '#366759',
    textColor: '#FFFFFF',
    order: 3,
  },
  DFMetro5: {
    name: 'Amarilla',
    color: '#f9d616',
    backgroundColor: '#847003',
    textColor: '#FFFFFF',
    order: 4,
  },
  DFMetro6: {
    name: 'Roja',
    color: '#d81e05',
    backgroundColor: '#6C0F03',
    textColor: '#FFFFFF',
    order: 5,
  },
  DFMetro7: {
    name: 'Naranja',
    color: '#e87511',
    backgroundColor: '#743B08',
    textColor: '#FFFFFF',
    order: 6,
  },
  DFMetro8: {
    name: 'Verde',
    color: '#118749',
    backgroundColor: '#084425',
    textColor: '#FFFFFF',
    order: 7,
  },
  DFMetro9: {
    name: 'Café',
    color: '#512826',
    backgroundColor: '#291413',
    textColor: '#FFFFFF',
    order: 8,
  },
  DFMetro12: {
    name: '12',
    color: '#b99e51',
    backgroundColor: '#5F5026',
    textColor: '#FFFFFF',
    order: 9,
  },
  DFMetroA: {
    name: 'Morada',
    color: '#a02d96',
    backgroundColor: '#50174B',
    textColor: '#FFFFFF',
    order: 10,
  },
  DFMetroB: {
    name: 'Bicolor',
    color: '#118751',
    backgroundColor: '#084429',
    textColor: '#FFFFFF',
    order: 11,
  },
}

export const METADATA: Metadata = {
  title: 'Mexico City Metro Memory',
  description:
    '¿Cuántas estaciones del metro de Mexico City puedes nombrar de memoria?',
  openGraph: {
    title: 'Mexico City Metro Memory',
    description:
      '¿Cuántas estaciones del metro de Mexico City puedes nombrar de memoria? Prueba este juego para averiguarlo.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://metro-memory.com/mexico-city',
  },
}

export const MAP_CONFIG: MapboxOptions = {
  container: 'map',
  style: 'mapbox://styles/benjamintd/clp1c5rl601b901qy05alechg',
  bounds: [
    [-99.3267822265625, 19.0797428654523],
    [-98.9117431640625, 19.6146091915543],
  ],
  // +- 1 degree
  maxBounds: [
    [-100.3267822265625, 18.0797428654523],
    [-97.9117431640625, 20.6146091915543],
  ],
  minZoom: 6,
  fadeDuration: 50,
}

export const STRIPE_LINK = 'https://buy.stripe.com/9AQaFb0nI6M2gDK8wE'

export const CITY_NAME = 'mexico-city'

export const LOCALE = 'es'

const config = {
  LOCALE,
  STRIPE_LINK,
  CITY_NAME,
  MAP_CONFIG,
  METADATA,
  LINES,
  BEG_THRESHOLD,
}

export default config

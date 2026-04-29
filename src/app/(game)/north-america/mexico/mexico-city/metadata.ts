import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('mexico-city', {
  icons: {
    icon: '/api/city-icon/mexico-city',
    apple: '/api/city-icon/mexico-city',
  },
  title: 'Mexico City Metro Memory',
  description:
    '¿Cuántas estaciones del metro de Mexico City puedes nombrar de memoria?',
  openGraph: {
    title: 'Mexico City Metro Memory',
    description:
      '¿Cuántas estaciones del metro de Mexico City puedes nombrar de memoria? Prueba este juego para averiguarlo.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://metro-memory.com/north-america/mexico/mexico-city',
  },
})

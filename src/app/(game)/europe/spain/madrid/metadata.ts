import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('madrid', {
  icons: {
    icon: '/api/city-icon/madrid',
    apple: '/api/city-icon/madrid',
  },
  title: 'Madrid Metro Memory',
  description:
    '¿Cuántas estaciones del metro de Madrid puedes nombrar de memoria?',
  openGraph: {
    title: 'Madrid Metro Memory',
    description:
      '¿Cuántas estaciones del metro de Madrid puedes nombrar de memoria? Prueba este juego para averiguarlo.',
    type: 'website',
    locale: 'es_ES',
    url: 'https://metro-memory.com/europe/spain/madrid',
  },
})

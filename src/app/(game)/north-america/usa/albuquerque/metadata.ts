import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('albuquerque', {
  icons: {
    icon: '/api/city-icon/albuquerque',
    apple: '/api/city-icon/albuquerque',
  },
  title: 'Albuquerque Metro Memory',
  description:
    'How many of the New Mexico Rail Runner Express stations can you name from memory?',
  openGraph: {
    title: 'Albuquerque Metro Memory',
    description:
      'How many of the New Mexico Rail Runner Express stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/albuquerque',
  },
})

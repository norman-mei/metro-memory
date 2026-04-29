import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('algiers', {
  icons: {
    icon: '/api/city-icon/algiers',
    apple: '/api/city-icon/algiers',
  },
  title: 'Algiers Metro Memory',
  description: 'How many of the Algiers metro stations can you name from memory?',
  openGraph: {
    title: 'Algiers Metro Memory',
    description: 'How many of the Algiers metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/africa/algeria/algiers',
  },
})

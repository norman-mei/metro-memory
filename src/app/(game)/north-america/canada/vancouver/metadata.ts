import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('vancouver', {
  icons: {
    icon: '/api/city-icon/vancouver',
    apple: '/api/city-icon/vancouver',
  },
  title: 'Vancouver Metro Memory',
  description:
    'How many of the Vancouver transit stations can you name from memory?',
  openGraph: {
    title: 'Vancouver Metro Memory',
    description:
      'How many of the Vancouver transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/canada/vancouver',
  },
})

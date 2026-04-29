import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('blackpool', {
  icons: {
    icon: '/api/city-icon/blackpool',
    apple: '/api/city-icon/blackpool',
  },
  title: 'Blackpool Tram Memory Game',
  description: 'How many Blackpool tram stops can you remember?',
  openGraph: {
    title: 'Blackpool Tram Memory Game',
    description: 'How many Blackpool tram stops can you remember?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.com/europe/uk/blackpool',
  },
})

import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('honolulu', {
  icons: {
    icon: '/api/city-icon/honolulu',
    apple: '/api/city-icon/honolulu',
  },
  title: 'Honolulu Metro Memory',
  description:
    'How many of the Honolulu Skyline stations can you name from memory?',
  openGraph: {
    title: 'Honolulu Metro Memory',
    description:
      'How many of the Honolulu Skyline stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/honolulu',
  },
})

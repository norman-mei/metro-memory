import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('chicago', {
  icons: {
    icon: '/api/city-icon/chicago',
    apple: '/api/city-icon/chicago',
  },
  title: 'Chicago Metro Memory',
  description:
    'How many of the Chicago metro stations can you name from memory?',
  openGraph: {
    title: 'Chicago Metro Memory',
    description:
      'How many of the Chicago metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/chicago',
  },
})

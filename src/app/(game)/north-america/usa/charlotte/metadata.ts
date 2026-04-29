import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('charlotte', {
  icons: {
    icon: '/api/city-icon/charlotte',
    apple: '/api/city-icon/charlotte',
  },
  title: 'Charlotte Metro Memory',
  description:
    'How many of the Charlotte transit stations can you name from memory?',
  openGraph: {
    title: 'Charlotte Metro Memory',
    description:
      'How many of the Charlotte transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/charlotte',
  },
})

import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('pittsburgh', {
  icons: {
    icon: '/api/city-icon/pittsburgh',
    apple: '/api/city-icon/pittsburgh',
  },
  title: 'Pittsburgh Metro Memory',
  description:
    'How many of the Pittsburgh “T” light-rail stations can you name from memory?',
  openGraph: {
    title: 'Pittsburgh Metro Memory',
    description:
      'How many of the Pittsburgh “T” light-rail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/pittsburgh',
  },
})

import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('morgantown', {
  icons: {
    icon: '/api/city-icon/morgantown',
    apple: '/api/city-icon/morgantown',
  },
  title: 'Morgantown Metro Memory',
  description:
    'How many of the Morgantown Personal Rapid Transit stations can you name from memory?',
  openGraph: {
    title: 'Morgantown Metro Memory',
    description:
      'How many of the Morgantown Personal Rapid Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/morgantown',
  },
})

import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('boston', {
  icons: {
    icon: '/api/city-icon/boston',
    apple: '/api/city-icon/boston',
  },
  title: 'Boston Metro Memory',
  description:
    'How many of the Boston metro stations can you name from memory?',
  openGraph: {
    title: 'Boston Metro Memory',
    description:
      'How many of the Boston metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/boston',
  },
})

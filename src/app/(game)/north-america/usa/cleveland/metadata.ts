import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('cleveland', {
  icons: {
    icon: '/api/city-icon/cleveland',
    apple: '/api/city-icon/cleveland',
  },
  title: 'Cleveland Metro Memory',
  description:
    'How many of the Cleveland RTA Rapid Transit stations can you name from memory?',
  openGraph: {
    title: 'Cleveland Metro Memory',
    description:
      'How many of the Cleveland RTA Rapid Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/cleveland',
  },
})

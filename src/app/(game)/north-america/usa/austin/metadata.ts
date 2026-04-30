import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('austin', {
  icons: {
    icon: '/api/city-icon/austin',
    apple: '/api/city-icon/austin',
  },
  title: 'Austin Metro Memory',
  description:
    'How many of the Austin MetroRail stations can you name from memory?',
  openGraph: {
    title: 'Austin Metro Memory',
    description:
      'How many of the Austin MetroRail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/austin',
  },
})

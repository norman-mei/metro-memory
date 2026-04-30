import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('california-state', {
  icons: {
    icon: '/api/city-icon/california-state',
    apple: '/api/city-icon/california-state',
  },
  title: 'California State Metro Memory',
  description:
    'How many of the Bay Area, Los Angeles, and San Diego rail stations can you name from memory?',
  openGraph: {
    title: 'California State Metro Memory',
    description:
      'How many of the Bay Area, Los Angeles, and San Diego rail stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/california-state',
  },
})

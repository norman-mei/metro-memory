import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('twincities', {
  icons: {
    icon: '/api/city-icon/twincities',
    apple: '/api/city-icon/twincities',
  },
  title: 'Minneapolis-St. Paul Metro Memory',
  description:
    'How many of the Minneapolis-St. Paul METRO & airport tram stations can you name from memory?',
  openGraph: {
    title: 'Minneapolis-St. Paul Metro Memory',
    description:
      'How many of the Minneapolis-St. Paul METRO & airport tram stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/twincities',
  },
})

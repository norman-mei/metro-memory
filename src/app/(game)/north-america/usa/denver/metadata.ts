import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('denver', {
  icons: {
    icon: '/api/city-icon/denver',
    apple: '/api/city-icon/denver',
  },
  title: 'Denver Metro Memory',
  description: 'How many of the RTD stations can you name from memory?',
  openGraph: {
    title: 'Denver Metro Memory',
    description: 'How many of the RTD stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/denver',
  },
})

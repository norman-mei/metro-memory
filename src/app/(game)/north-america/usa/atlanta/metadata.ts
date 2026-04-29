import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('atlanta', {
  icons: {
    icon: '/api/city-icon/atlanta',
    apple: '/api/city-icon/atlanta',
  },
  title: 'Atlanta Metro Memory',
  description: 'How many of the MARTA stations can you name from memory?',
  openGraph: {
    title: 'Atlanta Metro Memory',
    description: 'How many of the MARTA stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/atlanta',
  },
})

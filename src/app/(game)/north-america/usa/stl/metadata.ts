import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('stl', {
  icons: {
    icon: '/api/city-icon/stl',
    apple: '/api/city-icon/stl',
  },
  title: 'St. Louis Metro Memory',
  description: 'How many of the St. Louis MetroLink stations can you name from memory?',
  openGraph: {
    title: 'St. Louis Metro Memory',
    description: 'How many of the St. Louis MetroLink stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/stl',
  },
})

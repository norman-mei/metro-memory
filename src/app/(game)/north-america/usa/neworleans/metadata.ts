import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('neworleans', {
  icons: {
    icon: '/api/city-icon/neworleans',
    apple: '/api/city-icon/neworleans',
  },
  title: 'New Orleans Metro Memory',
  description:
    'How many of the New Orleans streetcar stops can you name from memory?',
  openGraph: {
    title: 'New Orleans Metro Memory',
    description:
      'How many of the New Orleans streetcar stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/neworleans',
  },
})

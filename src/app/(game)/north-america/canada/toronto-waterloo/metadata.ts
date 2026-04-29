import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('toronto-waterloo', {
  icons: {
    icon: '/api/city-icon/toronto-waterloo',
    apple: '/api/city-icon/toronto-waterloo',
  },
  title: 'Toronto–Waterloo Metro Memory',
  description: 'How many of the TTC, GO Transit, UP Express, and ION stops can you name from memory?',
  openGraph: {
    title: 'Toronto–Waterloo Metro Memory',
    description: 'How many of the TTC, GO Transit, UP Express, and ION stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/canada/toronto-waterloo',
  },
})

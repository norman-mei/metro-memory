import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('dc', {
  icons: {
    icon: '/api/city-icon/dc',
    apple: '/api/city-icon/dc',
  },
  title: 'Washington DC Metro Memory Game',
  description: 'How many of the DC metro stations can you name from memory?',
  openGraph: {
    title: 'Washington DC Metro Memory Game',
    description: 'How many of the DC metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/dc',
  },
})

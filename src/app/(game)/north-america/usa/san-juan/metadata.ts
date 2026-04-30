import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('san-juan', {
  icons: {
    icon: '/api/city-icon/san-juan',
    apple: '/api/city-icon/san-juan',
  },
  title: 'San Juan Metro Memory',
  description: 'How many Tren Urbano stations in San Juan can you name from memory?',
  openGraph: {
    title: 'San Juan Metro Memory',
    description: 'How many Tren Urbano stations in San Juan can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/north-america/usa/san-juan',
  },
})

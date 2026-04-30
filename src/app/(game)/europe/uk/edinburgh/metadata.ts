import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('edinburgh', {
  icons: {
    icon: '/api/city-icon/edinburgh',
    apple: '/api/city-icon/edinburgh',
  },
  title: 'Edinburgh Tram Memory Game',
  description: 'How many stops along the Edinburgh Tram can you remember?',
  openGraph: {
    title: 'Edinburgh Tram Memory Game',
    description: 'How many stops along the Edinburgh Tram can you remember?',
    type: 'website',
    locale: 'en_GB',
    url: 'https://metro-memory.xyz/europe/uk/edinburgh',
  },
})

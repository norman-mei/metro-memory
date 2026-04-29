import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('milwaukee', {
  icons: {
    icon: '/api/city-icon/milwaukee',
    apple: '/api/city-icon/milwaukee',
  },
  title: 'Milwaukee Metro Memory',
  description: 'How many of The Hop streetcar stops can you name from memory?',
  openGraph: {
    title: 'Milwaukee Metro Memory',
    description: 'How many of The Hop streetcar stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/north-america/usa/milwaukee',
  },
})

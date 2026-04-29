import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('luoyang', {
  icons: {
    icon: '/api/city-icon/luoyang',
    apple: '/api/city-icon/luoyang',
  },
  title: 'Luoyang Subway Memory Game',
  description: 'How many of the Luoyang Subway stations can you name from memory?',
  openGraph: {
    title: 'Luoyang Subway Memory Game',
    description: 'How many of the Luoyang Subway stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/luoyang',
  },
})

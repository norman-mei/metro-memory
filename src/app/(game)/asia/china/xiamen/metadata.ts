import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('xiamen', {
  icons: {
    icon: '/api/city-icon/xiamen',
    apple: '/api/city-icon/xiamen',
  },
  title: 'Xiamen Metro Memory Game',
  description: 'How many Xiamen Metro stations can you name from memory?',
  openGraph: {
    title: 'Xiamen Metro Memory Game',
    description: 'How many Xiamen Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/xiamen',
  },
})

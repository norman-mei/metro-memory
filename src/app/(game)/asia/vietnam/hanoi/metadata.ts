import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('hanoi', {
  icons: {
    icon: '/api/city-icon/hanoi',
    apple: '/api/city-icon/hanoi',
  },
  title: 'Hanoi Metro Memory',
  description: 'How many Hanoi Metro stops can you name from memory?',
  openGraph: {
    title: 'Hanoi Metro Memory',
    description: 'How many Hanoi Metro stops can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/vietnam/hanoi',
  },
})

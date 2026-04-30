import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('lijiang', {
  icons: {
    icon: '/api/city-icon/lijiang',
    apple: '/api/city-icon/lijiang',
  },
  title: 'Lijiang Rail Transit Memory Game',
  description: 'How many Lijiang Rail Transit Line 1 stations can you name from memory?',
  openGraph: {
    title: 'Lijiang Rail Transit Memory Game',
    description: 'How many Lijiang Rail Transit Line 1 stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/lijiang',
  },
})

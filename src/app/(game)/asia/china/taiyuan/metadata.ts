import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('taiyuan', {
  icons: {
    icon: '/api/city-icon/taiyuan',
    apple: '/api/city-icon/taiyuan',
  },
  title: 'Taiyuan Metro Memory Game',
  description: 'How many of the Taiyuan Metro stations can you name from memory?',
  openGraph: {
    title: 'Taiyuan Metro Memory Game',
    description: 'How many of the Taiyuan Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/taiyuan',
  },
})

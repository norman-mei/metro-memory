import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('taichung', {
  icons: {
    icon: '/api/city-icon/taichung',
    apple: '/api/city-icon/taichung',
  },
  title: 'Taichung Metro Memory',
  description: 'How many of the Taichung MRT stations can you name from memory?',
  openGraph: {
    title: 'Taichung Metro Memory',
    description: 'How many of the Taichung MRT stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/taiwan/taichung',
  },
})

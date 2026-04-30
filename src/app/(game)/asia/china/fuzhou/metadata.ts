import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('fuzhou', {
  icons: {
    icon: '/api/city-icon/fuzhou',
    apple: '/api/city-icon/fuzhou',
  },
  title: 'Fuzhou Metro Memory Game',
  description: 'How many Fuzhou Metro stations can you name from memory?',
  openGraph: {
    title: 'Fuzhou Metro Memory Game',
    description: 'How many Fuzhou Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/fuzhou',
  },
})

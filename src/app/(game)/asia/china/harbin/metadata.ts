import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('harbin', {
  icons: {
    icon: '/api/city-icon/harbin',
    apple: '/api/city-icon/harbin',
  },
  title: 'Harbin Metro Memory Game',
  description: 'How many of the Harbin Metro stations can you name from memory?',
  openGraph: {
    title: 'Harbin Metro Memory Game',
    description: 'How many of the Harbin Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.xyz/asia/china/harbin',
  },
})

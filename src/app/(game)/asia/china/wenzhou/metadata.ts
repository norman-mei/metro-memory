import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('wenzhou', {
  icons: {
    icon: '/api/city-icon/wenzhou',
    apple: '/api/city-icon/wenzhou',
  },
  title: 'Wenzhou Rail Transit Metro Memory Game',
  description: 'How many of the Wenzhou Rail Transit stations can you name from memory?',
  openGraph: {
    title: 'Wenzhou Rail Transit Metro Memory Game',
    description:
      'How many of the Wenzhou Rail Transit stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/wenzhou',
  },
})

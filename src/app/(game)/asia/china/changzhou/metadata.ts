import type { Metadata } from 'next'
import { withCityAssetMetadata } from '@/lib/cityAssets'

export const metadata: Metadata = withCityAssetMetadata('changzhou', {
  icons: {
    icon: '/api/city-icon/changzhou',
    apple: '/api/city-icon/changzhou',
  },
  title: 'Changzhou Metro Memory Game',
  description: 'How many of the Changzhou Metro stations can you name from memory?',
  openGraph: {
    title: 'Changzhou Metro Memory Game',
    description: 'How many of the Changzhou Metro stations can you name from memory?',
    type: 'website',
    locale: 'en_US',
    url: 'https://metro-memory.com/asia/china/changzhou',
  },
})
